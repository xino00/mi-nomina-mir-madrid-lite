# Mi nómina MIR Madrid · Lite

Calculadora estática mensual para MIR R1–R5 del SERMAS, jornada completa y situación ordinaria, 2026–2027.

**Web:** https://xino00.github.io/mi-nomina-mir-madrid-lite/

Configura fechas de curso, circunstancias fiscales y previsión anual; introduce las horas del mes. Solo se guarda el perfil y un escenario actual en `localStorage`. No hay cuenta, servidor de cálculo, historial, calendario ni importación de nóminas. «Borrar mis datos» elimina exclusivamente la clave de Lite.

Es una estimación, no una liquidación oficial. Los supuestos y parámetros provisionales aparecen en la web. Las situaciones fiscales no admitidas exigen porcentaje manual. Bajas, jornada parcial, finiquitos y atrasos complejos no se liquidan automáticamente.

## Criterios esenciales

- Guardias por fecha trabajada, a mes vencido por defecto. Julio de 2026 y enero de 2027 son vigencias distintas; no se acumula un incremento sobre sus importes publicados.
- Formación 2027: 18/28/38/48/58 % del sueldo, sustituyendo el complemento anterior. Sueldo base 2027 provisional, referencia 2026.
- Cotización por mes devengado, con bases CC y CP distintas, prorrata, topes, MEI y solidaridad. Desempleo MIR: supuesto provisional 1,60 %, corregible.
- Extra semestral y prorrata estimadas con criterio explícito; admite importes manuales.
- Especiales: tarifa manual. Vacaciones: media introducida por el usuario y fracción expresa del mes, sin divisor oculto.
- IRPF: subconjunto del algoritmo AEAT de 2026; 2027 mantiene referencia provisional. El contraste contra el servicio interactivo AEAT sigue pendiente, porque requiere NIF; los casos de pruebas derivan del PDF oficial.

Consulta [fuentes, cifras y criterios](docs/FUENTES.md) y [verificación y límites](docs/VERIFICACION.md).

## Desarrollo

Sin dependencias de producción ni instalación previa. Requiere Node.js 22+ y Python 3 para el servidor local.

```sh
npm test
npm run build
npm run dev
```

Abre `http://127.0.0.1:4187`. `build` prepara `dist/` a partir de una lista explícita. GitHub Actions ejecuta pruebas, compila y publica ese directorio en Pages con cada push a `main`.

- `src/rules.js`: tablas, fuentes y fechas de efectos.
- `src/engine.js`: curso, tarifas, extras, previsión y cálculo mensual.
- `src/contributions.js`: bases y cuotas del trabajador.
- `src/tax.js`: algoritmo fiscal admitido.
- `src/state.js`: persistencia y validación estructural.
- `src/app.js`, `index.html`, `styles.css`: interfaz.

La aplicación anterior `xino00/mi-nomina-mir-madrid` permanece independiente. Esta versión revisa las ideas de selección temporal de tarifas, precedencia manual y cotización incremental de su motor; no importa sus datos ni sus integraciones.

Última revisión normativa: **11 de noviembre de 2026**. Las actualizaciones se incorporarán mediante nuevas versiones del repositorio.
