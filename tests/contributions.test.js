import test from 'node:test';
import assert from 'node:assert/strict';
import { contributionFor, contributionIncrement } from '../src/contributions.js';

const month = (overrides = {}) => ({ fixed: 2000, prorata: 333.33, year: 2026, ...overrides });

test('nómina ordinaria: bases con prorrata y cuotas separadas', () => {
  const result = contributionFor(month());
  assert.equal(result.raw, 2333.33);
  assert.equal(result.ccBase, 2333.33);
  assert.equal(result.atBase, 2333.33);
  assert.equal(result.common, 109.67);
  assert.equal(result.unemployment, 37.33);
  assert.equal(result.training, 2.33);
  assert.equal(result.mei, 3.5);
  assert.equal(result.solidarity, 0);
  assert.equal(result.total, 152.83);
});

test('el suelo de CC no se traslada a desempleo ni formación', () => {
  const result = contributionFor(month({ fixed: 1000, prorata: 0 }));
  assert.equal(result.ccBase, 1989.3);
  assert.equal(result.atBase, 1424.4);
  assert.equal(result.common, 93.5);
  assert.equal(result.unemployment, 22.79);
  assert.equal(result.training, 1.42);
  assert.equal(result.mei, 2.98);
  assert.equal(result.total, 120.69);
});

test('sin remuneración ni prorrata no se fabrica una cuota mínima', () => {
  const result = contributionFor(month({ fixed: 0, prorata: 0 }));
  assert.equal(result.total, 0);
  assert.equal(result.ccBase, 0);
  assert.equal(result.atBase, 0);
});

test('guardias debajo del suelo CC solo incrementan desempleo y FP', () => {
  const result = contributionIncrement(month({ fixed: 1800, prorata: 0, guards: 100 }));
  assert.equal(result.ccBase, 0);
  assert.equal(result.atBase, 100);
  assert.equal(result.common, 0);
  assert.equal(result.mei, 0);
  assert.equal(result.total, 1.7);
});

test('no se vuelve a cotizar la cuota fija al liquidar guardias atrasadas', () => {
  const input = month({ guards: 750.25 });
  const fixed = contributionFor({ ...input, guards: 0 });
  const withGuards = contributionFor(input);
  const increment = contributionIncrement(input);
  assert.equal(Math.round((fixed.total + increment.total) * 100), Math.round(withGuards.total * 100));
  for (const key of ['common', 'unemployment', 'training', 'mei', 'solidarity']) {
    assert.equal(Math.round((fixed[key] + increment[key]) * 100), Math.round(withGuards[key] * 100));
  }
});

test('todas las guardias de un mes comparten el mismo tope', () => {
  const baseline = month({ fixed: 4500, prorata: 500 });
  const grouped = contributionIncrement({ ...baseline, guards: 1000 });
  assert.equal(grouped.ccBase, 101.2);
  assert.equal(grouped.atBase, 101.2);
  // Más horas por encima del tope añaden solidaridad, no otra cuota de CC.
  const larger = contributionIncrement({ ...baseline, guards: 2000 });
  assert.equal(larger.common, grouped.common);
  assert.ok(larger.solidarity > grouped.solidarity);
});

test('solidaridad con los tres tramos y cuotas redondeadas por tramo', () => {
  const result = contributionFor(month({ fixed: 8000, prorata: 0 }));
  assert.equal(result.ccBase, 5101.2);
  assert.equal(result.atBase, 5101.2);
  assert.deepEqual(result.solidarityBases, [510.12, 2040.48, 348.2]);
  assert.deepEqual(result.solidarityAmounts, [0.97, 4.29, 0.84]);
  assert.equal(result.solidarity, 6.1);
  assert.equal(contributionFor(month({ fixed: 5101.2, prorata: 0 })).solidarity, 0);
});

test('2027 cambia MEI y solidaridad, conservando bases identificadas como provisionales', () => {
  const result2026 = contributionFor(month({ fixed: 8000, prorata: 0 }));
  const result2027 = contributionFor(month({ fixed: 8000, prorata: 0, year: 2027 }));
  assert.equal(result2026.mei, 7.65);
  assert.equal(result2027.mei, 8.67);
  assert.deepEqual(result2027.solidarityAmounts, [1.17, 5.1, 1.01]);
  assert.equal(result2027.solidarity, 7.28);
  assert.equal(result2027.parameters.status.mei, 'publicada');
  assert.equal(result2027.parameters.status.bases, 'provisional');
  assert.equal(result2027.parameters.status.solidarity, 'provisional');
  assert.equal(result2027.provisional, true);
});

test('el ajuste de desempleo 1,55 % queda marcado como manual', () => {
  const result = contributionFor(month({ unemploymentRate: 1.55 }));
  assert.equal(result.unemployment, 36.17);
  assert.equal(result.parameters.status.unemployment, 'manual');
  assert.equal(contributionFor(month()).parameters.status.unemployment, 'provisional');
});

test('la extra no tiene un segundo cargo: solo se usa la prorrata explícita', () => {
  const regular = contributionFor(month());
  const extraMonth = contributionFor({ ...month(), extra: 2000 });
  assert.equal(extraMonth.total, regular.total);
  const prorataChanged = contributionFor(month({ prorata: 400 }));
  assert.equal(prorataChanged.raw, 2400);
  assert.equal(prorataChanged.total, 157.2);
});

test('guardias cero producen incremento cero', () => {
  const result = contributionIncrement(month({ guards: 0 }));
  assert.equal(result.total, 0);
  assert.equal(result.raw, 0);
  assert.equal(result.ccBase, 0);
  assert.equal(result.atBase, 0);
});

test('rechaza entradas negativas, no finitas, tipos ajenos y años no cubiertos', () => {
  for (const field of ['fixed', 'prorata', 'other', 'guards']) {
    for (const value of [-1, NaN, Infinity, '100']) {
      assert.throws(() => contributionFor(month({ [field]: value })), RangeError);
    }
  }
  for (const year of [2025, 2028, NaN, '2026']) assert.throws(() => contributionFor(month({ year })), RangeError);
  assert.throws(() => contributionFor(month({ unemploymentRate: 1.7 })), RangeError);
});


test('casos calculados independientemente al cruzar el mínimo y el máximo', () => {
  const low = contributionFor(month({ fixed: 1800, prorata: 0 }));
  assert.equal(low.total, 127.08);
  const increment = contributionIncrement(month({ fixed: 1800, prorata: 0, guards: 200 }));
  assert.equal(increment.total, 3.92);
  const high = contributionFor(month({ fixed: 6000, prorata: 0 }));
  assert.equal(high.solidarity, 1.79);
  assert.equal(high.total, 335.92);
});
