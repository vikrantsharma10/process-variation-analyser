// api/analyse.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userPrompt } = req.body; // matches what engine.js sends

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();

    // engine.js expects data.text — extract it from Anthropic's response
    const text = data.content?.[0]?.text ?? '';
    return res.status(200).json({ text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
