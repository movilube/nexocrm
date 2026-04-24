const { google } = require('googleapis');

let sheetsClient = null;
let cachedPrices = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getClient() {
  if (sheetsClient) return sheetsClient;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const creds = JSON.parse(raw);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (e) {
    console.error('[Sheets] Error al inicializar cliente:', e.message);
    return null;
  }
}

async function getPrices() {
  // Return cache if fresh
  if (cachedPrices && Date.now() - cacheTime < CACHE_TTL) return cachedPrices;

  const client = getClient();
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!client || !sheetId) {
    return getFallbackPrices();
  }

  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A2:F50', // Servicio, Descripcion, Precio Base, Precio Premium, Duracion
    });

    const rows = res.data.values || [];
    cachedPrices = rows
      .filter(r => r[0])
      .map(r => ({
        servicio: r[0] || '',
        descripcion: r[1] || '',
        precioBase: r[2] || 'Consultar',
        precioPremium: r[3] || '',
        duracion: r[4] || '',
      }));
    cacheTime = Date.now();
    return cachedPrices;
  } catch (e) {
    console.error('[Sheets] Error al leer precios:', e.message);
    return getFallbackPrices();
  }
}

function getFallbackPrices() {
  return [
    { servicio: 'Cambio de aceite', descripcion: 'Aceite + filtro incluido', precioBase: 'Consultar por WhatsApp', precioPremium: '', duracion: '45 min' },
    { servicio: 'Service completo', descripcion: '12 puntos de inspección', precioBase: 'Consultar por WhatsApp', precioPremium: '', duracion: '90 min' },
    { servicio: 'Cambio de filtros', descripcion: 'Motor, cabina o combustible', precioBase: 'Consultar por WhatsApp', precioPremium: '', duracion: '30 min' },
    { servicio: 'Cambio de batería', descripcion: 'Instalación + prueba de carga', precioBase: 'Consultar por WhatsApp', precioPremium: '', duracion: '30 min' },
    { servicio: 'Fluidos y químicos', descripcion: 'Refrigerante, frenos, dirección', precioBase: 'Consultar por WhatsApp', precioPremium: '', duracion: '20 min' },
  ];
}

function formatPricesForAI(prices) {
  return prices.map(p => {
    let line = `- ${p.servicio}: ${p.precioBase}`;
    if (p.precioPremium) line += ` (premium: ${p.precioPremium})`;
    if (p.descripcion) line += ` | ${p.descripcion}`;
    if (p.duracion) line += ` | Duración: ${p.duracion}`;
    return line;
  }).join('\n');
}

module.exports = { getPrices, formatPricesForAI };
