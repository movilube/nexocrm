const axios = require('axios');

async function sendMessage(phoneNumberId, to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) { console.error('[WhatsApp] Sin token configurado'); return; }

  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[WhatsApp] Mensaje enviado a ${to}`);
  } catch (e) {
    console.error('[WhatsApp] Error al enviar:', e.response?.data || e.message);
  }
}

function extractMessages(body) {
  const msgs = [];
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    if (!value?.messages) return msgs;

    const phoneNumberId = value.metadata?.phone_number_id;
    for (const msg of value.messages) {
      if (msg.type === 'text') {
        msgs.push({
          canal: 'whatsapp',
          from: msg.from,
          fromName: value.contacts?.find(c => c.wa_id === msg.from)?.profile?.name || msg.from,
          body: msg.text.body,
          phoneNumberId,
          raw: msg,
        });
      }
    }
  } catch (e) { /* ignore malformed */ }
  return msgs;
}

module.exports = { sendMessage, extractMessages };
