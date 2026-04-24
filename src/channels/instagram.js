const axios = require('axios');

async function sendMessage(recipientId, text) {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.error('[Instagram] Sin token configurado'); return; }

  try {
    await axios.post(
      'https://graph.instagram.com/v21.0/me/messages',
      { recipient: { id: recipientId }, message: { text } },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[Instagram] Mensaje enviado a ${recipientId}`);
  } catch (e) {
    console.error('[Instagram] Error al enviar:', e.response?.data || e.message);
  }
}

function extractMessages(body) {
  const msgs = [];
  try {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message?.text) return msgs;

    // Instagram DMs come through messaging field
    if (messaging.message && !messaging.message.is_echo) {
      msgs.push({
        canal: 'instagram',
        from: messaging.sender.id,
        fromName: `Usuario Instagram ${messaging.sender.id.slice(-4)}`,
        body: messaging.message.text,
        raw: messaging,
      });
    }
  } catch (e) { /* ignore */ }
  return msgs;
}

module.exports = { sendMessage, extractMessages };
