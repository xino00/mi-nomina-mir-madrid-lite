/**
 * Cuotas del trabajador, Régimen General, mes completo ordinario MIR (grupo 1).
 * 2026: Orden PJC/297/2026, arts. 1–4, 16, 17 y 33:
 * https://www.boe.es/eli/es/o/2026/03/30/pjc297
 * 2027: LGSS, DT 42 (solidaridad) y DT 43 (MEI):
 * https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724
 *
 * Las bases 2027 mantienen provisionalmente las de 2026. Los tipos de solidaridad
 * 2027 se derivan del reparto CC: total × 4,7 / 28,3, redondeado a 2 decimales.
 * El 1,60 % de desempleo es un supuesto de contrato temporal general: pendiente
 * de confirmar el encuadre específico MIR. El 1,55 % se admite como ajuste manual.
 * La prorrata se recibe explícitamente; la paga extra no se vuelve a incluir.
 */

import {round} from './money.js';
const quotaKeys = ['common', 'unemployment', 'training', 'mei', 'solidarity'];
const source2026 = 'https://www.boe.es/eli/es/o/2026/03/30/pjc297';
const sourceLGSS = 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724';

function positiveAmount(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} debe ser un número finito no negativo.`);
  }
}

function parametersFor(year, unemploymentRate) {
  if (year !== 2026 && year !== 2027) {
    throw new RangeError('Las cotizaciones automáticas solo admiten 2026 y 2027.');
  }
  if (unemploymentRate !== 1.6 && unemploymentRate !== 1.55) {
    throw new RangeError('El tipo de desempleo debe ser 1,60 % o 1,55 %.');
  }
  return {
    year,
    effectiveFrom: `${year}-01-01`,
    minimumCC: 1989.30,
    minimumAT: 1424.40,
    maximum: 5101.20,
    commonRate: 4.7,
    unemploymentRate,
    trainingRate: 0.1,
    meiRate: year === 2026 ? 0.15 : 0.17,
    solidarityRates: year === 2026 ? [0.19, 0.21, 0.24] : [0.23, 0.25, 0.29],
    status: {
      bases: year === 2026 ? 'publicada' : 'provisional',
      common: year === 2026 ? 'publicada' : 'provisional',
      training: year === 2026 ? 'publicada' : 'provisional',
      unemployment: unemploymentRate === 1.55 ? 'manual' : 'provisional',
      mei: 'publicada',
      solidarity: year === 2026 ? 'publicada' : 'provisional',
    },
    sources: {
      bases: `${source2026} (arts. 1–3; referencia 2026)`,
      common: `${source2026} (art. 4; referencia 2026)`,
      unemployment: `${source2026} (art. 33; encuadre MIR pendiente de confirmar)`,
      training: `${source2026} (art. 33; referencia 2026)`,
      mei: year === 2026 ? `${source2026} (art. 16)` : `${sourceLGSS} (DT 43)`,
      solidarity: year === 2026 ? `${source2026} (art. 17)` : `${sourceLGSS} (DT 42; reparto derivado)`,
    },
  };
}

function solidarityFor(raw, parameters) {
  const maximum = parameters.maximum;
  // Tres bases independientes; cada cuota se redondea a céntimos antes de sumar.
  const bases = [
    Math.max(0, Math.min(raw, maximum * 1.1) - maximum),
    Math.max(0, Math.min(raw, maximum * 1.5) - maximum * 1.1),
    Math.max(0, raw - maximum * 1.5),
  ].map(round);
  const amounts = bases.map((base, index) => round(base * parameters.solidarityRates[index] / 100));
  return { bases, amounts, total: round(amounts.reduce((sum, amount) => sum + amount, 0)) };
}

/** Cuota completa de un único mes de devengo; importes en euros y tipos en %. */
export function contributionFor({ fixed, prorata, other = 0, guards = 0, year, unemploymentRate = 1.6 }) {
  for (const [name, value] of Object.entries({ fixed, prorata, other, guards })) positiveAmount(name, value);
  const parameters = parametersFor(year, unemploymentRate);
  const raw = round(fixed + prorata + other + guards);
  positiveAmount('Base sin topes', raw);
  const capped = (minimum) => raw === 0 ? 0 : round(Math.min(parameters.maximum, Math.max(minimum, raw)));
  const ccBase = capped(parameters.minimumCC);
  const atBase = capped(parameters.minimumAT);
  const solidarity = solidarityFor(raw, parameters);
  const result = {
    raw,
    ccBase,
    atBase,
    common: round(ccBase * parameters.commonRate / 100),
    unemployment: round(atBase * parameters.unemploymentRate / 100),
    training: round(atBase * parameters.trainingRate / 100),
    mei: round(ccBase * parameters.meiRate / 100),
    solidarity: solidarity.total,
    solidarityBases: solidarity.bases,
    solidarityAmounts: solidarity.amounts,
    provisional: Object.values(parameters.status).includes('provisional'),
    parameters,
  };
  result.total = round(quotaKeys.reduce((sum, key) => sum + result[key], 0));
  return result;
}

/**
 * Cuota adicional de las guardias de un mes ya cotizado sin ellas.
 * Agrupar previamente todas las guardias del mismo mes evita aplicar topes varias
 * veces. El motor que llama a esta función conserva la cuota fija ya calculada.
 */
export function contributionIncrement(input) {
  const before = contributionFor({ ...input, guards: 0 });
  const after = contributionFor(input);
  const result = {
    raw: round(after.raw - before.raw),
    ccBase: round(after.ccBase - before.ccBase),
    atBase: round(after.atBase - before.atBase),
    solidarityBases: after.solidarityBases.map((value, index) => round(value - before.solidarityBases[index])),
    solidarityAmounts: after.solidarityAmounts.map((value, index) => round(value - before.solidarityAmounts[index])),
    provisional: after.provisional,
    parameters: after.parameters,
    before,
    after,
  };
  for (const key of quotaKeys) result[key] = round(after[key] - before[key]);
  result.total = round(quotaKeys.reduce((sum, key) => sum + result[key], 0));
  return result;
}
