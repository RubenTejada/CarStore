# Revisión legal y operativa de TuCarroOnline

Fecha: 1 de noviembre de 2026. Alcance: código de este repositorio y operación dirigida a República Dominicana. No es un dictamen jurídico ni una garantía contra demandas. Debe revisarlo un abogado dominicano con conocimiento de la operación real antes de abrir la contratación comercial.

## Identidad y pendientes que no resuelve un aviso

El usuario identifica al operador como **Ruben Tejada, persona física**, e indica que todavía no tiene RNC. El nombre y el documento se configuraron únicamente en `.env`, que está excluido de Git. La página pública muestra solo los últimos cuatro dígitos de la cédula; no repetir el documento completo en código, capturas, commits, registros ni archivos de entrega. El documento no se utiliza para afirmar una inscripción fiscal no acreditada.

El correo legal y de privacidad confirmado por el operador el 2 de noviembre de 2026 es **Info@tucarroonline.com**, configurado localmente. Falta el domicilio para notificaciones; no se inventó. Replicar en el entorno real:

```dotenv
LEGAL_OPERATOR_NAME="Ruben Tejada"
LEGAL_OPERATOR_RNC=""
LEGAL_OPERATOR_ADDRESS=""
LEGAL_CONTACT_EMAIL="Info@tucarroonline.com"
```

