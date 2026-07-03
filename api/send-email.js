module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, text } = req.body;
  if (!to || !subject || !text) return res.status(400).json({ error: "Missing required fields" });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer re_3mpSbU3u_64Da6N5Wto43UwtR53XKAcaR`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Freight Validator <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.message || "Failed to send" });
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};