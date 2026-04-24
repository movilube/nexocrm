# NexoCRM Movilube 🚗🔧

CRM Multicanal con IA para Movilube — atención automática vía WhatsApp, Instagram y Facebook con integración a Google Calendar y Google Sheets.

## Stack
- **Backend:** Node.js + Express
- **IA:** Claude (Anthropic)
- **Canales:** WhatsApp (3 líneas), Instagram, Facebook Messenger
- **Integraciones:** Google Sheets (precios), Google Calendar (turnos)
- **Hosting:** Railway

## Setup rápido

### 1. Clonar e instalar
```bash
git clone https://github.com/TU_USUARIO/nexocrm-movilube.git
cd nexocrm-movilube
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 3. Correr localmente
```bash
npm start
# Abrir http://localhost:3000
```

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | API Key de Anthropic (console.anthropic.com) |
| `ADMIN_PASSWORD` | Contraseña del panel CRM |
| `META_VERIFY_TOKEN` | Token de verificación de webhooks Meta |
| `WHATSAPP_TOKEN` | Token permanente de WhatsApp Business |
| `WHATSAPP_PHONE_ID_1/2/3` | IDs de las 3 líneas de WhatsApp |
| `INSTAGRAM_TOKEN` | Page Token para Instagram |
| `FACEBOOK_PAGE_TOKEN` | Page Token para Facebook Messenger |
| `FACEBOOK_PAGE_ID` | ID de la página de Facebook |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON de cuenta de servicio de Google (en una línea) |
| `GOOGLE_SHEETS_ID` | ID del Google Sheet de precios |
| `GOOGLE_CALENDAR_ID` | ID del Google Calendar de turnos |

## Endpoints

| Endpoint | Descripción |
|---|---|
| `GET /` | Panel CRM |
| `GET /health` | Estado de todos los canales |
| `GET /webhooks/meta` | Verificación Meta |
| `POST /webhooks/meta` | Mensajes entrantes (WA + IG + FB) |
| `GET /api/messages` | Mensajes recientes |
| `GET /api/conversations` | Conversaciones |
| `POST /api/reply` | Respuesta manual del agente |
| `GET /api/turnos` | Turnos pendientes |
| `POST /api/turnos/:id/confirm` | Confirmar turno |

## Estructura del proyecto

```
nexocrm-movilube/
├── src/
│   ├── index.js              # Entry point
│   ├── store.js              # Estado en memoria
│   ├── ai/
│   │   └── claude.js         # Lógica de IA
│   ├── channels/
│   │   ├── whatsapp.js
│   │   ├── instagram.js
│   │   └── facebook.js
│   ├── integrations/
│   │   ├── sheets.js         # Google Sheets (precios)
│   │   └── calendar.js       # Google Calendar (turnos)
│   ├── webhooks/
│   │   └── processor.js      # Orquestador de mensajes
│   └── routes/
│       ├── webhooks.js
│       ├── api.js
│       ├── ui.js
│       └── health.js
├── config/
│   └── ai.json               # Personalidad de la IA
├── public/
│   └── index.html            # Panel CRM
├── .env.example
└── package.json
```

## Personalizar la IA

Editá `config/ai.json` para cambiar el nombre, zona, horarios y servicios que maneja la IA sin tocar código.

## Soporte

Si encontrás algún error, revisá los logs en Railway y el endpoint `/health`.