`LEGAL_OPERATOR_DOCUMENT` es opcional y privado; solo sirve para mostrar una terminación del documento. No añadir su valor al repositorio. La DGII explica que el número de RNC de una persona física coincide con la cédula, pero se debe realizar la inscripción correspondiente: [guía oficial de inscripción](https://dgii.gov.do/publicacionesOficiales/bibliotecaVirtual/contribuyentes/rnc/Documents/4-PasosparainscribirsecontribuyentePFAdmLocales.pdf). Confirmar con contador la inscripción, actividad económica, comprobantes fiscales, impuestos y precio total de los planes antes de cobrar.

Los planes pagados y el trabajo de alertas comerciales quedan bloqueados mientras falte nombre, RNC, domicilio o correo válido. Esta es una comprobación de configuración, no una validación del RNC ante DGII ni una certificación jurídica. El portal gratuito sigue funcionando. El formulario de reclamaciones persiste las solicitudes aunque no haya un proveedor de correo configurado.

Antes de abrir contratación:

- Abogado: adaptar y revisar condiciones, publicidad, obligaciones de consumo, alcance de la intermediación y depósito de contratos de adhesión ante Pro Consumidor. No afirmar que están registrados hasta completar el trámite.
- Operador: confirmar si hay actividad fuera de RD, comisiones por préstamos, afiliación con bancos, reservas, custodia de dinero, inspección o garantías propias. Los textos describen las funciones observadas en el código; cualquiera de estas actividades adicionales obliga a revisar el alcance y las obligaciones.
- Operador y contador: informar importe final con impuestos, beneficiario bancario, mecanismo de facturación, tratamiento de pagos rechazados y tiempos reales de activación/devolución. No hay cuenta bancaria de cobro configurada ni una pasarela en este cambio.
- Responsable de datos: documentar proveedores y regiones reales, contratos de tratamiento y transferencias, permisos de personal, retención por categoría, copias de seguridad y procedimiento de incidentes. Esta revisión no certifica configuraciones de Azure, Google o Anthropic.
- Moderación: definir evidencias para el distintivo Verificado y aplicar realmente el proceso. Un distintivo no acredita inspección, titularidad ni historial.
- Contenido: revisar que los anuncios/fotos importados tienen autorización; el permiso del vendedor no concede derechos de un fotógrafo o del portal de origen. Revisar licencias de marcas, emblemas, fotos demo y recursos 360; los avisos no subsanan una licencia ausente.
- Información económica: revisar vigencia de tasas, fuentes y tarifas tributarias. La estimación de marbete existente identifica el período **2025–2026**; no presentarla como liquidación del período siguiente sin verificarla en DGII.

## Cobertura implementada

| Operación observada | Documentos y controles |
| --- | --- |
| Registro de comprador, vendedor y dealer | Términos, privacidad, mayoría de edad y representación; casilla obligatoria sin marcar, validación en servidor y registro de versión/fecha/cuenta. |
| Cuentas existentes o creadas desde el equipo | Deben revisar las condiciones vigentes antes de acceder a operaciones que exigen cuenta; no se fabrican aceptaciones históricas. La sincronización de guardados y la subida de imágenes esperan esa aceptación. |
| Datos personales y publicaciones | Privacidad identifica categorías, finalidades, destinatarios, visibilidad pública de contacto/ubicación/placa/VIN y límites de conservación reales. |
| Consultas y pruebas de manejo | Autorización específica para guardar y comunicar datos al vendedor y equipo autorizado; evidencia en la misma transacción que la consulta; no promete respuesta, reserva ni cita confirmada. |
| Planes por transferencia | Política de pagos, vencimiento y reembolsos sin renuncias generales; aceptación de oferta mostrada, detección de cambios y copia de prestaciones en el registro. Las condiciones económicas de planes con solicitudes o períodos contratados no se modifican; se crea otro plan. |
| Publicaciones, IA e importación | Declaración de facultades y derechos de textos/fotos, obligación de revisar resultados, condiciones del origen y aviso del proveedor de IA. El servidor exige autorización; una activación rápida sin evidencia actual remite a Editar. |
| Cookies y mapas | Política de almacenamiento; Google Maps no se monta hasta que se pulsa Cargar Google Maps, con mapa esquemático alternativo. Geolocalización requiere permiso del navegador. |
| Alertas | Desactivadas por defecto; elección separada, evidencia de activación, correo verificado, baja en cada resumen y datos del operador en el pie. |
| Tasas, conversiones y calculadoras | Simulación de referencia, fechas, cargos excluidos y ausencia de aprobación; corrección del rótulo de costo total a subtotal estimado. |
| Reclamaciones, fraude y derechos | `/legal/contacto` sin cuenta; persistencia y referencia; `/admin/legal` con autorización ADMIN, paginación y notas de atención. El operador debe responder por el canal indicado. |
| Transparencia | Seis políticas, índice e identificación del operador, enlaces desde el pie, ficha, cuenta, formularios y sitemap. |

## Atención de reclamaciones y datos

1. Revisar `/admin/legal` todos los días; asignar una persona responsable. El código no envía una notificación automática al administrador ni garantiza una respuesta por sí solo.
2. Clasificar urgencia, derechos y plazos legales. Registrar recepción, comunicación al solicitante y actuación. No marcar como atendida solo por haber leído la solicitud.
3. En solicitudes de acceso/corrección/supresión, verificar identidad y representación de forma proporcional antes de revelar información. No pedir documentos completos por canales inseguros.
4. Al cerrar una cuenta, revisar anuncios, equipo del dealer, consultas recibidas, pagos, registros de aceptación, cargas de imágenes, registros técnicos y copias de seguridad. No ejecutar un borrado indiscriminado: el modelo tiene relaciones en cascada que pueden afectar vehículos y solicitudes de compradores. Conservar únicamente lo que tenga fundamento y documentar por qué.
5. En avisos sobre contenido, identificar anuncio/obra, valorar la evidencia, tomar medidas proporcionales, avisar al publicante cuando proceda y admitir revisión. Preservar evidencias necesarias conforme a la ley.
6. Comunicar la respuesta al correo proporcionado y después documentarla en la nota interna. Marcar atendida no manda un correo. La persona conserva acceso a las autoridades y tribunales competentes.

## Versiones y evidencia

`LEGAL_VERSION` identifica los documentos y los formularios de esta entrega. `LegalAcceptance` guarda tipo, versión, fecha del servidor, usuario cuando existe y referencia de la operación. El alta de consultas y la de planes guardan su evidencia de forma transaccional. `LegalRequest` guarda la versión de la autorización del propio formulario.

Conservar el commit o una copia inmutable de los documentos y del texto de cada casilla correspondiente a cada versión publicada. Un número de versión sin el texto histórico no es una prueba completa. No editar retroactivamente el texto de una versión ya publicada: incrementar versión, archivar la anterior, comunicar cambios materiales y solicitar nueva aceptación cuando proceda. Las casillas y registros no equivalen a una firma digital certificada ni acreditan por sí solos la titularidad de un vehículo o los derechos de una fotografía.

## Migración y despliegue

No se ha modificado la base de datos operativa ni publicado el portal. Aplicar la migración incluida mediante el flujo normal de despliegue, con respaldo previo y el código compatible desplegado en la misma ventana. No ejecutar este código sobre el esquema anterior: usa `User.legalVersion`, `LegalAcceptance` y `LegalRequest`.

```bash
npx prisma migrate deploy
```

La migración desactiva las alertas que venían activadas por defecto y deja pendiente la aceptación de cuentas existentes. Los usuarios deben elegir de nuevo las alertas desde su cuenta; sus vehículos, guardados, contraseñas y pagos se conservan. Una importación interrumpida anterior sin evidencia de derechos debe solicitarse de nuevo; los anuncios ya existentes no se retiran automáticamente.

Configurar los datos legales en Azure App Service y en el entorno del workflow que ejecuta `alerts:send` (además de las credenciales actuales); `.env` local no se publica. No colocar la cédula completa en variables `NEXT_PUBLIC_*`. La página de identificación lee su configuración en ejecución. La función de disponibilidad comprueba campos completos; no exige ni demuestra una revisión profesional.

Para revertir la aplicación, conservar las columnas y tablas aditivas para no perder evidencias. No reactivar masivamente alertas ni eliminar reclamaciones. Si fuera necesario un cambio de esquema posterior, preparar una migración aparte y respaldar los registros; no editar una migración ya aplicada.

## Fuentes consultadas

- [Ley 358-05, texto en WIPO Lex](https://www.wipo.int/wipolex/en/legislation/details/11048): información en contratación a distancia (art. 62), contratos de adhesión (art. 81), interpretación y cláusulas abusivas (arts. 82–83). Esos límites impiden prometer inmunidad mediante una exoneración general.
- [Pro Consumidor: registro de contratos de adhesión](https://proconsumidor.gob.do/conoce-sobre-los-contratos-de-adhesion-y-como-registrarlos-ante-pro-consumidor/): trámite que debe completar el operador; el código no lo realiza.
- [Ley 172-13, Superintendencia de Bancos](https://www.sb.gob.do/regulacion/leyes/ley-no-172-13-proteccion-de-los-datos/) y [referencia oficial al derecho de información](https://sb.gob.do/regulacion/normativas-sb/circular-sb-num-01722/): finalidades, destinatarios, identificación del responsable y derechos. La circular es sectorial; no se afirma que el portal sea una entidad financiera.
- [Ley 126-02, INDOTEL](https://indotel.gob.do/wp-content/uploads/2022/10/ley-no-126-02.pdf): marco de documentos y comercio electrónico; la aceptación registrada no se presenta como firma digital certificada.
- [OGTIC: Ley 310-14 sobre correo comercial](https://old.ogtic.gob.do/noticias/nueva-ley-310-14-regula-envio-de-correos-electronicos-comerciales-no-deseados/): identificación del iniciador y mecanismos de baja. Confirmar el régimen concreto de las comunicaciones comerciales antes de operar.
- [Reglamento de la Ley 65-00, WIPO Lex](https://www.wipo.int/wipolex/es/legislation/details/1193): la propiedad del soporte o vehículo no concede automáticamente derechos de explotación de contenido.

## Validación técnica

Se probaron validaciones del servidor frente a llamadas sin aceptación y versiones desactualizadas, separación de alertas opcionales, evidencia transaccional de consultas, bloqueo comercial sin identificación, rechazo de ofertas de planes modificadas y persistencia de reclamaciones sin correo.

También se verificaron las migraciones en una instancia temporal independiente de PostgreSQL, incluida una actualización con una cuenta anterior: conserva la contraseña, desactiva las alertas no acreditadas y no inventa consentimientos. El entorno operativo no se utilizó para estas pruebas.
