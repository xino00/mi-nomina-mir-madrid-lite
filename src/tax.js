// AEAT ALGORITMO_2026.pdf y Algoritmo Retenciones-2026_10sept.pdf,
// pp. 10, 22–24 y 29–33. Subconjunto peninsular descrito en la interfaz.
// Retención del trabajo, no cuota de la declaración de renta.
import {round} from './money.js';
const trunc=n=>Math.trunc((n+1e-10)*100)/100;
export function taxScale(base){
  const caps=[12450,20200,35200,60000,300000,Infinity],rates=[.19,.24,.30,.37,.45,.47];
  let previous=0,total=0;
  caps.forEach((cap,i)=>{total+=Math.max(0,Math.min(base,cap)-previous)*rates[i];previous=cap;});
  return total;
}
export function estimateTax({gross,contributions,situation='3',minimumRate=15,accumulatedGross=0,accumulatedWithheld=0,regularize=false}){
  for(const n of [gross,contributions,minimumRate,accumulatedGross,accumulatedWithheld])if(!Number.isFinite(n)||n<0)throw new RangeError('Dato fiscal no válido.');
  if(!['2','3'].includes(situation)||minimumRate>47)throw new RangeError('Situación fiscal no admitida.');
  const rnt=Math.max(0,gross-contributions),expenses=Math.min(2000,rnt);
  // RNT en céntimos evita perder el half-up en 7301.965 por binarios IEEE754.
  const cents=Math.round(rnt*100);
  const reductionCents=cents<=1485200?730200:cents<=1767352?Math.floor((73020000-175*(cents-1485200)+50)/100):cents<1974750?Math.floor((23643400-114*(cents-1767352)+50)/100):0;
  const reduction=reductionCents/100;
  const base=Math.max(0,rnt-expenses-reduction),threshold=situation==='2'?17197:15876;
  let quota=Math.max(0,taxScale(base)-taxScale(5550));
  if(gross<=threshold)quota=0;
  else if(gross<=35200)quota=Math.min(quota,.43*(gross-threshold));
  const remaining=gross-(regularize?accumulatedGross:0),retained=regularize?accumulatedWithheld:0;
  const rate=gross===0?0:Math.min(47,Math.max(minimumRate,remaining>0?trunc(Math.max(0,quota-retained)/remaining*100):0));
  // Cuota mantiene máxima precisión hasta el truncamiento del tipo.
  return {gross,contributions,rnt,expenses,reduction,base,quota,threshold,rate,annualWithheld:round(Math.max(0,remaining)*rate/100+retained),regularize};
}
