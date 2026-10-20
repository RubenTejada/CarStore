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
src/components/map/         Google Maps, mapa esquemático y selector de ubicación
```

## Reglas de negocio

- Publicar requiere un plan activo con cupo; los dealers además deben estar aprobados.
- Destacar consume los cupos de destacados del plan; los destacados salen en la portada.
- Los planes se pagan por transferencia: el usuario envía la referencia y un administrador confirma el pago.
- Al vencer un plan, sus vehículos se pausan (revisión automática cada 10 minutos al navegar).
- Las fotos se guardan en `uploads/` (disco local), convertidas a WebP.

## Pruebas

```bash
npm test         # pruebas unitarias
npm run lint
npm run build
```
