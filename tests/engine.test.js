import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,loadState,saveState,clearState,STORAGE_KEY} from '../src/state.js';
import {calculate,monthlyRaw,annualForecast,rateFor,extraFor,prorataFor,validDate,gradeOn} from '../src/engine.js';
import {round} from '../src/money.js';
import {estimateTax} from '../src/tax.js';
function scenario(grade=2){const s=defaultState();s.configured=true;s.profile.gradeDates=Array.from({length:5},(_,i)=>`${2027-grade+i}-06-01`);s.profile.forecast.labour=612;s.profile.forecast.holiday=288;return s;}
for(let g=1;g<=5;g++)test(`R${g}: fijo oficial 2026, sin guardias`,()=>{
  const s=scenario(g),r=calculate(s);
  assert.deepEqual(r.errors,[]);assert.equal(r.fixed.salary,1387.24);assert.equal(r.fixed.training,[138.31,249.29,388.01,526.74,665.46][g-1]);assert.equal(r.guards,0);assert.equal(r.net,Math.round((r.gross-r.ss-r.withheld)*100)/100);
});
test('Tablas completas, todos los cursos y vigencias',()=>{
  const fixtures=[['2026-06-30',[12.5,15,17.49,19.99,19.99],[14.87,17.36,19.85,22.33,22.33]],['2026-07-01',[13.13,15.75,18.36,20.99,20.99],[15.61,18.23,20.84,23.45,23.45]],['2027-01-01',[13.78,16.54,19.28,22.04,22.04],[16.39,19.14,21.88,24.62,24.62]]];
  for(const [date,labour,holiday]of fixtures)for(let g=1;g<=5;g++){
    assert.equal(rateFor(date,g,'labour').rate,labour[g-1]);assert.equal(rateFor(date,g,'holiday').rate,holiday[g-1]);assert.equal(rateFor(date,g,'locatedLabour').rate,labour[g-1]/2);assert.equal(rateFor(date,g,'locatedHoliday').rate,holiday[g-1]/2);
  }
});
test('Julio cobra junio antiguo; agosto cobra julio nuevo',()=>{
  const s=scenario();s.month='2026-07';s.hours.labour=17;assert.equal(calculate(s).guards,255);
  s.month='2026-08';assert.equal(calculate(s).guards,267.75);
});
test('Diciembre cobrado enero: tarifa, curso y MEI por fecha de devengo',()=>{
  const s=scenario();s.month='2027-01';s.hours.labour=17;
  const r=calculate(s);assert.deepEqual(r.errors,[]);assert.equal(r.guards,267.75);assert.equal(r.fixed.training,388.43);
  assert.equal(r.parts[0].parameters.meiRate,.17);assert.equal(r.parts[1].parameters.meiRate,.15);assert.equal(r.rows[0].grade,2);assert.equal(r.rows[0].rate,15.75);
  s.month='2027-02';assert.equal(calculate(s).guards,281.18);
});
for(let g=1;g<=5;g++)test(`2027 R${g}: sustituye complemento y no incrementa guardias duplicadas`,()=>{
  const s=scenario(g);s.month='2027-01';s.delay=0;s.hours.labour=10;
  const r=calculate(s);assert.equal(r.fixed.training,Math.round(1387.24*[.18,.28,.38,.48,.58][g-1]*100)/100);assert.equal(r.guards,[137.8,165.4,192.8,220.4,220.4][g-1]);
});
test('Septiembre 2027 informa de jornada sin recortar horas',()=>{
  const s=scenario();s.month='2027-08';s.hours.labour=120;const a=calculate(s);
  s.month='2027-09';const b=calculate(s);assert.equal(a.guards,b.guards);assert.ok(b.warnings.some(w=>w.includes('no se recortan')));
});
test('Localizadas mantienen media céntima hasta importe; decimales',()=>{
  const s=scenario();s.rows=[{date:'2026-10-12',mode:'locatedLabour',hours:3.5,rate:null}];const r=calculate(s);
  assert.equal(r.guards,27.56);assert.equal(r.rows[0].rate,7.875);
});
for(const mode of ['special','locatedSpecial'])test(`${mode}: exige manual, cero manual válido y vuelta automática`,()=>{
  const s=scenario();s.rows=[{date:'2026-10-12',mode,hours:24,rate:null}];assert.ok(calculate(s).errors.length);
  s.rows[0].rate=40;assert.equal(calculate(s).guards,960);s.rows[0].rate=0;assert.equal(calculate(s).guards,0);assert.equal(calculate(s).rows[0].status,'manual');
  s.rows[0].rate=null;assert.ok(calculate(s).errors.length);
});
test('Cambio a mitad del mes obliga repartir tramos fechados',()=>{
  const s=scenario();s.profile.gradeDates[1]='2026-06-15';s.month='2026-07';s.hours.labour=20;assert.ok(calculate(s).errors.some(e=>e.includes('cambio de curso')));
  s.hours.labour=0;s.rows=[{date:'2026-06-10',mode:'labour',hours:10,rate:null},{date:'2026-06-20',mode:'labour',hours:10,rate:null}];
  const r=calculate(s);assert.deepEqual(r.errors,[]);assert.equal(r.guards,275);
});
test('Guardias de un mes se agrupan para un solo tope',()=>{
  const s=scenario();s.rows=[{date:'2026-10-10',mode:'labour',hours:100,rate:30},{date:'2026-10-20',mode:'holiday',hours:100,rate:30}];const a=calculate(s);
  s.rows=[{date:'2026-10-10',mode:'labour',hours:200,rate:30}];const b=calculate(s);assert.equal(a.ss,b.ss);assert.equal(a.parts.length,2);
});
test('Extra no duplica SS; prorrata anualiza el devengo del fijo vigente',()=>{
  const s=scenario();s.month='2026-06';const a=calculate(s);
  assert.equal(a.prorata,prorataFor('2026-06',s.profile));assert.equal(a.prorata,round(a.fixed.total*2/12));
  s.overrides.extra=9999;const b=monthlyRaw(s);assert.equal(a.ss,b.ss);assert.equal(b.extra,9999);
});
test('Extra junio2027 aplica nueva formación a todos los grados ponderados',()=>{
  const s=scenario();s.profile.gradeDates[2]='2027-07-01';assert.equal(extraFor('2027-06',s.profile),1775.67);
});
test('Ajustes manuales todos reversibles, cero conservado',()=>{
  const s=scenario(),before=calculate(s);s.overrides.tax=0;s.overrides.ss=0;s.overrides.salary=1000;s.overrides.training=0;s.overrides.extra=0;s.overrides.prorata=0;
  s.otherGross=250;s.otherDeductions=30;const r=calculate(s);assert.deepEqual(r.errors,[]);assert.equal(r.net,1220);assert.equal(r.ss,0);assert.equal(r.rate,0);
  s.overrides=defaultState().overrides;s.otherGross=0;s.otherDeductions=0;assert.equal(calculate(s).net,before.net);
});
test('Vacaciones usa media y fracción explícita, sin divisor22',()=>{
  const s=scenario();s.vacation={enabled:true,average:1200,fraction:.5};assert.equal(calculate(s).vacation,600);
});
test('Situación no cubierta requiere porcentaje manual',()=>{
  const s=scenario();s.profile.supported=false;assert.ok(calculate(s).errors.some(e=>e.includes('no está cubierta')));s.overrides.tax=20;assert.deepEqual(calculate(s).errors,[]);
});
test('Anual insuficiente bloquea IRPF automático y acumulados de otro año también',()=>{
  const s=scenario();s.profile.forecast.grossOverride=0;s.profile.forecast.ssOverride=0;assert.ok(calculate(s).errors.some(e=>e.includes('previsión anual')));
  s.overrides.tax=20;assert.deepEqual(calculate(s).errors,[]);s.profile.accumulated.enabled=true;s.profile.accumulated.year=2027;assert.ok(calculate(s).errors.some(e=>e.includes('otro año')));
});
test('R1 alta parcial conserva íntegramente las horas previstas, sin pago diferido',()=>{
  const s=defaultState();s.configured=true;s.delay=0;s.profile.gradeDates=['2026-06-30','','','',''];s.profile.forecast.labour=700;
  const withGuards=annualForecast(s).gross;s.profile.forecast.labour=0;const withoutGuards=annualForecast(s).gross;
  // Junio 100h ×12,50; julio–diciembre 600h ×13,13.
  assert.ok(Math.abs((withGuards-withoutGuards)-9128)<.02);
});
test('Fecha fin acota sueldo/previsión; no liquida finiquito',()=>{
  const s=scenario(5);s.month='2027-05';const all=annualForecast(s);s.profile.endDate='2027-06-30';
  assert.equal(gradeOn('2027-07-01',s.profile),0);assert.ok(annualForecast(s).gross<all.gross);assert.equal(extraFor('2027-12',s.profile),0);
});
test('RED20 usa half-up exacto al medio céntimo',()=>{
  assert.equal(estimateTax({gross:14852.02,contributions:0,minimumRate:0}).reduction,7301.97);
});
test('Fechas reales, números finitos y negativos',()=>{
  assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-02-28'),true);
  const s=scenario();s.hours.labour=NaN;assert.ok(calculate(s).errors.length);s.hours.labour=-1;assert.ok(calculate(s).errors.length);
});
function storageMock(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('Persistencia, recuperación, borrado limitado a Lite',()=>{
  const storage=storageMock(),s=scenario();storage.setItem('otra-app','intacta');assert.equal(saveState(s,storage),true);assert.deepEqual(loadState(storage).state,s);clearState(storage);assert.equal(storage.getItem(STORAGE_KEY),null);assert.equal(storage.getItem('otra-app'),'intacta');
});
test('Almacenamiento corrupto o incompleto no elude controles',()=>{
  const storage=storageMock(),s=scenario();s.overrides={};s.profile.supported=false;storage.setItem(STORAGE_KEY,JSON.stringify(s));assert.equal(loadState(storage).error,true);assert.ok(calculate(s).errors.length);
  storage.setItem(STORAGE_KEY,'{broken');assert.equal(loadState(storage).error,true);
});
test('Fallo de almacenamiento no interrumpe el cálculo',()=>{
  assert.equal(saveState(scenario(),{setItem(){throw Error('denied');}}),false);
});

test('Half-up robusto de retención mensual, también en 150.015',()=>{
  assert.equal(round(1000.10*.15),150.02);assert.equal(round(1.005),1.01);assert.equal(round(-1.005),-1.01);
  const s=scenario();s.overrides.salary=1000.10;s.overrides.training=0;s.overrides.tax=15;assert.equal(calculate(s).withheld,150.02);
});
test('Año incompleto anualiza devengo: no divide extras cobradas entre meses sin cotización',()=>{
  const s=scenario(3);s.profile.endDate='2026-06-30';s.month='2026-05';
  const r=calculate(s);assert.equal(r.prorata,round(r.fixed.total/6));
});
test('Especiales anuales en seis meses cotizan todo el importe dentro del patrón activo',()=>{
  const s=scenario(3);s.profile.endDate='2026-06-30';s.profile.forecast.labour=0;s.profile.forecast.holiday=0;
  const a=annualForecast(s);s.profile.forecast.specialGross=1200;const b=annualForecast(s);
  assert.equal(b.gross-a.gross,1200);assert.equal(round(b.ss-a.ss),59.20);
});
test('Getter localStorage bloqueado permite iniciar y calcular sin persistencia',()=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError');}});
  try{assert.equal(loadState().error,true);assert.equal(saveState(scenario()),false);}finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
});

test('Previsión diferida conserva otros devengos en la base previa y no duplica margen de tope',()=>{
  const s=scenario(5);s.profile.gradeDates=['2020-01-01','2021-01-01','2022-01-01','2023-01-01','2024-01-01'];
  s.profile.forecast.labour=2400;s.profile.forecast.holiday=0;s.profile.forecast.specialGross=24000;
  s.delay=0;const a=annualForecast(s);s.delay=1;const b=annualForecast(s);
  assert.equal(a.ss,4096.92);assert.ok(b.ss<a.ss);assert.ok(b.ss>3900);
});
