export const STORAGE_KEY = 'mi-nomina-mir-madrid-lite.v1';
export function defaultState() {
  return {
    version:1, configured:false,
    profile:{endDate:'',gradeDates:['2026-01-01','2027-01-01','2028-01-01','2029-01-01','2030-01-01'], situation:'3', supported:true, unemploymentRate:1.6,
      forecast:{labour:0,holiday:0,locatedLabour:0,locatedHoliday:0,specialGross:0,otherGross:0,grossOverride:null,ssOverride:null},
      accumulated:{enabled:false,year:2026,gross:0,withheld:0}},
    month:'2026-11', delay:1,
    hours:{labour:0,holiday:0}, rows:[],
    overrides:{tax:null,ss:null,salary:null,training:null,extra:null,prorata:null,labour:null,holiday:null},
    vacation:{enabled:false,average:0,fraction:1}, otherGross:0,otherDeductions:0,
  };
}
export function saveState(state, storage) {
  try {storage??=globalThis.localStorage;storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;} catch {return false;}
}
export function loadState(storage) {
  try {
    storage??=globalThis.localStorage;
    const raw=storage.getItem(STORAGE_KEY);
    if(!raw)return {state:defaultState(),error:false};
    const s=JSON.parse(raw), d=defaultState();
    if(!validShape(s,d))throw Error();
    return {state:s,error:false};
  } catch {return {state:defaultState(),error:true};}
}
export function clearState(storage){storage??=globalThis.localStorage;storage.removeItem(STORAGE_KEY);return defaultState();}

// Rechaza objetos incompletos o manipulados: undefined no puede convertirse
// silenciosamente en "automático" ni eludir una condición de seguridad fiscal.
export function validShape(s,d=defaultState()) {
  if(!s||typeof s!=='object'||Array.isArray(s))return false;
  for(const [key,value]of Object.entries(d)){
    if(!(key in s))return false;
    const actual=s[key];
    if(value===null){if(actual!==null&&(typeof actual!=='number'||!Number.isFinite(actual)))return false;}
    else if(Array.isArray(value)){
      if(!Array.isArray(actual))return false;
      if(key==='gradeDates'&&(actual.length!==5||actual.some(x=>typeof x!=='string')))return false;
      if(key==='rows'&&(actual.length>100||actual.some(row=>!validShape(row,{date:'',mode:'',hours:0,rate:null}))))return false;
    }
    else if(typeof value==='object'){if(!validShape(actual,value))return false;}
    else if(typeof actual!==typeof value||(typeof actual==='number'&&!Number.isFinite(actual)))return false;
  }
  return s.version===undefined||s.version===1;
}
