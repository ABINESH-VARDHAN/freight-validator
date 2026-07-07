module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, text } = req.body || {};

  if (!to || !subject || !text) {
    return res.status(400).json({ error: "Missing required fields (to, subject, text)" });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    return res.status(500).json({
      error: "Server email configuration missing (BREVO_API_KEY / BREVO_SENDER_EMAIL not set)",
    });
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Freight Validator", email: senderEmail },
        to: [{ email: to }],
        subject: subject,
        textContent: text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Failed to send email via Brevo",
      });
    }

    return res.status(200).json({ success: true, id: data.messageId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};