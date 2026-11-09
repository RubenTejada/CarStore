# Análisis de experiencia y funcionalidades — TuCarroOnline

Fecha: 28 de octubre de 2026.

## Alcance y criterio

Revisión de la versión local, con 127 anuncios y 9 dealers visibles durante la inspección. Se recorrieron portada, listado, ficha, acceso a prueba de manejo y una búsqueda sin inventario. Se revisaron también el código de comparación, cuenta, planes, formulario de publicación, solicitudes del vendedor y modelo de datos. Los paneles privados se evaluaron por código, sin entrar en cuentas. La propuesta móvil se basa en la implementación responsive; no constituye una prueba visual en dispositivos móviles.

Las prioridades son hipótesis de producto: no se dispone de analítica de uso, entrevistas ni pruebas con compradores. El inventario local no representa necesariamente el de producción. No se modificó el código de la aplicación.

## Funcionalidades que ya existen

- Búsqueda con sugerencias e interpretación de texto mediante IA; recorrido tipo → marca → modelo.
- Filtros por características, conteos, histogramas, moneda y filtros activos que se pueden quitar.
- Lista y mapa, favoritos, vistos recientemente y vehículos similares.
- Comparación con «Solo diferencias» y señales como menor precio o kilometraje.
- Cuentas de comprador, sincronización de favoritos, búsquedas guardadas y alertas diarias de novedades y rebajas.
- Galería, vistas 360°, historial de precio, WhatsApp, llamadas y solicitudes de prueba de manejo.
- Calculadora de financiamiento, comparación de entidades y estimación de gastos de compra.
- Dealer verificado, guía de compra segura e integración por enlace con consulta de placa.
- Borradores, importación de anuncios e inventario, descripción asistida, equipo y estadísticas de contactos.

La oportunidad consiste en conectar mejor estas capacidades y cubrir lo que ocurre después del contacto.

## Correcciones de mayor prioridad

| Hallazgo | Mejora concreta | Evidencia |
| --- | --- | --- |
| «Agendar prueba de manejo» desplaza a un formulario que mantiene seleccionado «Me interesa». Se reprodujo en la ficha de Honda CR-V. | Preseleccionar «Prueba de manejo», mostrar la fecha y enfocar el inicio del formulario. Mientras no haya confirmación de disponibilidad, usar «Solicitar prueba de manejo». | `src/app/(public)/vehiculos/[id]/[slug]/page.tsx`; `src/components/vehicle/contact-request-form.tsx` |
| El botón principal «Publicar» lleva a `/planes` para visitantes y compradores. | Ofrecer «Publicar gratis», conservar el destino durante acceso/registro y permitir a compradores habilitar su perfil de vendedor. Presentar planes cuando aporten una mejora relevante. | `src/components/layout/site-header.tsx` |
| La portada local muestra Gratis: 5 anuncios sin vencimiento y Básico: 2 anuncios por 30 días sin destacados. | Revisar los beneficios y cupos de planes existentes para que una opción pagada tenga una ventaja clara. Validar los valores de producción antes de cambiarlos. | Portada local; `src/app/(public)/planes/page.tsx` |
| «Alerta activa» depende de que la búsqueda esté guardada, aunque el envío global esté pausado o falte verificar el correo. | Separar «Búsqueda guardada», «Avisos en pausa» y «Confirma tu correo». | `src/components/saved/save-search-button.tsx`; `src/app/(public)/cuenta/page.tsx` |

## Funcionalidades propuestas

Esfuerzo relativo: bajo, medio o alto. No es una estimación de calendario.

