const { buildPrompt, parseGroqResponse } = require("./_lib/groqPrompt");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { invoiceText, bolText, packingText, awbText } = req.body || {};

  if (!invoiceText || !bolText || !packingText) {
    return res.status(400).json({ error: "invoiceText, bolText, and packingText are required" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server AI configuration missing (GROQ_API_KEY not set)" });
  }

  const prompt = buildPrompt(invoiceText, bolText, packingText, awbText || null);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Groq API error: ${response.status}` });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    const result = parseGroqResponse(text);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
