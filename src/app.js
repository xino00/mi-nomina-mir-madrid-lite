import {calculate,validate,addMonth,gradeOn,rateFor,monthDays} from './engine.js';
import {defaultState,loadState,saveState,clearState} from './state.js';
import {SOURCES,MODES} from './rules.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const number=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:3}).format(n);
const monthLabel=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)?new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-15T12:00:00Z')):'Mes pendiente';
const parsed=loadState();let state=parsed.state;
let storageError=parsed.error;
const overrideLabels={tax:'IRPF (%)',ss:'Cotizaciones totales (€)',salary:'Sueldo mensual (€)',training:'Complemento formativo mensual (€)',extra:'Paga extra (€)',prorata:'Prorrata mensual de extras para cotización (€)',labour:'Tarifa presencial laborable (€/h)',holiday:'Tarifa presencial sábado, domingo o festivo (€/h)'};
const forecastLabels={labour:'Horas laborables al año',holiday:'Horas sábados, domingos y festivos al año',locatedLabour:'Horas localizadas laborables al año',locatedHoliday:'Horas localizadas sábados, domingos y festivos al año',specialGross:'Importe anual de guardias especiales (€)',otherGross:'Otros ingresos anuales sujetos (€)'};
function numericInput(id,label,nullable=false,max=1000000){return `<div class="${nullable?'override-field':'number-field'}"><label for="${id}">${esc(label)}</label><input id="${id}" type="number" min="0" max="${max}" step="0.01" inputmode="decimal" ${nullable?'placeholder="Automático"':''}>${nullable?`<span class="override-meta"><span id="${id}-status" class="tag">Automático</span><button type="button" data-reset="${id}">Volver a automático</button></span>`:''}</div>`;}
$('grade-dates').innerHTML=Array.from({length:5},(_,i)=>`<label>Inicio de R${i+1}<input id="grade-${i}" type="date" ${i===0?'required':''}></label>`).join('');
$('forecast-fields').innerHTML=Object.entries(forecastLabels).map(([key,label])=>numericInput('forecast-'+key,label)).join('');
$('forecast-overrides').innerHTML=numericInput('forecast-grossOverride','Bruto anual total previsto (€)',true)+numericInput('forecast-ssOverride','Cotizaciones anuales previstas (€)',true);
$('overrides').innerHTML=Object.entries(overrideLabels).map(([key,label])=>numericInput('override-'+key,label,true,key==='tax'?100:1000000)).join('');
$('sources').innerHTML=Object.entries(SOURCES).map(([key,s])=>`<div class="source"><div><a href="${s.url}" target="_blank" rel="noreferrer">${esc(s.title)}</a><p>${esc(s.location)}</p></div><div><span class="tag">Publicada</span><p>Efectos: ${esc(s.from)}</p></div></div>`).join('');
const bindings=new Map();
function bind(id,get,set,kind='number'){
  bindings.set(id,{get,set,kind});
  $(id).addEventListener(kind==='checkbox'||kind==='string'?'change':'input',()=>{
    const element=$(id),value=kind==='checkbox'?element.checked:kind==='string'?element.value:kind==='nullable'&&element.value===''?null:element.value===''?NaN:Number(element.value);
    set(value);refresh();
  });
}
for(let i=0;i<5;i++)bind('grade-'+i,()=>state.profile.gradeDates[i],v=>state.profile.gradeDates[i]=v,'string');
bind('end-date',()=>state.profile.endDate,v=>state.profile.endDate=v,'string');
bind('month',()=>state.month,v=>{state.month=v;},'string');
bind('delay',()=>state.delay,v=>state.delay=v);
bind('situation',()=>state.profile.situation,v=>state.profile.situation=v,'string');
bind('unemployment',()=>state.profile.unemploymentRate,v=>state.profile.unemploymentRate=v);
bind('supported',()=>state.profile.supported,v=>state.profile.supported=v,'checkbox');
for(const key of ['labour','holiday'])bind('hours-'+key,()=>state.hours[key],v=>state.hours[key]=v);
for(const key of Object.keys(forecastLabels))bind('forecast-'+key,()=>state.profile.forecast[key],v=>state.profile.forecast[key]=v);
for(const key of ['grossOverride','ssOverride'])bind('forecast-'+key,()=>state.profile.forecast[key],v=>state.profile.forecast[key]=v,'nullable');
for(const key of Object.keys(overrideLabels))bind('override-'+key,()=>state.overrides[key],v=>state.overrides[key]=v,'nullable');
bind('accumulated-enabled',()=>state.profile.accumulated.enabled,v=>state.profile.accumulated.enabled=v,'checkbox');
bind('accumulated-year',()=>state.profile.accumulated.year,v=>state.profile.accumulated.year=v);
bind('accumulated-gross',()=>state.profile.accumulated.gross,v=>state.profile.accumulated.gross=v);
bind('accumulated-withheld',()=>state.profile.accumulated.withheld,v=>state.profile.accumulated.withheld=v);
bind('vacation-enabled',()=>state.vacation.enabled,v=>state.vacation.enabled=v,'checkbox');
bind('vacation-average',()=>state.vacation.average,v=>state.vacation.average=v);
bind('vacation-fraction',()=>state.vacation.fraction,v=>state.vacation.fraction=v);
bind('other-gross',()=>state.otherGross,v=>state.otherGross=v);
bind('other-deductions',()=>state.otherDeductions,v=>state.otherDeductions=v);
function fill(){
  for(const [id,b]of bindings){if(b.kind==='checkbox')$(id).checked=b.get();else $(id).value=b.get()??'';}
  const grade=gradeOn(state.month+'-01',state.profile)||1;
  $('anchor-grade').value=grade;$('anchor-date').value=state.profile.gradeDates[grade-1];
  $('profile-panel').open=!state.configured;renderRows();
}
function renderRows(){
  $('rows').innerHTML=state.rows.map((row,i)=>`<div class="row"><div class="row-head"><strong>Tramo ${i+1}</strong><button type="button" class="text-button" data-remove="${i}" aria-label="Eliminar tramo ${i+1}">Eliminar</button></div><div class="field-grid"><label>Modalidad<select data-row="${i}" data-key="mode">${Object.entries(MODES).map(([key,label])=>`<option value="${key}" ${row.mode===key?'selected':''}>${esc(label)}</option>`).join('')}</select></label><label>Fecha trabajada<input data-row="${i}" data-key="date" type="date" value="${esc(row.date)}" required></label><label>Horas<input data-row="${i}" data-key="hours" type="number" min="0" max="744" step="0.01" value="${esc(row.hours)}"></label><label>Tarifa final (€/h)<input data-row="${i}" data-key="rate" type="number" min="0" max="1000000" step="0.01" value="${row.rate===null?'':esc(row.rate)}" placeholder="Automático salvo especiales"><span class="override-meta"><span class="tag" id="row-status-${i}"></span><button type="button" data-reset-row="${i}">Volver a automático</button></span></label></div><p id="row-result-${i}" class="row-result"></p></div>`).join('');
}
$('rows').addEventListener('input',event=>{
  const e=event.target;if(!e.hasAttribute('data-row'))return;
  const row=state.rows[Number(e.dataset.row)],key=e.dataset.key;
  row[key]=['date','mode'].includes(key)?e.value:key==='rate'&&e.value===''?null:e.value===''?NaN:Number(e.value);refresh();
});
$('rows').addEventListener('click',event=>{
  const e=event.target;
  if(e.hasAttribute('data-remove')){state.rows.splice(Number(e.dataset.remove),1);renderRows();refresh();}
  if(e.hasAttribute('data-reset-row')){state.rows[Number(e.dataset.resetRow)].rate=null;renderRows();refresh();}
});
$('add-row').addEventListener('click',()=>{
  if(state.rows.length>=100)return;
  if(!/^202[67]-(0[1-9]|1[0-2])$/.test(state.month))return;
  state.rows.push({date:addMonth(state.month,-state.delay)+'-01',mode:'locatedLabour',hours:0,rate:null});renderRows();refresh();
  $('rows').lastElementChild.querySelector('select').focus();
});
document.addEventListener('click',event=>{
  const id=event.target.dataset.reset;if(!id)return;
  bindings.get(id).set(null);$(id).value='';refresh();
});
$('suggest-dates').addEventListener('click',()=>{
  const date=$('anchor-date').value,grade=Number($('anchor-grade').value);
  if(!date||!$('anchor-date').reportValidity())return;
  const y=Number(date.slice(0,4));
  state.profile.gradeDates=Array.from({length:5},(_,i)=>{
    const targetYear=y+i-grade+1,month=date.slice(5,7),day=Math.min(Number(date.slice(8)),monthDays(`${targetYear}-${month}`));
    return `${targetYear}-${month}-${String(day).padStart(2,'0')}`;
  });
  for(let i=0;i<5;i++)$('grade-'+i).value=state.profile.gradeDates[i];refresh();
});
for(const id of ['anchor-grade','anchor-date'])$(id).addEventListener('change',()=>$('suggest-dates').click());
$('save-profile').addEventListener('click',()=>{
  const errors=validate(state);if(errors.length){renderErrors(errors);return;}
  state.configured=true;$('profile-panel').open=false;refresh();$('month').focus();
});
$('erase').addEventListener('click',()=>{
  if(!confirm('¿Borrar la configuración y el escenario guardados por esta versión Lite en este navegador?'))return;
  try{state=clearState();storageError=false;}catch{state=defaultState();storageError=true;}
  fill();refresh(false);$('profile-panel').open=true;$('anchor-grade').focus();
  $('storage-status').textContent=storageError?'No se pudo borrar el almacenamiento del navegador.':'Datos de Lite borrados. Puedes empezar de nuevo.';
});
$('reset-month').addEventListener('click',()=>{
  state.overrides=defaultState().overrides;state.rows.forEach(row=>row.rate=null);state.vacation=defaultState().vacation;state.otherGross=0;state.otherDeductions=0;
  fill();$('advanced').open=true;refresh();
});
function renderErrors(errors){$('errors').className=errors.length?'errors':'';$('errors').innerHTML=errors.map(e=>`<p>${esc(e)}</p>`).join('');}
function line(label,value,origin='',total=false){return `<div class="line ${total?'total':''}"><dt>${esc(label)}${origin?`<small>${esc(origin)}</small>`:''}</dt><dd>${money(value)}</dd></div>`;}
function status(id,manual){$(id).textContent=manual?'Manual':'Automático';$(id).className='tag'+(manual?' manual':'');}
function refresh(persist=true){
  let result;
  try{result=calculate(state);}catch{result={errors:['Revisa los datos introducidos. No se ha calculado un resultado con datos inválidos.']};}
  if(persist&&validate(state).length===0){const saved=saveState(state);$('storage-status').textContent=saved?'Guardado solo en este navegador. Sin historial anual.':'No se pudo guardar. El cálculo funciona, pero perderás los datos al cerrar.';}
  if(storageError)$('storage-status').textContent='No se pudo recuperar la configuración anterior. Revisa los datos antes de guardar; no se ha enviado nada.';
  $('profile-summary').textContent=state.configured?`R${gradeOn(state.month+'-01',state.profile)||'—'} · editar perfil`:'Empieza aquí';
  $('accumulated-fields').hidden=!state.profile.accumulated.enabled;
  $('vacation-average').disabled=!state.vacation.enabled;$('vacation-fraction').disabled=!state.vacation.enabled;
  for(const key of Object.keys(overrideLabels))status('override-'+key+'-status',state.overrides[key]!==null);
  for(const key of ['grossOverride','ssOverride'])status('forecast-'+key+'-status',state.profile.forecast[key]!==null);
  const date=/^202[67]-(0[1-9]|1[0-2])$/.test(state.month)?addMonth(state.month,-state.delay)+'-01':null;
  $('worked-month').textContent=date?monthLabel(date.slice(0,7)):'—';
  for(const mode of ['labour','holiday']){
    const r=date?rateFor(date,gradeOn(date,state.profile),mode,state.overrides[mode]):null;
    $('rate-'+mode).textContent=r?.rate!==null&&r?.rate!==undefined?`${number(r.rate)} €/h · R${gradeOn(date,state.profile)} · ${r.status}`:'Tarifa pendiente';
  }
  state.rows.forEach((row,i)=>{
    const r=rateFor(row.date,gradeOn(row.date,state.profile),row.mode,row.rate);
    status('row-status-'+i,row.rate!==null);
    $('row-result-'+i).textContent=r.rate===null?r.reason:`${number(r.rate)} €/h × ${number(row.hours)} h · R${gradeOn(row.date,state.profile)} · ${r.status}`;
  });
  renderErrors(result.errors??[]);
  $('net').textContent=result.errors?.length?'—':money(result.net);
  $('result-month').textContent=monthLabel(state.month);
  document.querySelector('.result-note').textContent=state.month>='2027-01'?'2027: sueldo, bases de cotización e IRPF provisionales. Revisa los supuestos.':'Estimación con supuestos. Revisa su origen debajo.';
  const gStart=gradeOn(state.month+'-01',state.profile),gEnd=gradeOn(state.month+'-'+monthDays(state.month),state.profile);
  $('result-grade').textContent=gStart===gEnd?`R${gStart||'—'}`:`R${gStart||'—'} → R${gEnd}`;
  const o=state.overrides;
  if(result.gross===undefined||result.errors?.length){$('breakdown').innerHTML='<p class="hint">Completa los datos indicados para ver el desglose.</p>';$('calculation-detail').innerHTML='<p>El resultado aparecerá cuando los datos necesarios estén completos.</p>';}
  else{
    $('breakdown').innerHTML=
      line('Sueldo',result.fixed.salary,o.salary!==null?'Manual':state.month>='2027-01'?'Provisional · referencia salarial 2026':'Publicado · tabla SERMAS 2026')+
      line('Complemento formativo',result.fixed.training,o.training!==null?'Manual':state.month>='2027-01'?'Mínimo publicado 2027 × sueldo de referencia':'Publicado · tabla SERMAS 2026')+
      line('Guardias',result.guards,result.rows.some(r=>r.status==='manual')?'Incluye tarifas manuales':'Tarifa y curso según fecha trabajada')+
      (result.extra||o.extra!==null?line('Paga extra',result.extra,o.extra!==null?'Manual':'Provisional · ponderada por curso'): '')+
      (state.vacation.enabled?line('Compensación vacacional',result.vacation,'Manual · media y fracción introducidas'): '')+
      (state.otherGross?line('Otros devengos',state.otherGross,'Manual · sujetos a IRPF y cotización'): '')+
      line('Bruto',result.gross,'',true)+
      line(`IRPF · ${number(result.rate)} %`,-result.withheld,o.tax!==null?'Manual':'Estimación AEAT · comparación oficial pendiente')+
      line('Cotizaciones',-result.ss,o.ss!==null?'Manual · cuota total':'Estimadas · bases por mes de devengo')+
      (state.otherDeductions?line('Otros descuentos',-state.otherDeductions,'Manual'): '')+
      line('Neto estimado',result.net,'',true);
    const c=result.contributions;
    $('calculation-detail').innerHTML=`<h3>Previsión del año ${state.month.slice(0,4)}</h3><p>Bruto: <strong>${money(result.annual.gross)}</strong>${state.profile.forecast.grossOverride!==null?' · manual':''}<br>Cotizaciones: ${money(result.annual.ss)}${state.profile.forecast.ssOverride!==null?' · manual':''}<br>Base para retención: ${money(result.tax.base)}<br>Reducción por rendimientos: ${money(result.tax.reduction)}<br>Cuota calculada antes del tipo: ${money(result.tax.quota)}<br>Tipo estimado: ${number(result.tax.rate)} % (mínimo 15 %). El tipo se trunca a dos decimales.</p><p>Previsión orientativa: horas repartidas entre meses de actividad; sin historial. Los ajustes mensuales no se extrapolan al año.</p><h3>Cotizaciones del trabajador</h3>${o.ss!==null?'<p>Cuota total manual: el desglose automático siguiente solo sirve como referencia; no descompone tu ajuste.</p>':''}<table class="mini-table"><tbody>${[['Contingencias comunes',c.common],['Desempleo',c.unemployment],['Formación profesional',c.training],['MEI',c.mei],['Solidaridad',c.solidarity]].map(([k,v])=>`<tr><th scope="row">${k}</th><td>${money(v)}</td></tr>`).join('')}</tbody></table><p>Prorrata del mes: ${money(result.prorata)}${o.prorata!==null?' · manual':''}. La extra cobrada no se añade otra vez a la base.</p>${result.parts.map(part=>`<h3>${esc(part.kind)} · ${monthLabel(part.month)}</h3><p>Base CC ${part.kind.startsWith('Incremento')?'adicional ':''}: ${money(part.ccBase)}<br>Base desempleo/FP ${part.kind.startsWith('Incremento')?'adicional ':''}: ${money(part.atBase)}<br>Cuota: ${money(part.total)} · MEI ${number(part.parameters.meiRate)} %<br>Límite mensual: ${money(part.parameters.maximum)} · mínimo CC ${money(part.parameters.minimumCC)} · mínimo CP ${money(part.parameters.minimumAT)}.</p>`).join('')}<h3>Guardias por fecha</h3>${result.rows.length?`<ul>${result.rows.map(r=>`<li>${esc(r.date)} · R${r.grade} · ${esc(MODES[r.mode])}: ${number(r.hours)} h × ${number(r.rate)} € = ${money(r.gross)}. ${esc(r.status)}${r.from?` desde ${esc(r.from)}`:''}.</li>`).join('')}</ul>`:'<p>Sin horas de guardia en este escenario.</p>'}`;
  }
  const warnings=result.warnings??[];
  $('warnings').innerHTML=warnings.map(w=>`<li>${esc(w)}</li>`).join('');
  $('notice-count').textContent=warnings.length?`${warnings.length} aspectos a revisar`:'Alcance de la estimación';
}
fill();refresh(false);
