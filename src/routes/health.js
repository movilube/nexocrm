module.exports = (req, res) => {
  const status = {
    ok: true,
    empresa: process.env.COMPANY_NAME || 'Movilube',
    timestamp: new Date().toISOString(),
    canales: {
      whatsapp: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID_1),
      instagram: !!process.env.INSTAGRAM_TOKEN,
      facebook: !!(process.env.FACEBOOK_PAGE_TOKEN && process.env.FACEBOOK_PAGE_ID),
    },
    integraciones: {
      anthropic_ia: !!process.env.ANTHROPIC_API_KEY,
      google_sheets: !!process.env.GOOGLE_SHEETS_ID,
      google_calendar: !!process.env.GOOGLE_CALENDAR_ID,
      google_service_account: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    },
    lineas_whatsapp: [
      process.env.WHATSAPP_PHONE_ID_1 ? 'Linea 1: OK' : 'Linea 1: Sin configurar',
      process.env.WHATSAPP_PHONE_ID_2 ? 'Linea 2: OK' : 'Linea 2: Sin configurar',
      process.env.WHATSAPP_PHONE_ID_3 ? 'Linea 3: OK' : 'Linea 3: Sin configurar',
    ],
  };
  res.json(status);
};
