const express = require('express');
const router = express.Router();
const { handleIncoming } = require('../webhooks/processor');
const whatsapp = require('../channels/whatsapp');
const instagram = require('../channels/instagram');
const facebook = require('../channels/facebook');

// ---- META WEBHOOK VERIFICATION ----
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Webhook] Meta verificado OK');
    return res.status(200).send(challenge);
  }
  console.warn('[Webhook] Verificacion fallida. Token recibido:', token);
  res.sendStatus(403);
});

// ---- META INCOMING MESSAGES ----
router.post('/meta', async (req, res) => {
  // Always respond 200 fast to Meta
  res.sendStatus(200);

  const body = req.body;
  if (!body.object) return;

  // WhatsApp messages
  const waMessages = whatsapp.extractMessages(body);
  for (const msg of waMessages) {
    await handleIncoming('whatsapp', msg.from, msg.fromName, msg.body, { phoneNumberId: msg.phoneNumberId });
  }

  // Instagram DMs
  // Instagram sends object: 'instagram'
  if (body.object === 'instagram') {
    const igMessages = instagram.extractMessages(body);
    for (const msg of igMessages) {
      await handleIncoming('instagram', msg.from, msg.fromName, msg.body, {});
    }
    return;
  }

  // Facebook Messenger (object: 'page')
  if (body.object === 'page') {
    // Check if it's Instagram (Instagram also uses 'page' sometimes)
    const fbMessages = facebook.extractMessages(body);
    for (const msg of fbMessages) {
      await handleIncoming('facebook', msg.from, msg.fromName, msg.body, {});
    }

    // Also try Instagram extraction on 'page' object
    const igMessages = instagram.extractMessages(body);
    for (const msg of igMessages) {
      // Only if not already handled as Facebook
      const alreadyFb = fbMessages.some(f => f.from === msg.from);
      if (!alreadyFb) {
        await handleIncoming('instagram', msg.from, msg.fromName, msg.body, {});
      }
    }
  }
});

module.exports = router;
