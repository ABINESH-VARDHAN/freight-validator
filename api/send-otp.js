// api/send-otp.js and api/send-email.js
const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { to, subject, text } = req.body;
  if (!to || !subject || !text) return res.status(400).json({ error: "Missing fields" });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Freight Validator" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};