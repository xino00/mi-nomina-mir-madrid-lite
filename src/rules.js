// Valores transcritos de los originales. Nunca se aplica un incremento general
// encima de una tabla que ya publica importes totales.
export const REVIEWED = '2026-11-11';
export const SOURCES = {
  salary: {title:'Orden de nóminas SERMAS 2026', url:'https://www.bocm.es/boletin/CM_Orden_BOCM/2026/02/09/BOCM-20260209-6.PDF', location:'Art. 28 y anexo V.6, pág. 78 del boletín (52 del PDF)', from:'2026-01-01', status:'publicada'},
  guards: {title:'Acuerdo de guardias 2026–2027', url:'https://www.bocm.es/boletin/CM_Orden_BOCM/2026/07/30/BOCM-20260730-9.PDF', location:'Apartados 1.1, 2, 3 y 4; págs. 52, 55 y 56', from:'2026-07-01', status:'publicada'},
  training: {title:'RD 951/2026 · formación y jornada', url:'https://www.boe.es/eli/es/rd/2026/11/04/951/dof/spa/pdf', location:'Art. único.4–5 y disposición final única', from:'2027-01-01', status:'publicada'},
  residence: {title:'RD 1146/2006 · relación de residencia', url:'https://www.boe.es/eli/es/rd/2006/10/06/1146/con', location:'Art. 7.2: dos extras semestrales', from:'2006-10-08', status:'publicada'},
  ss: {title:'Orden de cotización 2026', url:'https://www.boe.es/eli/es/o/2026/03/30/pjc297', location:'Arts. 1–4, 16 y 17', from:'2026-01-01', status:'publicada'},
  lgss: {title:'Ley General de la Seguridad Social', url:'https://www.boe.es/eli/es/rdlg/2015/10/30/8/con', location:'Art. 19 bis; disposiciones transitorias 42 y 43', from:'2027-01-01', status:'publicada'},
  aeat: {title:'AEAT · algoritmo de retenciones 2026', url:'https://sede.agenciatributaria.gob.es/Sede/Retenciones.shtml', location:'Algoritmos de 2026, apartados III–VI; referencia provisional para 2027', from:'2026-01-01', status:'publicada'},
  irpf: {title:'Reglamento IRPF', url:'https://www.boe.es/eli/es/rd/2007/03/30/439/con', location:'Arts. 80–87; mínimo de relaciones laborales especiales, art. 86.2', from:'2026-01-01', status:'publicada'},
};
export const SALARY_2026 = 1387.24;
export const TRAINING_2026 = [138.31,249.29,388.01,526.74,665.46];
export const TRAINING_2027 = [.18,.28,.38,.48,.58];
export const GUARD_TABLES = [
  {from:'2026-01-01',status:'publicada',source:'salary',labour:[12.50,15,17.49,19.99,19.99],holiday:[14.87,17.36,19.85,22.33,22.33]},
  {from:'2026-07-01',status:'publicada',source:'guards',labour:[13.13,15.75,18.36,20.99,20.99],holiday:[15.61,18.23,20.84,23.45,23.45]},
  {from:'2027-01-01',status:'publicada',source:'guards',labour:[13.78,16.54,19.28,22.04,22.04],holiday:[16.39,19.14,21.88,24.62,24.62]},
];
export const MODES = {
  labour:'Presencial · laborable', holiday:'Presencial · sábado, domingo o festivo',
  locatedLabour:'Localizada · laborable', locatedHoliday:'Localizada · sábado, domingo o festivo',
  special:'Especial · importe manual', locatedSpecial:'Especial localizada · importe manual',
};
