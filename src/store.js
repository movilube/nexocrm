// Simple in-memory store (persists while Railway is running)
// For production with more than 5 users, consider upgrading to a DB

const store = {
  messages: [],      // All incoming messages
  conversations: {}, // Grouped by contact
  agents: {},        // Online agents
  pendingTurnos: [], // Pending appointment confirmations
};

function addMessage(msg) {
  // msg: { id, canal, from, fromName, body, timestamp, status, aiSuggestion, department, isEscalated }
  store.messages.unshift(msg);
  if (store.messages.length > 500) store.messages.pop();

  const key = `${msg.canal}:${msg.from}`;
  if (!store.conversations[key]) {
    store.conversations[key] = { contact: msg.from, name: msg.fromName, canal: msg.canal, messages: [] };
  }
  store.conversations[key].messages.push(msg);
  store.conversations[key].lastMessage = msg;
  return msg;
}

function getMessages(limit = 50) {
  return store.messages.slice(0, limit);
}

function getConversation(canal, from) {
  return store.conversations[`${canal}:${from}`] || null;
}

function getAllConversations() {
  return Object.values(store.conversations).sort((a, b) => {
    const aT = a.lastMessage?.timestamp || 0;
    const bT = b.lastMessage?.timestamp || 0;
    return bT - aT;
  });
}

function addPendingTurno(turno) {
  store.pendingTurnos.push(turno);
}

function getPendingTurnos() {
  return store.pendingTurnos;
}

function confirmTurno(id) {
  const i = store.pendingTurnos.findIndex(t => t.id === id);
  if (i !== -1) {
    const t = store.pendingTurnos.splice(i, 1)[0];
    t.status = 'confirmed';
    return t;
  }
  return null;
}

module.exports = { addMessage, getMessages, getConversation, getAllConversations, addPendingTurno, getPendingTurnos, confirmTurno };
