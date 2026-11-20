# Preparación privada PMS Bersoch Mobile — 19/11/2026

Estado: código y pruebas locales; NO instalado, publicado ni conectado a datos reales.
Base remota exacta: ee9c2af915fb2d62a9123562d087582d8852ae9d (PR6).
DEMO permanece separada y sin modificaciones.

## Configuración pendiente de aprobación y acceso administrativo

Preparar cliente OAuth Google para origen HTTPS personal exacto, consentimiento y usuarios autorizados. No crear ni compartir credenciales desde el chat.
Variables exclusivamente en hosting: PMS_DATA_MODE=private; PMS_GOOGLE_CLIENT_ID; PMS_ALLOWED_EMAILS; PMS_ALLOWED_SUBJECTS opcional; PMS_PERSONAL_SPREADSHEET_ID; PMS_GOOGLE_SERVICE_ACCOUNT (JSON secreto de cuenta lectora dedicada, token_uri Google). API Sheets habilitada y lector autorizado solo en base personal, previa aprobación. No usar credenciales DEMO.
El ID público OAuth puede enviarse al navegador; secretos y allowlist quedan en servidor. La verificación real de firma/audience la realiza google-auth-library. Los tests sustituyen el proveedor: no certifican OAuth real ni permisos del hosting.

## Comportamiento y costos

Sin modo privado se conserva transporte público legacy. Configuración privada incompleta bloquea; nunca vuelve a GViz. Antes del login no se consulta Sheets. Cada actualización privada pide una función que obtiene once rangos por batchGet. El asesor exige la misma autorización antes de invocar OpenAI.
En privado se elimina la copia patrimonial persistida en este navegador, no la DEMO; el token vive solo en memoria. Se pierde disponibilidad patrimonial offline persistente. Un fallo de configuración inicial bloquea incluso la restauración legacy para evitar bajar de seguridad. Aprobar expresamente esta consecuencia en la publicación.
Las peticiones a funciones y el tráfico de Netlify pueden consumir créditos. NO probar en Netlify, desplegar, activar builds ni llamar funciones publicadas antes de autorización específica. Las pruebas locales no usan Netlify ni OpenAI.

## Artefacto, instalación y reversión

Antes de publicar preparar directorio estático separado con index.html, privacy-client.js, sw.js, manifest e iconos necesarios; nunca publicar node_modules, server, tests, package-lock, archivos de entorno o respaldos. El candidato cambia netlify.toml de raíz a dist y prepara npm run build: copia una lista explícita de ocho archivos estáticos, sin llamadas externas. Funciones y dependencias permanecen en servidor; verificar su empaquetado real en el release aprobado. Este cambio local no reactiva los builds remotos detenidos. Verificar lista de archivos antes de subir. No generar builds exploratorios.
Respaldar deploy publicado, variables (sin volcarlas al repositorio), configuración de hosting/OAuth y permisos de Drive. Validar en entorno aislado con datos sintéticos y después comparación privada autorizada. Migrar ambos consumidores personales antes de retirar anyone-reader. Confirmar service worker nuevo y clientes antiguos; revocar acceso público solo tras verificación y aprobación.
Rollback: recuperar deploy anterior conocido o detener acceso personal; NO reabrir la base al público automáticamente. Invalidar sesiones, revisar cachés y volver a verificar permisos. No modificar activadores ni históricos.

## Pruebas

npm test: 30 pruebas unitarias. tests/private-browser.cjs: login simulado, cero lecturas previas, un bundle autorizado, sin caché personal persistente, logout y rechazo de tercero. Pruebas públicas smoke/cache mantienen comportamiento legacy con red de datos bloqueada. Falta validación real de Google, Netlify, secretos, versión instalada y dispositivos móviles reales.
