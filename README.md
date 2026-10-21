# TuCarroOnline

Portal de venta de vehículos nuevos y usados para República Dominicana: navegación gráfica por tipo → marca → modelo, búsqueda con filtros por características, fichas con galería, dealers con perfil y mapa, panel para dealers/vendedores y panel de administración con planes de pago.

## Marca

Logo en `public/brand/` (SVG y PNG, versiones clara/oscura y con ".com"); favicon en `src/app/icon.svg` y `src/app/apple-icon.png`.
El texto del logo está convertido a trazos con la tipografía Archivo (ancho 125, peso 800). Para regenerarlo:

```bash
python3 -m venv .venv-logo && .venv-logo/bin/pip install fonttools brotli
.venv-logo/bin/python scripts/build-logo.py <archivo-variable.woff2> public/brand
```

## Stack

- Next.js 16 (App Router, Server Components, Server Actions) + TypeScript
- PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)
- Tailwind CSS 4, Motion (animaciones), lucide-react (íconos), simple-icons (logos de marcas)
- Google Maps (`@vis.gl/react-google-maps` + clusters). Sin clave se muestra un mapa esquemático de RD.
- Sesiones propias en base de datos (cookie httpOnly + token hasheado), contraseñas con bcrypt
- Vitest para pruebas unitarias

## Puesta en marcha

```bash
cp .env.example .env          # ajusta DATABASE_URL y SEED_DEMO_PASSWORD
createdb carstore
npm install                   # genera el cliente de Prisma
npx prisma migrate dev        # crea las tablas
npm run db:seed               # marcas, dealers, planes y vehículos demo
npm run dev                   # http://localhost:3000
```

Para ver los mapas de Google, define `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Maps JavaScript API) en `.env`.

El estilo del mapa con los colores del portal está en `docs/google-maps-estilo.json`. Como los marcadores avanzados requieren un Map ID, el estilo se aplica en Google Cloud: **Google Maps Platform → Estilos de mapa → Crear estilo → Importar JSON**, luego asócialo a un Map ID (JavaScript, vectorial) y ponlo en `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.

### Usuarios demo

Todos usan la contraseña definida en `SEED_DEMO_PASSWORD`.

| Rol | Correo |
| --- | --- |
| Administrador | `admin@demo.carstore.do` |
| Dealer (aprobado, plan Premium) | `auto-caribe-motors@demo.carstore.do` |
| Dealer (pendiente de aprobación) | `bonao-auto-center@demo.carstore.do` |
| Particular (plan Pro) | `particular@demo.carstore.do` |

Cada dealer demo tiene un usuario `<slug-del-dealer>@demo.carstore.do`.

## Estructura

```
prisma/schema.prisma        modelo de datos
prisma/seed.ts              datos demo (fotos de Unsplash)
src/app/(public)/           portal público: inicio, vehículos, ficha, dealers, mapa, planes, login, registro
src/app/panel/              panel de dealers y vendedores particulares
src/app/admin/              administración: pagos, dealers, vehículos, usuarios, catálogo, características, planes
src/app/actions/            Server Actions (validación con Zod + autorización)
src/lib/search-params.ts    filtros de búsqueda en la URL → consulta Prisma
src/lib/listing-rules.ts    permisos de edición, cupos de plan y destacados
src/lib/lenders.ts          entidades financieras y fuentes de sus tasas
scripts/update-rates.ts     trabajo diario de tasas (GitHub Actions)
src/components/map/         Google Maps, mapa esquemático y selector de ubicación
```

## Reglas de negocio

- Publicar requiere un plan activo con cupo; los dealers además deben estar aprobados.
- Destacar consume los cupos de destacados del plan; los destacados salen en la portada.
- Los planes se pagan por transferencia: el usuario envía la referencia y un administrador confirma el pago.
- Al vencer un plan, sus vehículos se pausan (revisión automática cada 10 minutos al navegar).
- Las fotos se guardan en `uploads/` (disco local), convertidas a WebP.

## Vista 360

Cada vehículo puede tener un **giro exterior** (`Vehicle.spinFrames`: 12 a 72 fotos tomadas alrededor del auto, en orden; opcionalmente `Vehicle.spinVideo`, el mismo giro como MP4 en bucle) y un **interior 360** (`Vehicle.interiorPano`: foto equirectangular 2:1 de una cámara 360). Se suben desde el formulario del vehículo en el panel.

