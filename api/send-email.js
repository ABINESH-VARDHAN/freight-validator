module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { to, subject, text } = req.body;
  if (!to || !subject || !text) return res.status(400).json({ error: "Missing fields" });

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Freight Validator", email: "freightvalidator.reports@gmail.com" },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      return res.status(response.status).json({ error: data.message });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};