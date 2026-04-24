const express = require('express');
const router = express.Router();
const { getMessages, getAllConversations, getPendingTurnos, confirmTurno } = require('../store');
const { sendManualReply } = require('../webhooks/processor');
const { createEvent } = require('../integrations/calendar');
const { getPrices } = require('../integrations/sheets');

// Simple auth middleware
function auth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key === process.env.ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'No autorizado' });
}

// Get all recent messages
router.get('/messages', auth, (req, res) => {
  res.json(getMessages(100));
});

// Get all conversations
router.get('/conversations', auth, (req, res) => {
  res.json(getAllConversations());
});

// Send manual reply
router.post('/reply', auth, async (req, res) => {
  const { canal, to, text, meta } = req.body;
  if (!canal || !to || !text) return res.status(400).json({ error: 'Faltan campos' });
  await sendManualReply(canal, to, text, meta || {});
  res.json({ ok: true });
});

// Get pending turnos
router.get('/turnos', auth, (req, res) => {
  res.json(getPendingTurnos());
});

// Confirm a turno
router.post('/turnos/:id/confirm', auth, async (req, res) => {
  const { id } = req.params;
  const { slotIndex, servicio } = req.body;
  const turno = confirmTurno(id);
  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

  const slot = turno.slots?.[slotIndex || 0];
  if (slot && slot.start) {
    const end = new Date(slot.start);
    end.setMinutes(end.getMinutes() + 90);
    await createEvent(
      servicio || 'Servicio Movilube',
      `Cliente: ${turno.fromName} | Canal: ${turno.canal}`,
      new Date(slot.start),
      end,
      turno.fromName
    );
    // Notify client
    const msg = `¡Turno confirmado! Te esperamos el ${slot.label} para tu ${servicio || 'servicio'}. Nuestro tecnico se va a comunicar antes de llegar. Cualquier consulta escribinos por aqui.`;
    await sendManualReply(turno.canal, turno.from, msg, {});
  }

  res.json({ ok: true, turno });
});

// Get prices from sheets
router.get('/precios', auth, async (req, res) => {
  const prices = await getPrices();
  res.json(prices);
});

module.exports = router;
