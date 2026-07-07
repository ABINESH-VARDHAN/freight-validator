// api/_lib/groqPrompt.js
//
// Builds the cross-document validation prompt sent to Groq, and parses
// the JSON response it returns. Extracted so validate-documents.js can
// stay a thin request handler.

function buildPrompt(invoiceText, bolText, packingText, awbText = null) {
  const hasAwb = !!awbText?.trim();

  const awbSection = hasAwb ? `
## AIR WAYBILL (AWB):
${awbText.slice(0, 3000)}` : "";

  const awbCriticalFields = hasAwb ? `
- AWB number format (3-digit airline prefix + 8-digit serial, mod-7 check digit)
- AWB shipper name & address vs Invoice shipper & B/L shipper
- AWB consignee name & address vs Invoice consignee & B/L consignee
- AWB origin airport (IATA code) vs Port of Loading on B/L
- AWB destination airport (IATA code) vs Port of Discharge on B/L
- AWB gross weight vs Invoice total weight vs Packing List total weight
- AWB number of pieces vs Invoice quantity vs Packing List quantity
- AWB goods description vs Invoice description vs Packing List description
- AWB HS code vs Invoice HS code
- AWB declared value vs Invoice declared value
- AWB currency vs Invoice currency
- AWB carrier / airline code present and valid (2–3 character IATA code)
- AWB Incoterms vs Invoice Incoterms
- AWB issuing date vs Invoice date (AWB should not predate the invoice)` : "";

  const awbExtractedFields = hasAwb ? `,
    "awbNumber": "",
    "awbOriginAirport": "",
    "awbDestinationAirport": "",
    "awbCarrierCode": "",
    "awbGrossWeight": "",
    "awbPieces": "",
    "awbDeclaredValue": "",
    "awbIssueDate": ""` : "";

  return `You are an expert freight document auditor. Analyze these shipping documents for consistency and compliance issues.

## COMMERCIAL INVOICE:
${invoiceText.slice(0, 3000)}

## BILL OF LADING:
${bolText.slice(0, 3000)}

## PACKING LIST:
${packingText.slice(0, 3000)}
${awbSection}

Perform a thorough cross-document validation checking ALL of the following:

**CRITICAL FIELDS — must match exactly across all present documents:**
- Shipper name & address
- Consignee name & address
- Port of loading / origin
- Port of discharge / destination
- Vessel name & voyage number
- Container number(s)
- Seal number(s)
- Bill of Lading number
- Total gross weight
- Total number of packages/cartons
- Incoterms
${awbCriticalFields}

**IMPORTANT FIELDS — should match:**
- Invoice number (referenced in B/L)
- Description of goods
- HS codes / commodity codes
- Net weight
- Dimensions / measurements
- Marks & numbers
- Country of origin
- Payment terms / Letter of Credit number

**COMPLIANCE CHECKS:**
- Date sequence (invoice date vs B/L date vs packing list date${hasAwb ? " vs AWB date" : ""})
- Weight consistency across all documents
- Quantity consistency across all documents
- Currency and value consistency
- Any missing mandatory fields${hasAwb ? `

**AWB-SPECIFIC CHECKS (AWB document is provided — these are mandatory):**
- AWB number mod-7 check digit validity
- IATA airport codes format (3 uppercase letters)
- Carrier/airline code format (2–3 alphanumeric characters)
- Weight and piece count match across AWB, Invoice, and Packing List
- Declared value and currency match between AWB and Invoice
- Origin/destination consistency: AWB airports vs B/L ports
- Date logic: AWB issue date should be on or after Invoice date` : ""}

Respond ONLY with a valid JSON object in this exact format:
{
  "summary": "One paragraph executive summary of the validation result",
  "issues": [
    {
      "severity": "error|warning|ok",
      "field": "Field name",
      "message": "Detailed description of the issue or confirmation",
      "invoiceValue": "Value found in invoice (or null)",
      "bolValue": "Value found in B/L (or null)",
      "packingValue": "Value found in packing list (or null)",
      "awbValue": "Value found in AWB (or null)"
    }
  ],
  "extractedFields": {
    "shipper": "",
    "consignee": "",
    "portOfLoading": "",
    "portOfDischarge": "",
    "vesselName": "",
    "blNumber": "",
    "totalWeight": "",
    "totalPackages": "",
    "incoterms": "",
    "invoiceNumber": "",
    "countryOfOrigin": ""${awbExtractedFields}
  }
}

Be thorough — aim for ${hasAwb ? "20–30" : "15–25"} issue entries covering all fields. Use "ok" severity for fields that match correctly across all documents. This gives users confidence in what passed.${hasAwb ? " An AWB was provided — make sure every AWB-specific check has its own issue entry." : ""}`;
}

function parseGroqResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      summary: "Validation completed with parsing issues.",
      issues: [{
        severity: "warning",
        field: "Parser",
        message: "Could not fully parse AI response.",
        invoiceValue: null,
        bolValue: null,
        packingValue: null,
        awbValue: null,
      }],
      extractedFields: {},
    };
  }
}

module.exports = { buildPrompt, parseGroqResponse };