- En la ficha aparecen como pestañas junto a las fotos: el giro se arrastra o se mueve con las flechas, el interior se recorre arrastrando y se acerca con la rueda, el pellizco o +/−.
- En los destacados de la portada los vehículos con giro se muestran girando solos; un botón de la sección lo pausa y se respeta "reducir movimiento".
- Con video, el giro automático es el video (más suave y liviano: la portada no descarga los cuadros) y al tocarlo en la ficha sigue el canvas desde el mismo ángulo. Si el vendedor cambia los cuadros, el video se descarta.
- Los visores no usan librerías: el giro dibuja en un canvas fundiendo cada cuadro con el siguiente y el interior es un shader WebGL2 (`src/components/vehicle/`).
- Las vistas de demostración (`public/demo-360/`) son renders del "Car Concept" de Khronos (CC BY 4.0, ver `public/demo-360/CREDITS.txt`) en dos colores: 96 cuadros, video de 9 s por vuelta e interior. El seed se las asigna a las jeepetas Mercedes-Benz y Lexus; una de cada marca encabeza los destacados.

## Tasas diarias (dólar y préstamos de vehículos)

El workflow `.github/workflows/daily-rates.yml` corre cada día a las 9:15 a. m. (hora de RD) y ejecuta `npm run rates:update` (`scripts/update-rates.ts`):

1. Guarda la tasa del dólar del Banco Central del día y recalcula `priceDop` de los vehículos en USD (si el trabajo no corre, el portal la sigue refrescando con la primera visita del día).
2. Para cada entidad de `src/lib/lenders.ts` con fuente (`rates`), descarga su documento oficial de tasas, Claude extrae las tasas de préstamos de vehículos y, si pasan la validación, se publican en la tabla `LoanRate` con la fecha de verificación. Si una fuente falla se conservan sus últimos valores y el workflow termina en error.

Secretos del repositorio (Settings → Secrets and variables → Actions): `DATABASE_URL` (base de datos de producción, accesible desde GitHub) y `ANTHROPIC_API_KEY` (o `ANTHROPIC_FOUNDRY_RESOURCE` + `ANTHROPIC_FOUNDRY_API_KEY` para Azure). Se puede lanzar a mano desde la pestaña Actions («Run workflow»), opcionalmente solo para algunas entidades. En local: `npm run rates:update` o `npm run rates:update -- apap`.

Los datos de cada entidad (contacto, inicial y plazo máximo) se mantienen a mano en `src/lib/lenders.ts`; para agregar una entidad automatizable basta con indicar en `rates` la URL del documento (o de la página que lo enlaza, con `link`).

## Importar desde otros portales

En el panel, **Publicar vehículo** acepta el enlace de un anuncio en otro portal (SuperCarros, Corotos, la web de un dealer…) y llena el formulario con sus datos, características y fotos para revisarlo y publicarlo. Los dealers tienen además **Importar inventario**: con el enlace de su página en otro portal se recorre el listado (con su paginación) y cada vehículo se crea como borrador.

- La página se descarga en el servidor (`src/lib/safe-fetch.ts`: solo http(s) públicos; se rechazan IPs privadas, también tras redirecciones) y Claude extrae los datos con salida estructurada contra el catálogo (`src/lib/listing-import.ts`, partes puras en `src/lib/listing-parse.ts`). Las fotos se copian a `uploads/` como WebP.
- Marca y modelo deben existir en el catálogo; si no, el anuncio individual pide elegirlos y el inventario lo marca con error. Cada vehículo guarda su `sourceUrl`, así un anuncio no se importa dos veces.
- El inventario corre en segundo plano en el mismo proceso (`after`, modelo `ImportJob`); si el servidor se reinicia, la página permite reanudarlo.
- Solo se lee el HTML que entrega el servidor: los sitios que arman la página con JavaScript en el navegador (p. ej. Facebook Marketplace) no traen los datos.
- El vendedor confirma que el anuncio es suyo: importar contenido ajeno puede infringir los términos del otro portal.

### Claude: API de Anthropic o Microsoft Foundry (Azure)

`src/lib/claude.ts` usa Claude en Microsoft Foundry si están `ANTHROPIC_FOUNDRY_RESOURCE` y `ANTHROPIC_FOUNDRY_API_KEY` (el despliegue debe llamarse como el modelo, `claude-opus-5-5`); si no, la API de Anthropic con `ANTHROPIC_API_KEY`. Aplica a la importación y a las tasas diarias.

## Pruebas

```bash
npm test         # pruebas unitarias
npm run lint
npm run build
```

## Despliegue

Azure App Service `carstore-web` (Node 24, plan `cityguide-plan` del grupo `cityguide-rg`, junto a QuehacerRD y HotelMagazine). Cada push a `main` ejecuta `.github/workflows/deploy.yml`: pruebas, build standalone, `prisma migrate deploy` y publicación.

- Base de datos: `carstore` en el servidor PostgreSQL `nexconta-db-b` (grupo `nexconta`). Su firewall solo admite servicios de Azure; los workflows abren una regla temporal para la IP del runner y la cierran al terminar.
- Fotos: `UPLOAD_DIR=/home/data/uploads` en la configuración de App Service; `/home` persiste entre despliegues.
- Configuración de App Service: `DATABASE_URL`, `UPLOAD_DIR` y las claves de Claude. Las `NEXT_PUBLIC_*` se incrustan en el build, por eso van como secretos del repositorio.
