// Half-up simétrico a céntimos. La tolerancia relativa de unas pocas ULP corrige
// únicamente ruido IEEE754 alrededor de x.xx5 (p. ej. 1000.10 × 15 %).
// No usar para la cuota fiscal intermedia: AEAT exige conservar su precisión.
export function round(value) {
  if(!Number.isFinite(value))throw new RangeError('Importe no finito.');
  const scaled=Math.abs(value)*100;
  return Math.sign(value)*Math.round(scaled+4*Number.EPSILON*Math.max(1,scaled))/100;
}
