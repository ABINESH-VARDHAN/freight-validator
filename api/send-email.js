module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { to, subject, message } = req.body;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender:   { name: "Freight Validator", email: "freightvalidator.reports@gmail.com" },
        to:       [{ email: to }],
        subject:  subject,
        textContent: message,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(400).json({ error: err.message });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};