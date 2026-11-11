# Verificación de Lite

Fecha de revisión: 11/11/2026.

## Cálculos y fuentes

- Tablas MIR de febrero de 2026 y guardias de julio de 2026/enero de 2027: lectura del texto original y revisión visual de las páginas PDF, con segunda revisión independiente.
- RD 951/2026: complemento desde enero de 2027 y jornada desde septiembre de 2027 separados.
- Bases y tipos de cotización: contraste BOE y Seguridad Social; encuadre MIR de desempleo marcado provisional.
- IRPF: implementación de un subconjunto del algoritmo AEAT. Cinco ejemplos calculados independientemente a partir del PDF, pruebas de truncamiento y de redondeo a medio céntimo. No se presentan como resultados obtenidos en el servicio AEAT.

`npm test` ejecuta 59 casos: R1–R5, tablas completas, cero guardias, presencial/localizada/especial, decimales, cambios de curso a mitad de mes, junio/julio de 2026, diciembre/enero de 2027, agosto/septiembre de 2027, bases mínimas y máximas, solidaridad, prorrata, extras, vacaciones, manuales y retorno automático, previsión anual, acumulados, fin de residencia, validación y almacenamiento.

La revisión adversarial encontró y corrigió: previsión anual insuficiente que permitía IRPF automático0; pérdida de horas en alta parcial; redondeo binario incorrecto de RED20; estado incompleto que eludía controles; ausencia de fin de residencia en la previsión. Una segunda pasada corrigió prorrata en años incompletos, reparto de devengos anuales, redondeos monetarios, acceso bloqueado a localStorage y la base previa de guardias diferidas cuando la previsión ya conoce otros devengos.

## Límites pendientes

- **Comparación interactiva AEAT pendiente:** la web y el servicio requieren NIF válido; la web sin NIF devuelve R9005. La revisión automática de permisos rechazó el envío propuesto de identificadores de formato válido presentados como ficticios, por posible coincidencia con personas reales. No se enviaron. El ZIP oficial solo aporta ejemplos estructurales, no casos fiscales de contraste.
- Período exacto de extras MIR y encuadre de desempleo: pendientes de confirmación primaria específica SERMAS. Supuestos visibles y ajustes manuales disponibles.
- Parámetros salariales/fiscales y bases 2027 aún no contrastados como publicados: referencia2026 provisional. Tipos de solidaridad2027 derivados y señalados.
- Un navegador simulado no sustituye prueba en un teléfono físico ni la comparación con nóminas reales.

## Interfaz y publicación

Navegador Chromium: 31 comprobaciones de interfaz aprobadas, sin errores JavaScript. Se verificaron anchos de 320, 390, 768 y 1440 píxeles; ajustes manuales y retorno automático; especiales sin tarifa bloqueadas; transición diciembre/enero; teclado; persistencia decimal tras recarga; borrado exclusivo de Lite y funcionamiento sin envíos de formulario. La captura de red solo registró peticiones GET de recursos estáticos locales. Se inspeccionaron visualmente las capturas de móvil y escritorio. El repositorio no contiene datos de nóminas ni identificadores personales. Capturas y perfiles de prueba quedan fuera del despliegue.
