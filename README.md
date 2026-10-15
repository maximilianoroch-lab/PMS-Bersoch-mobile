# PMS Bersoch Mobile

Repositorio para desplegar **PMS Bersoch Mobile** en la cuenta Netlify de Max.

## Deploy inicial

1. Crear repositorio GitHub `pms-bersoch-mobile` bajo la cuenta de Max y subir **el contenido de este ZIP**, sin carpeta intermedia.
2. Netlify (cuenta de Max) → Add new project → Import an existing project → GitHub → elegir `pms-bersoch-mobile`.
3. Branch: `main`. Build command: dejar vacío. Publish directory: `.`. Functions directory: `netlify/functions` (ya definido en `netlify.toml`).
4. Nombre sugerido del sitio Netlify: `pms-bersoch-mobile`. Confirmar que la dirección esté disponible.
5. Para probar voz, no hace falta ninguna clave. Para habilitar Asesor IA, configurar secrets `OPENAI_API_KEY`, `ADVISOR_ACCESS_CODE` (scope Functions) y, opcionalmente, `OPENAI_MODEL`. No insertar secretos en GitHub.
6. Probar carga de datos, lector de voz, chat (si hay secrets), y vista móvil antes de retirar sitios de la cuenta de Facu.

**Importante:** el chatbot puede consumir créditos de OpenAI y Netlify. El código de acceso no reemplaza cuotas, monitoreo ni autenticación robusta. El sitio sigue consultando la hoja de datos de cartera existente; esta migración mueve el hosting, **no** los datos.
