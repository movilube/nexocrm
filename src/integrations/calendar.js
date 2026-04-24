const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

let calendarClient = null;

function getClient() {
  if (calendarClient) return calendarClient;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const creds = JSON.parse(raw);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    calendarClient = google.calendar({ version: 'v3', auth });
    return calendarClient;
  } catch (e) {
    console.error('[Calendar] Error al inicializar cliente:', e.message);
    return null;
  }
}

async function getAvailableSlots(daysAhead = 5) {
  const client = getClient();
  const calId = process.env.GOOGLE_CALENDAR_ID;
  if (!client || !calId) return getFallbackSlots();

  try {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);

    const res = await client.events.list({
      calendarId: calId,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const busy = (res.data.items || []).map(e => ({
      start: new Date(e.start.dateTime || e.start.date),
      end: new Date(e.end.dateTime || e.end.date),
    }));

    // Generate candidate slots: Mon-Sat 8-17, every 90 min
    const slots = [];
    const cursor = new Date(now);
    cursor.setMinutes(0, 0, 0);
    cursor.setHours(cursor.getHours() + 1);

    while (cursor < end && slots.length < 6) {
      const day = cursor.getDay();
      const hour = cursor.getHours();
      if (day >= 1 && day <= 6 && hour >= 8 && hour <= 16) {
        const slotEnd = new Date(cursor);
        slotEnd.setMinutes(90);
        const conflict = busy.some(b => cursor < b.end && slotEnd > b.start);
        if (!conflict) {
          slots.push({
            start: new Date(cursor),
            end: slotEnd,
            label: formatSlot(cursor),
          });
        }
      }
      cursor.setTime(cursor.getTime() + 90 * 60 * 1000);
    }
    return slots.slice(0, 3);
  } catch (e) {
    console.error('[Calendar] Error al obtener slots:', e.message);
    return getFallbackSlots();
  }
}

async function createEvent(titulo, descripcion, start, end, contacto) {
  const client = getClient();
  const calId = process.env.GOOGLE_CALENDAR_ID;
  if (!client || !calId) return { id: uuidv4(), fallback: true };

  try {
    const res = await client.events.insert({
      calendarId: calId,
      resource: {
        summary: `${titulo} - ${contacto}`,
        description: descripcion,
        start: { dateTime: start.toISOString(), timeZone: 'America/Argentina/Mendoza' },
        end: { dateTime: end.toISOString(), timeZone: 'America/Argentina/Mendoza' },
      },
    });
    return res.data;
  } catch (e) {
    console.error('[Calendar] Error al crear evento:', e.message);
    return null;
  }
}

function formatSlot(date) {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${dias[date.getDay()]} ${date.getDate()} ${meses[date.getMonth()]} a las ${h}:${m}hs`;
}

function getFallbackSlots() {
  const now = new Date();
  return [
    { label: 'Mañana por la mañana (consultar disponibilidad)', start: now, end: now },
    { label: 'Mañana por la tarde (consultar disponibilidad)', start: now, end: now },
    { label: 'Pasado mañana (consultar disponibilidad)', start: now, end: now },
  ];
}

module.exports = { getAvailableSlots, createEvent };
