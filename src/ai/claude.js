const Anthropic = require('@anthropic-ai/sdk');
const { getPrices, formatPricesForAI } = require('../integrations/sheets');
const { getAvailableSlots } = require('../integrations/calendar');
const aiConfig = require('../../config/ai.json');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Check if message is asking to escalate to human
function isEscalationRequest(text) {
  const lower = text.toLowerCase();
  return aiConfig.escalado_frases.some(f => lower.includes(f));
}

// Classify department based on message content
function classifyDepartment(text) {
  const lower = text.toLowerCase();
  if (lower.includes('turno') || lower.includes('reserva') || lower.includes('agendar') || lower.includes('cuando')) return 'Ventas';
  if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto') || lower.includes('presupuesto')) return 'Ventas';
  if (lower.includes('problema') || lower.includes('falla') || lower.includes('roto') || lower.includes('no funciona')) return 'Soporte Técnico';
  if (lower.includes('factura') || lower.includes('pago') || lower.includes('cobro') || lower.includes('transferencia')) return 'Administración';
  if (lower.includes('queja') || lower.includes('reclamo') || lower.includes('mal servicio') || lower.includes('insatisfecho')) return 'Reclamos';
  return 'Ventas';
}

async function processMessage(canal, from, fromName, body, conversationHistory = []) {
  // Check escalation first
  if (isEscalationRequest(body)) {
    return {
      reply: `¡Claro! Voy a pasarte con un asesor de Movilube ahora mismo. En un momento se contactan contigo. ¿Podés dejarnos tu nombre y el servicio que necesitás para que puedan atenderte mejor?`,
      department: classifyDepartment(body),
      isEscalated: true,
    };
  }

  // Load context
  let prices = [];
  let slots = [];
  try {
    prices = await getPrices();
  } catch (e) { /* fallback handled inside */ }

  const lowerBody = body.toLowerCase();
  const needsCalendar = lowerBody.includes('turno') || lowerBody.includes('reserva') || lowerBody.includes('agendar') || lowerBody.includes('cuando puedo') || lowerBody.includes('disponibilidad');
  if (needsCalendar) {
    try { slots = await getAvailableSlots(); } catch (e) { /* ignore */ }
  }

  // Build system prompt
  const systemPrompt = `Sos ${aiConfig.nombre_ia}, el asistente virtual de ${aiConfig.negocio}.
Respondés siempre en español, de forma amigable, clara y profesional.
Horario de atención: ${aiConfig.horario_atencion}.
Zona de cobertura: ${aiConfig.zona_cobertura}.

SERVICIOS DISPONIBLES:
${aiConfig.servicios.map(s => `- ${s}`).join('\n')}

PRECIOS ACTUALIZADOS:
${formatPricesForAI(prices)}

${slots.length > 0 ? `TURNOS DISPONIBLES PRÓXIMOS:
${slots.map((s, i) => `${i + 1}. ${s.label}`).join('\n')}

Cuando el cliente elija un turno, confirmale la opción y avisale que el equipo de Movilube lo va a confirmar en breve.` : ''}

INSTRUCCIONES:
- Si el cliente pregunta por precios, respondé con los precios del listado de arriba.
- Si el cliente quiere un turno, mostrá los horarios disponibles y pedile que elija uno.
- Si el cliente elige un turno, decile que el equipo lo confirmará en breve por este mismo canal.
- Si el cliente pregunta algo que no sabés (stock específico, zonas, etc.), decile que lo va a contactar un asesor.
- Si el cliente se queja o hace un reclamo, mostrá empatía y ofrecé escalar a un asesor.
- Respondé siempre de forma concisa. Máximo 3-4 oraciones por respuesta.
- NO inventés precios ni información que no tenés.
- NO uses markdown, asteriscos ni formato especial. Solo texto plano.`;

  // Build message history for context
  const messages = [];
  if (conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6); // last 3 exchanges
    for (const h of recent) {
      if (h.role && h.content) messages.push({ role: h.role, content: h.content });
    }
  }
  messages.push({ role: 'user', content: body });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0]?.text || 'Disculpá, hubo un error. Por favor intentá de nuevo.';
    const department = classifyDepartment(body);

    // Detect if AI is proposing a slot (to create pending turno)
    const proposingSlot = needsCalendar && slots.length > 0;

    return { reply, department, isEscalated: false, proposingSlot, slots };
  } catch (e) {
    console.error('[AI] Error al procesar mensaje:', e.message);
    return {
      reply: `¡Hola${fromName ? `, ${fromName}` : ''}! Soy Movi de Movilube. En este momento tengo un problema técnico. Por favor escribinos directamente al WhatsApp o visitá movilube.ar para más info.`,
      department: 'Soporte Técnico',
      isEscalated: false,
    };
  }
}

module.exports = { processMessage, classifyDepartment, isEscalationRequest };
