const axios = require('axios');

async function sendMessage(recipientId, text) {
  const token = process.env.FACEBOOK_PAGE_TOKEN;
  if (!token) { console.error('[Facebook] Sin token configurado'); return; }

  try {
    await axios.post(
      'https://graph.facebook.com/v18.0/me/messages',
      { recipient: { id: recipientId }, message: { text } },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[Facebook] Mensaje enviado a ${recipientId}`);
  } catch (e) {
    console.error('[Facebook] Error al enviar:', e.response?.data || e.message);
  }
}

function extractMessages(body) {
  const msgs = [];
  try {
    for (const entry of body.entry || []) {
      for (const messaging of entry.messaging || []) {
        if (messaging.message?.text && !messaging.message.is_echo) {
          msgs.push({
            canal: 'facebook',
            from: messaging.sender.id,
            fromName: `Cliente Facebook ${messaging.sender.id.slice(-4)}`,
            body: messaging.message.text,
            raw: messaging,
          });
        }
      }
    }
  } catch (e) { /* ignore */ }
  return msgs;
}

module.exports = { sendMessage, extractMessages };
