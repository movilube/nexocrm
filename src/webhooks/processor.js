const { v4: uuidv4 } = require('uuid');
const { processMessage } = require('../ai/claude');
const { addMessage, getConversation, addPendingTurno } = require('../store');
const whatsapp = require('../channels/whatsapp');
const instagram = require('../channels/instagram');
const facebook = require('../channels/facebook');

async function handleIncoming(canal, from, fromName, body, meta = {}) {
  console.log(`[${canal.toUpperCase()}] Mensaje de ${fromName} (${from}): ${body.substring(0, 60)}`);

  // Get conversation history for context
  const conv = getConversation(canal, from);
  const history = conv ? conv.messages.slice(-6).map(m => ({
    role: m.direction === 'in' ? 'user' : 'assistant',
    content: m.body,
  })) : [];

  // Process with AI
  const ai = await processMessage(canal, from, fromName, body, history);

  // Save incoming message
  const inMsg = addMessage({
    id: uuidv4(),
    canal,
    from,
    fromName,
    body,
    direction: 'in',
    timestamp: Date.now(),
    status: 'received',
    department: ai.department,
    isEscalated: ai.isEscalated,
    aiSuggestion: ai.reply,
    meta,
  });

  // Send AI reply automatically
  await sendReply(canal, from, ai.reply, meta);

  // Save outgoing message
  addMessage({
    id: uuidv4(),
    canal,
    from,
    fromName: 'Movi (IA)',
    body: ai.reply,
    direction: 'out',
    timestamp: Date.now(),
    status: 'sent',
    department: ai.department,
    isEscalated: false,
    meta,
  });

  // If proposing a turno, save as pending
  if (ai.proposingSlot && ai.slots?.length > 0) {
    addPendingTurno({
      id: uuidv4(),
      canal,
      from,
      fromName,
      slots: ai.slots,
      status: 'pending',
      timestamp: Date.now(),
    });
  }

  return inMsg;
}

async function sendReply(canal, to, text, meta = {}) {
  try {
    if (canal === 'whatsapp') {
      const phoneNumberId = meta.phoneNumberId || process.env.WHATSAPP_PHONE_ID_1;
      await whatsapp.sendMessage(phoneNumberId, to, text);
    } else if (canal === 'instagram') {
      await instagram.sendMessage(to, text);
    } else if (canal === 'facebook') {
      await facebook.sendMessage(to, text);
    }
  } catch (e) {
    console.error(`[Processor] Error enviando respuesta por ${canal}:`, e.message);
  }
}

// Manual reply from agent (via panel)
async function sendManualReply(canal, to, text, meta = {}) {
  await sendReply(canal, to, text, meta);
  addMessage({
    id: uuidv4(),
    canal,
    from: to,
    fromName: 'Agente Movilube',
    body: text,
    direction: 'out',
    timestamp: Date.now(),
    status: 'sent',
    department: 'Agente',
    isEscalated: false,
    meta,
  });
}

module.exports = { handleIncoming, sendManualReply };
