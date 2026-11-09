# Demo del módulo de redes sociales

Guía para preparar en producción (tucarroonline.com) un dealer de demostración conectado a una página de Facebook y a una cuenta de Instagram reales, y para presentar el módulo.

> **Facebook Marketplace no se puede conectar.** Meta no ofrece una API para que otras aplicaciones publiquen en Marketplace. Los anuncios salen en la página de Facebook del dealer y en su Instagram. Si hace falta mostrar Marketplace, el carro se publica a mano desde la app de Facebook.

## Qué se crea

`npm run demo:dealer` (`scripts/create-demo-dealer.ts`) crea o actualiza:

- **TuCarro Demo Motors** (`/dealers/tucarro-demo-motors`), aprobado y marcado como **demo**. Sus carros no salen en búsquedas, portada, mapa, listado de dealers ni sitemap, y sus páginas no se indexan. Solo se abren con el enlace directo, que es el que llevan las publicaciones de Facebook e Instagram. En `/admin/dealers` aparece con la etiqueta «Demo».
- La cuenta **demo@tucarroonline.com** (rol dealer), con la contraseña del secreto `DEMO_DEALER_PASSWORD`.
- Un año del plan para dealers con «Redes sociales» que tenga más cupo (referencia de pago `DEMO`).
- Un diseño por defecto para los anuncios (plantilla «Precio protagonista», colores «Noche y sol») con publicación automática activada.
- Seis carros de muestra con fotos. Cuatro quedan publicados y dos en borrador (Ford Mustang rojo y Toyota Camry) para publicarlos en vivo. Cada uno dice «Vehículo de demostración de TuCarroOnline: no está a la venta».

El script se puede correr varias veces. Si el dealer ya tiene carros, no agrega más; el diseño de anuncios que ya exista no se toca.

## 1. Desplegar

El módulo, la marca *demo* y sus migraciones (`20261110010000_social_module`, `20261111010000_dealer_demo`) se aplican con el despliegue normal: al subir `main`, `.github/workflows/deploy.yml` corre `prisma migrate deploy`.

## 2. Crear la página de Facebook y el Instagram (lo haces tú)

1. Desde tu perfil de Facebook, crea una página llamada **TuCarro Demo Motors**, de categoría «Concesionario de automóviles». Agrega el logo, la portada y el teléfono.
2. Crea una cuenta de Instagram para el demo (por ejemplo, `tucarrodemomotors`) y cámbiala a **cuenta profesional, tipo Empresa**: Configuración → Tipo de cuenta y herramientas.
3. Vincula el Instagram con la página. En Facebook, entra a la página → Configuración → Cuentas vinculadas → Instagram. También se puede desde Meta Business Suite → Configuración → Cuentas de Instagram.

Tu usuario de Facebook tiene que ser administrador de la página. Es el mismo usuario con el que conectarás el portal.

## 3. Crear la app de Meta (lo haces tú)

En [developers.facebook.com](https://developers.facebook.com/apps):

1. **Crear app**. Caso de uso: «Otro». Tipo: **Empresa**. Nombre: «TuCarroOnline».
2. Agrega el producto **Inicio de sesión con Facebook para empresas**. En su configuración:
   - **URI de redireccionamiento de OAuth válidos:** `https://tucarroonline.com/api/social/meta/callback`
   - Crea una **configuración** de tipo «Token de acceso de usuario» con estos permisos: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `read_insights`, `business_management`, `instagram_basic`, `instagram_content_publish` e `instagram_manage_insights`. Copia su **ID de configuración**.
3. En **Configuración de la app → Básica**, completa:
   - Dominios de la app: `tucarroonline.com`
   - URL de la política de privacidad: `https://tucarroonline.com/legal/privacidad`
   - Instrucciones de eliminación de datos: `https://tucarroonline.com/legal/contacto`
   - Copia el **Identificador de la app** y la **Clave secreta**.
4. Deja la app en **modo desarrollo**. En ese modo los permisos funcionan sin la revisión de Meta para quienes tienen un rol en la app, y tú eres administrador. Para que los usen dealers reales, la app debe pasar la revisión con esos mismos permisos (Revisión de la app → Permisos y funciones).

## 4. Configurar el portal

En App Service (`carstore-web`, grupo `cityguide-rg`):

```bash
az webapp config appsettings set -g cityguide-rg -n carstore-web --settings META_APP_ID="<id de la app>" META_APP_SECRET="<clave secreta>" META_LOGIN_CONFIG_ID="<id de la configuración>" SOCIAL_TOKEN_KEY="$(openssl rand -base64 32)"
```

Guarda el mismo `SOCIAL_TOKEN_KEY` también como secreto del repositorio. Si la clave cambia, hay que volver a conectar las páginas.

En el repositorio (Settings → Secrets and variables → Actions), agrega:

- `META_APP_ID`, `META_APP_SECRET` y `SOCIAL_TOKEN_KEY`, para `.github/workflows/social-metrics.yml`, que lee las métricas cada 6 horas.
- `DEMO_DEALER_PASSWORD`: la contraseña de la cuenta demo.
- `DEMO_DEALER_PHONE` (opcional): el WhatsApp que muestran los anuncios, por ejemplo `8095550000`.

## 5. Crear el dealer demo

En Actions → **Dealer demo** → Run workflow:

1. Córrelo primero **sin** marcar «aplicar». El resumen muestra la base, el plan y lo que haría.
2. Córrelo de nuevo con **aplicar** marcado.

## 6. Conectar las redes (5 minutos)

1. Entra con **demo@tucarroonline.com** y acepta las condiciones.
2. Ve a **Redes sociales** → **Conectar con Facebook**. Autoriza con tu usuario y elige la página **TuCarro Demo Motors**. Si tienes varias páginas, el portal te deja escoger. El Instagram vinculado se conecta solo.
3. En «Publicación», deja marcados Facebook e Instagram.

## Guion de la demostración

1. **Diseño de marca:** Redes sociales → *Editar diseño por defecto*. Cambia de plantilla, de colores y de tipografía, y guarda. Ese diseño lo reciben todos los carros que se publiquen.
2. **Publicación automática:** Mis vehículos → *Ford Mustang 2020* (borrador) → Editar → acepta las condiciones → Publicar. En unos segundos aparece en la página y en Instagram con la imagen generada y el enlace a su ficha.
3. **Ajuste fino de un anuncio:** en el Toyota RAV4, toca *Redes*. Elige la foto, encuádrala tocando la vista previa, cambia el texto y la etiqueta, prueba el formato *Historia 9:16*, redacta el texto con IA y toca **Publicar ahora**. También puedes **Descargar imagen**.
4. **Visitas desde redes:** abre la publicación de Facebook en un navegador sin sesión en el portal y toca el enlace. La visita se cuenta en *Visitas desde redes*.
5. **Métricas:** Redes sociales muestra alcance, vistas e interacciones por red y por publicación, junto a las visitas y los contactos del portal. Meta tarda unas horas en reportar el alcance; usa **Actualizar métricas**.

## Después de la demo

- Para que no se publique nada más, desmarca *Publicar automáticamente* o pausa los carros.
- Las publicaciones viven en la página y en Instagram del demo; se borran desde ahí.
- **Desconectar** en Redes sociales borra los tokens del portal. Para retirar también el permiso, quita la app en Facebook: Configuración → Integraciones comerciales.
