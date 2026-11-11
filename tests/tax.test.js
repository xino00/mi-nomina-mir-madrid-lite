import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateTax} from '../src/tax.js';
// Resultados calculados independientemente con Decimal desde el PDF AEAT.
// NO son capturas/resultados del servicio web oficial (requiere NIF).
for(const [gross,contributions,situation,reduction,base,quota,rate,annual]of [
  [30000,1950,'3',0,26050,4926,16.42,4926],
  [20000,1300,'3',1194.15,15505.85,1773.32,8.86,1772],
  [16000,1040,'3',7113,5847,53.32,.33,52.8],
  [18000,1170,'2',3840.5,10989.5,345.29,1.91,343.8],
  [45000,2925,'3',0,40075,9474.75,21.05,9472.5],
])test(`Algoritmo AEAT: bruto ${gross}, situación ${situation}`,()=>{
  const t=estimateTax({gross,contributions,situation,minimumRate:0});
  for(const [key,want]of Object.entries({reduction,base,quota,rate,annualWithheld:annual}))assert.ok(Math.abs(t[key]-want)<.00001,`${key}: ${t[key]} != ${want}`);
});
test('Mínimo contractual especial 15 %, también bajo umbral',()=>{
  assert.equal(estimateTax({gross:20000,contributions:1300}).rate,15);
  assert.equal(estimateTax({gross:10000,contributions:650}).rate,15);
});
test('Acumulados: estimación restante, no regularización legal completa',()=>{
  const t=estimateTax({gross:30000,contributions:1950,regularize:true,accumulatedGross:15000,accumulatedWithheld:2000});
  assert.equal(t.rate,19.5);assert.equal(t.annualWithheld,4925);
});
test('Truncamiento conserva céntimas inferiores, no redondea tipo',()=>{
  const t=estimateTax({gross:45000,contributions:2925});assert.equal(t.rate,21.05);
});
test('Cero ingresos y entradas inválidas',()=>{
  assert.equal(estimateTax({gross:0,contributions:0}).rate,0);
  assert.throws(()=>estimateTax({gross:NaN,contributions:0}));
});
