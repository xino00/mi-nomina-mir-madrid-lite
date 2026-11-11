import {SALARY_2026,TRAINING_2026,TRAINING_2027,GUARD_TABLES,MODES} from './rules.js';
import {contributionFor,contributionIncrement} from './contributions.js';
import {estimateTax} from './tax.js';
import {validShape} from './state.js';
import {round} from './money.js';
export {round} from './money.js';
export const monthDays=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate();
export const addMonth=(month,n)=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5))-1+n,1)).toISOString().slice(0,7);
export function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(Date.parse(date))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
export function gradeOn(date,profile){if(profile.endDate&&date>profile.endDate)return 0;let grade=0;profile.gradeDates.forEach((from,i)=>{if(from&&from<=date)grade=i+1;});return grade;}
export function fixedAt(date,grade,overrides={}){
  if(!grade)return {salary:0,training:0,total:0};
  const salary=overrides.salary??SALARY_2026;
  const training=overrides.training??(date>='2027-01-01'?round(salary*TRAINING_2027[grade-1]):TRAINING_2026[grade-1]);
  return {salary,training,total:round(salary+training)};
}
export function fixedFor(month,profile,overrides={}){
  let salary=0,training=0,activeDays=0;const days=monthDays(month);
  for(let d=1;d<=days;d++){
    const date=`${month}-${String(d).padStart(2,'0')}`, grade=gradeOn(date,profile), f=fixedAt(date,grade,overrides);
    salary+=f.salary/days;training+=f.training/days;if(grade)activeDays++;
  }
  return {salary:round(salary),training:round(training),total:round(round(salary)+round(training)),activeDays,days};
}
// Supuesto explícito: dic–may / jun–nov, ponderado por días y grados.
// Se valoran los grados a la fecha de la paga, no a su antigua tarifa histórica.
export function extraFor(month,profile,overrides={}){
  if(!['06','12'].includes(month.slice(5))||(profile.endDate&&month+'-01'>profile.endDate))return 0;
  let total=0,days=0;
  for(let k=-6;k<0;k++){
    const m=addMonth(month,k);
    for(let d=1;d<=monthDays(m);d++){
      const grade=gradeOn(`${m}-${String(d).padStart(2,'0')}`,profile);
      total+=fixedAt(month+'-01',grade,overrides).total;days++;
    }
  }
  return round(total/days);
}
// Devengo anualizado: dos mensualidades del fijo vigente /12, no solo extras
// pagadas en el año natural. Estimación editable cuando hay cambios de curso.
export function prorataFor(month,profile,overrides={}) {
  return round(fixedFor(month,profile,overrides).total*2/12);
}
export function rateFor(date,grade,mode,manual=null){
  if(manual!==null)return {rate:manual,status:'manual',source:null,from:date};
  if(!grade)return {rate:null,status:'manual',reason:'La fecha trabajada es anterior al inicio de residencia.'};
  if(mode==='special'||mode==='locatedSpecial')return {rate:null,status:'manual',reason:'Introduce la tarifa especial contrastada en €/h. No se deduce de la tarifa festiva.'};
  const table=GUARD_TABLES.filter(t=>t.from<=date).at(-1);
  if(!table||date>'2027-12-31')return {rate:null,status:'manual',reason:'Fecha fuera de las tablas 2026–2027: introduce tarifa manual.'};
  const located=mode.startsWith('located'), kind=mode.toLowerCase().includes('holiday')?'holiday':'labour';
  // Se conserva la media céntima del 50% hasta redondear el importe del concepto.
  return {rate:table[kind][grade-1]*(located?.5:1),status:table.status,source:table.source,from:table.from};
}
export function validate(state){
  const errors=[];
  if(!validShape(state))return ['La configuración está incompleta o contiene datos no válidos.'];
  if(!/^202[67]-(0[1-9]|1[0-2])$/.test(state.month))errors.push('Elige un mes entre enero de 2026 y diciembre de 2027.');
  const dates=state.profile.gradeDates;
  if(state.profile.endDate&&(!validDate(state.profile.endDate)||state.profile.endDate<dates[0]))errors.push('Revisa la fecha de fin de residencia.');
  if(dates.length!==5||!dates[0]||dates.some(d=>d&&!validDate(d)))errors.push('Revisa las fechas de inicio de cada curso.');
  let previous='';let gap=false;
  for(const date of dates){if(!date){gap=true;continue;}if(gap||date<=previous)errors.push('Los cursos deben tener fechas consecutivas y crecientes, sin huecos.');previous=date;}
  if(![0,1,2].includes(state.delay))errors.push('El retraso de pago debe ser 0, 1 o 2 meses.');
  const check=(value,label,max=1000000)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)errors.push(`Revisa ${label}: debe ser un número entre 0 y ${max}.`);};
  for(const [key,value]of Object.entries(state.hours))check(value,`horas ${key}`,744);
  for(const [key,value]of Object.entries(state.overrides))if(value!==null)check(value,`ajuste ${key}`,key==='tax'?100:1000000);
  for(const [key,value]of Object.entries(state.profile.forecast))if(value!==null)check(value,`previsión ${key}`);
  for(const [key,value]of Object.entries(state.profile.accumulated))if(['gross','withheld'].includes(key))check(value,`acumulado ${key}`);
  if(state.profile.accumulated.enabled&&state.profile.accumulated.year!==Number(state.month.slice(0,4)))errors.push('Los acumulados pertenecen a otro año. Cámbialos o desactívalos.');
  check(state.vacation.average,'media vacacional');check(state.vacation.fraction,'fracción de vacaciones',1);
  check(state.otherGross,'otros devengos');check(state.otherDeductions,'otros descuentos');
  if(![1.55,1.6].includes(state.profile.unemploymentRate))errors.push('Revisa el tipo de desempleo.');
  if(!['2','3'].includes(state.profile.situation))errors.push('Selecciona una situación fiscal admitida.');
  for(const row of state.rows){
    if(!validDate(row.date)||row.date.slice(0,7)>state.month)errors.push('Cada tramo debe tener una fecha trabajada válida, anterior o igual al mes de cobro.');
    if(!Object.hasOwn(MODES,row.mode))errors.push('Modalidad de guardia no válida.');
    check(row.hours,'horas del tramo',744);if(row.rate!==null)check(row.rate,'tarifa del tramo');
  }
  return [...new Set(errors)];
}
export function guardRows(state){
  const date=addMonth(state.month,-state.delay)+'-01';
  return ['labour','holiday'].map(mode=>({date,mode,hours:state.hours[mode],rate:state.overrides[mode],aggregate:true})).concat(state.rows).map(row=>{
    const grade=gradeOn(row.date,state.profile),rate=rateFor(row.date,grade,row.mode,row.rate);
    return {...row,grade,...rate,gross:rate.rate===null?null:round(row.hours*rate.rate)};
  }).filter(row=>row.hours>0);
}
function summedContributions(list){
  const result={common:0,unemployment:0,training:0,mei:0,solidarity:0,total:0};
  for(const part of list)for(const key of Object.keys(result))result[key]=round(result[key]+part[key]);
  return result;
}
export function monthlyRaw(state){
  const year=Number(state.month.slice(0,4)), p=state.profile, o=state.overrides;
  const fixed=fixedFor(state.month,p,o),rows=guardRows(state),warnings=[],errors=[];
  rows.forEach(r=>{if(r.gross===null)errors.push(r.reason);});
  const guards=round(rows.reduce((sum,r)=>sum+(r.gross??0),0));
  const extra=o.extra??extraFor(state.month,p,o);
  const vacation=state.vacation.enabled?round(state.vacation.average*state.vacation.fraction):0;
  const prorata=o.prorata??(fixed.activeDays?prorataFor(state.month,p,o):0);
  const grouped=new Map();for(const row of rows){const m=row.date.slice(0,7);grouped.set(m,round((grouped.get(m)??0)+(row.gross??0)));}
  const current=contributionFor({fixed:fixed.total,prorata,other:vacation+state.otherGross,guards:grouped.get(state.month)??0,year,unemploymentRate:p.unemploymentRate});
  const parts=[{...current,month:state.month,kind:'Mes actual'}];
  for(const [month,gross]of grouped){
    if(month===state.month)continue;
    if(month<'2026-01'){
      if(o.ss===null)errors.push('Guardias anteriores a 2026: introduce las cotizaciones totales manuales de esta nómina.');
      warnings.push('La cotización de las guardias anteriores a 2026 requiere datos del período original.');continue;
    }
    const previous=fixedFor(month,p);const priorProrata=prorataFor(month,p);
    parts.push({...contributionIncrement({fixed:previous.total,prorata:priorProrata,guards:gross,year:Number(month.slice(0,4)),unemploymentRate:p.unemploymentRate}),month,kind:'Incremento por guardias'});
  }
  const contributions=summedContributions(parts),ss=o.ss??contributions.total;
  const gross=round(fixed.total+guards+extra+vacation+state.otherGross);
  if(fixed.activeDays!==fixed.days){warnings.push('Mes de alta parcial o anterior al inicio: el fijo se prorratea por días. La liquidación parcial queda fuera del modo ordinario.');if(o.ss===null)errors.push('Para este mes parcial introduce cotizaciones manuales.');}
  if(rows.some(r=>r.aggregate&&p.gradeDates.some(d=>d&&d.startsWith(r.date.slice(0,7))&&d>r.date)))errors.push('Hay un cambio de curso en el mes trabajado. Pon las horas generales a cero y reparte las horas en tramos con fecha antes y después del cambio.');
  if(extra>0&&o.extra===null)warnings.push('Paga extra provisional: se ponderan los cursos de diciembre–mayo o junio–noviembre por días, a importes de la fecha de paga. Confirma el período con tu centro o ajusta el importe.');
  if(o.ss===null)warnings.push('Cotización estimada: prorrata provisional = dos mensualidades del fijo vigente / 12 (devengo anualizado). Los incrementos de guardias se imputan a su mes trabajado; otros devengos previos pueden cambiar sus topes.');
  if(p.unemploymentRate===1.6&&o.ss===null)warnings.push('Desempleo: supuesto de contrato temporal general (1,60 %). Confirma el tipo aplicado por tu centro; puedes elegir 1,55 % o introducir la cuota total.');
  if(year===2027)warnings.push('Provisional 2027: sueldo base, bases y topes de cotización y algoritmo IRPF mantienen la referencia 2026. MEI y mínimos formativos sí cambian; las tarifas de guardia de 2027 ya están publicadas.');
  if(state.month>='2027-09')warnings.push('Desde septiembre de 2027 cambia la normativa de jornada. Estas horas mensuales no certifican descansos ni límites por guardia y no se recortan automáticamente.');
  return {fixed,rows,guards,extra,vacation,prorata,parts,contributions,ss,gross,warnings,errors};
}
// Previsión de cobros del año: no se almacena historial de nóminas. Las horas
// anuales se distribuyen uniformemente entre los meses con residencia activa.
export function annualForecast(state){
  const year=Number(state.month.slice(0,4)),p=state.profile,f=p.forecast;
  const active=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`).filter(m=>Array.from({length:monthDays(m)},(_,d)=>gradeOn(`${m}-${String(d+1).padStart(2,'0')}`,p)).some(Boolean));
  let gross=0,ss=0;
  for(let i=1;i<=12;i++){
    const month=`${year}-${String(i).padStart(2,'0')}`,fixed=fixedFor(month,p),worked=addMonth(month,-state.delay);
    const rows=[];
    // En enero de 2026 no se inventan tarifas 2025: entradas de diciembre se
    // incorporan con el campo otros ingresos o la previsión manual anual.
    const activeDays=Array.from({length:monthDays(worked)},(_,d)=>gradeOn(`${worked}-${String(d+1).padStart(2,'0')}`,p)).filter(Boolean).length;
    if(worked>='2026-01'&&activeDays){
      for(const mode of ['labour','holiday','locatedLabour','locatedHoliday']){
        const hours=f[mode]/Math.max(active.length,1);
        // Reparto uniforme por días para respetar promociones dentro del mes.
        for(let day=1;day<=monthDays(worked);day++){
          const date=`${worked}-${String(day).padStart(2,'0')}`,grade=gradeOn(date,p);
          if(grade)rows.push({date,mode,hours:hours/activeDays,rate:null});
        }
      }
    }
    let guards=0;for(const row of rows){const rate=rateFor(row.date,gradeOn(row.date,p),row.mode);guards+=row.hours*(rate.rate??0);}guards=round(guards);
    // Importes anuales cobrados: repartir solo en meses con actividad evita
    // dejar parte del bruto fuera de las bases en años de alta o finalización.
    const other=active.includes(month)?(f.specialGross+f.otherGross)/Math.max(active.length,1):0;
    const extra=extraFor(month,p);
    gross+=fixed.total+extra+guards+other;
    if(fixed.activeDays){
      const cur=contributionFor({fixed:fixed.total,prorata:prorataFor(month,p),other,guards:state.delay===0?guards:0,year,unemploymentRate:p.unemploymentRate});ss+=cur.total;
    }
    if(state.delay>0&&guards){const prior=fixedFor(worked,p);ss+=contributionIncrement({fixed:prior.total,prorata:prorataFor(worked,p),other:prior.activeDays?(f.specialGross+f.otherGross)/Math.max(active.length,1):0,guards,year:Number(worked.slice(0,4)),unemploymentRate:p.unemploymentRate}).total;}
  }
  if(!active.length)gross+=f.specialGross+f.otherGross;
  return {activeMonths:active.length,gross:f.grossOverride??round(gross),ss:f.ssOverride??round(ss),automaticGross:round(gross),automaticSS:round(ss)};
}
export function calculate(state){
  const errors=validate(state);if(errors.length)return {errors};
  if(!state.configured)return {errors:['Completa y guarda tu configuración para calcular.']};
  const raw=monthlyRaw(state),annual=annualForecast(state),warnings=[...raw.warnings];errors.push(...raw.errors);
  if(state.overrides.tax===null&&!state.profile.supported)errors.push('Tu situación fiscal no está cubierta. Introduce un porcentaje de IRPF manual.');
  if(state.overrides.tax===null&&annual.gross<raw.gross+(state.profile.accumulated.enabled?state.profile.accumulated.gross:0))errors.push('La previsión anual debe cubrir esta nómina y el bruto ya acumulado. Corrige la previsión o introduce un IRPF manual.');
  if(annual.ss>annual.gross)errors.push('Las cotizaciones anuales no pueden superar el bruto anual.');
  if(annual.activeMonths===0&&(state.profile.forecast.specialGross+state.profile.forecast.otherGross)>0&&state.profile.forecast.ssOverride===null&&state.overrides.tax===null)errors.push('Sin meses activos, introduce las cotizaciones anuales manuales de los ingresos previstos.');
  const accum=state.profile.accumulated;
  if(accum.enabled&&(accum.gross>=annual.gross||accum.withheld>accum.gross))errors.push('Revisa los acumulados: debe quedar bruto pendiente y las retenciones no pueden superar lo cobrado.');
  const tax=estimateTax({gross:annual.gross,contributions:annual.ss,situation:state.profile.situation,minimumRate:15,accumulatedGross:accum.gross,accumulatedWithheld:accum.withheld,regularize:accum.enabled});
  const rate=state.overrides.tax??tax.rate,withheld=round(raw.gross*rate/100),net=round(raw.gross-raw.ss-withheld-state.otherDeductions);
  if(accum.enabled&&state.overrides.tax===null)warnings.push('IRPF con acumulados: estimación del porcentaje restante. No reproduce todas las causas y límites de una regularización legal de la AEAT.');
  if(state.overrides.tax===null)warnings.push('IRPF: algoritmo AEAT para el supuesto admitido, con mínimo del 15 % por relación laboral especial. La comparación interactiva con AEAT está pendiente. Es retención, no declaración de la renta.');
  if(Number(state.month.slice(0,4))===2026&&state.delay>0)warnings.push('Previsión fiscal 2026: incorpora los cobros de guardias de 2025 en «Otros ingresos anuales», o ajusta el bruto y cotizaciones anuales. No se inventan tarifas anteriores.');
  if(state.otherGross||state.vacation.enabled||state.overrides.salary!==null||state.overrides.training!==null||state.overrides.extra!==null||state.rows.some(r=>r.rate!==null)||state.overrides.labour!==null||state.overrides.holiday!==null)warnings.push('Los ajustes de este mes no modifican por sí solos la previsión fiscal anual. Actualiza la previsión si cambian tus ingresos esperados.');
  if(annual.gross<raw.gross)warnings.push('El bruto de este mes supera la previsión anual: revisa tu previsión fiscal.');
  return {...raw,annual,tax,rate,withheld,net,otherDeductions:state.otherDeductions,warnings:[...new Set(warnings)],errors:[...new Set(errors)]};
}
