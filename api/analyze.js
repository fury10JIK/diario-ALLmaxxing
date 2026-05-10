export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, mealType } = req.body;
  if (!text) return res.status(400).json({ error: 'Testo mancante' });

  const systemPrompt = `Sei un nutrizionista esperto. L'utente descrive cosa ha mangiato senza quantità precise.
Stima le quantità realistiche in base alle descrizioni (es. "un cucchiaio" = 10-15g, "una fetta di pane" = 40-50g, "un piatto di pasta" = 80g secchi, "una tazza" = 200ml).
Rispondi SOLO con un JSON valido, nessun testo prima o dopo, con questa struttura:
{
  "items": [
    {
      "name": "nome alimento",
      "quantity_desc": "stima quantità",
      "g": 100,
      "kcal": 0,
      "prot": 0,
      "carb": 0,
      "fat": 0,
      "vitC": 0,
      "vitD": 0,
      "vitB12": 0,
      "ferro": 0,
      "calcio": 0,
      "magnesio": 0,
      "zinco": 0,
      "potassio": 0
    }
  ],
  "totals": { "kcal": 0, "prot": 0, "carb": 0, "fat": 0 },
  "note": "breve commento nutrizionale per un ragazzo di 62kg in crescita"
}
Tutti i valori sono per la quantità stimata. Sii preciso e realistico.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Pasto (${mealType}): "${text}"` }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
