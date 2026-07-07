/* ────────────────────────────────────────────────────────────────────
 * GroqApi.js (client-side)
 *
 * Thin wrapper that calls the server-side /api/validate-documents
 * endpoint. The Groq API key and prompt-building logic now live in
 * api/_lib/groqPrompt.js and api/validate-documents.js, so the key
 * never reaches the browser bundle.
 * ──────────────────────────────────────────────────────────────────── */

export async function validateDocuments(invoiceText, bolText, packingText, awbText = null) {
  const response = await fetch("/api/validate-documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceText, bolText, packingText, awbText }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Validation API error: ${response.status}`);
  }

  return response.json();
}