| Orden | Propuesta | Primera versión útil | Beneficio esperado | Esfuerzo |
| --- | --- | --- | --- | --- |
| 1 | Recuperación de búsquedas sin resultados | Ofrecer alternativas calculadas: quitar un filtro, ampliar un rango o buscar otra provincia, con el conteo real de cada opción. Mantener visibles los criterios originales y «Crear alerta». | Evitar que el comprador tenga que empezar de nuevo. | Medio |
| 2 | Búsqueda por presupuesto mensual | Pedir inicial disponible, cuota máxima y plazo. Reutilizar la calculadora existente y conservar esos supuestos al abrir fichas y comparar. Mostrar tasa, fecha, gastos incluidos y carácter estimado. | Traducir presupuesto personal en una selección útil. | Alto |
| 3 | Filtros móviles con aplicación explícita | Panel superpuesto con secciones, filtros seleccionados, «Limpiar» y botón fijo «Ver N vehículos». Aplicar al confirmar; conservar los filtros activos sobre los resultados. | Evitar recorridos largos y actualizaciones mientras todavía se está eligiendo. | Medio |
| 4 | Contacto persistente en la ficha móvil | Barra inferior compacta con precio y WhatsApp; llamada y solicitud de prueba como acciones secundarias. Evitar superposición con comparación y teclado. | Facilitar el contacto después de leer especificaciones o financiamiento. | Bajo–medio |
| 5 | Agenda con confirmación | Horarios disponibles del vendedor, solicitud pendiente, confirmación, propuesta de otro horario y cancelación. Incorporar recordatorios solo con el canal elegido por el usuario. | Convertir una fecha preferida en una cita gestionable. | Alto |
| 6 | Seguimiento de solicitudes para ambas partes | Comprador: «Enviada / Respondida / Cita confirmada». Vendedor: responsable, notas, estados y próximo seguimiento. Conservar el contacto sin cuenta como opción. | Evitar solicitudes olvidadas y explicar qué sucede después del envío. | Alto |
| 7 | Comparación económica con los mismos supuestos | Añadir inicial, cuota, intereses y costo total estimado por vehículo usando un único escenario. Ofrecer un resumen de diferencias y contacto desde cada columna. | Ayudar a decidir entre finalistas sin repetir cálculos. | Medio |
| 8 | Búsqueda de varias marcas o modelos | Permitir, por ejemplo, «Toyota o Honda» dentro de un mismo presupuesto. OR dentro del grupo de alternativas y AND entre criterios independientes. Mantener versiones asociadas a su modelo. | Apoyar a quien sabe qué necesita pero todavía no ha elegido marca. | Medio–alto |
| 9 | Disponibilidad y confianza explicadas | «Disponibilidad confirmada el…», renovación periódica y aviso de anuncios antiguos. Explicar qué verifica el distintivo del dealer. Añadir documentos de mantenimiento o inspección con fecha y procedencia cuando existan. | Reducir consultas por vehículos ya vendidos y aclarar las garantías de cada señal. | Medio–alto |
| 10 | Alertas configurables por búsqueda | Renombrar y editar búsquedas, pausar una sola, elegir frecuencia y distinguir novedades de rebajas. Empezar por correo; sumar otros canales según demanda y consentimiento. | Recibir avisos relevantes sin desactivar todas las alertas. | Medio |
| 11 | Publicación guiada con guardado automático | Pasos cortos: vehículo, precio, fotos, ubicación y revisión. Guardar progreso parcial, reanudarlo y explicar qué falta antes de publicar. Mantener importación y borrador manual existentes. | Reducir pérdida de trabajo y mejorar la calidad del anuncio. | Medio–alto |

### Detalles que conviene preservar

- La búsqueda ya muestra filtros activos removibles; no hay que reemplazarlos por un simple contador.
- La búsqueda sin resultados ya permite crear una alerta. Las alternativas deben complementar esa función.
- Los favoritos funcionan sin cuenta y luego se sincronizan: conservar esa entrada sencilla.
- La ficha ya tiene historial de precios y costo total: hacerlos más accesibles antes de construir herramientas equivalentes.
- El formulario actual permite pedir una fecha; todavía no ofrece franjas horarias ni confirmación de cita. El modelo `ContactRequest` tampoco incluye estados, responsable o relación con la cuenta del comprador.
- Las métricas actuales cuentan clics de contacto y solicitudes; un clic en WhatsApp no acredita conversación ni venta.

## Ideas para una fase posterior

**Referencia de precio de mercado.** Comparar vehículos realmente equivalentes por modelo, versión, año, kilometraje y ubicación. Mostrar tamaño de muestra y fecha. Si faltan comparables, indicar «Datos insuficientes». Evitar presentar los precios publicados como precios de cierre o el precio relativo como certificación mecánica.

**Asistente para compradores indecisos.** Un recorrido breve por uso, pasajeros, presupuesto y prioridades puede reutilizar la búsqueda y el catálogo. Probar primero accesos por necesidad —familia, ciudad, trabajo— antes de añadir otro chat con IA.

**Reseñas de dealers.** Evaluaciones ligadas a interacciones verificables, con moderación y respuesta del dealer. Su valor depende de resolver autenticidad y volumen; por eso no sería la primera inversión.

## Orden de ejecución y medición

1. Corregir los cuatro problemas concretos de navegación, prueba de manejo, planes y estado de alertas. Instrumentar el embudo y establecer una línea base.
2. Implementar recuperación sin resultados y mejoras móviles. Medir búsquedas que llegan a una ficha, recuperación después de cero resultados y contacto desde móvil.
3. Incorporar presupuesto y comparación económica. Medir uso de escenarios, paso a contacto y abandono; no inferir aprobación crediticia.
4. Añadir seguimiento y agenda. Medir primera respuesta registrada, citas confirmadas y solicitudes pendientes. Separar acciones dentro del portal de conversaciones externas no observables.
5. Mejorar publicación y alertas según los puntos de abandono y las entrevistas con vendedores y compradores.

Una primera entrega razonable incluye las correcciones, alternativas sin resultados y contacto móvil. La hipótesis es que estos cambios mejoran el recorrido usando capacidades existentes; debe comprobarse con comportamiento real.

## Referencias externas

- [Baymard: recuperar búsquedas sin resultados](https://baymard.com/research-articles/no-results-page). Sustenta ofrecer caminos concretos para continuar.
- [Baymard: resumen de filtros aplicados](https://baymard.com/research-articles/how-to-design-applied-filters). Respalda conservar filtros visibles y removibles, también en móvil.
- [Autotrader: búsquedas, comparación y preferencias de alertas](https://www.autotrader.com/help/my-autotrader). Referencia para ampliar funciones de seguimiento que el portal ya tiene.
- [CarGurus: metodología y límites de las referencias de precio](https://www.cargurus.com/about/how-cargurus-works). Referencia para una fase posterior con datos comparables suficientes.
