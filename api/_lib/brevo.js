/* ────────────────────────────────────────────────────────────────────
 * _lib/brevo.js
 *
 * Shared helper for sending transactional email via the Brevo API.
 * Used by both api/send-otp.js and api/send-email.js so the request
 * building / error handling only lives in one place.
 *
 * Required environment variables (set in Vercel project settings,
 * NOT prefixed with REACT_APP_ so they never reach the browser):
 *   BREVO_API_KEY
 *   BREVO_SENDER_EMAIL
 *   BREVO_SENDER_NAME   (optional, defaults to "Freight Validator")
 * ──────────────────────────────────────────────────────────────────── */

async function sendBrevoEmail({ to, subject, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Freight Validator";

  if (!apiKey || !senderEmail) {
    return {
      ok: false,
      status: 500,
      error: "Server email configuration missing (BREVO_API_KEY / BREVO_SENDER_EMAIL not set)",
    };
  }

  if (!to || !subject || !text) {
    return { ok: false, status: 400, error: "Missing required fields (to, subject, text)" };
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
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, status: response.status, error: data.message || "Failed to send email via Brevo" };
    }

    return { ok: true, status: 200, id: data.messageId };
  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}

module.exports = { sendBrevoEmail };
