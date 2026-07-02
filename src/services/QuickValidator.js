function tryPatterns(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = (match[1] ?? match[0] ?? "").toString().trim();
      if (raw) return raw.replace(/\s+/g, " ").slice(0, 80);
    }
  }
  return null;
}

function buildCheck(label, value) {
  return { label, passed: !!value, value: value || null };
}

function finalize(checks) {
  const total = checks.length;
  const passedCount = checks.filter((c) => c.passed).length;
  const score = total > 0 ? Math.round((passedCount / total) * 100) : 0;
  return { ready: total > 0 && passedCount === total, score, checks };
}

/* ── Commercial Invoice ──────────────────────────────────────────── */

export function validateInvoice(text) {
  const t = text || "";

  const invoiceNumber = tryPatterns(t, [
    /invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i,
    /inv\.?\s*(?:no\.?|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i,
  ]);

  const invoiceDate = tryPatterns(t, [
    /invoice\s*date\s*[:\-]?\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
    /invoice\s*date\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /date\s*of\s*invoice\s*[:\-]?\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
  ]);

  const shipperName = tryPatterns(t, [
    /(?:shipper|exporter|seller)\s*[:\-]\s*([A-Za-z0-9&.,'\- ]{3,60})/i,
  ]);

  const shipperAddress = tryPatterns(t, [
    /(?:shipper|exporter|seller)[^\n]{0,40}?address\s*[:\-]?\s*([A-Za-z0-9,.\-#/ ]{8,90})/i,
    /(?:shipper|exporter|seller)\s*[:\-]?\s*[A-Za-z0-9&.,'\- ]{3,60}\n\s*([A-Za-z0-9,.\-#/ ]{8,90})/i,
  ]);

  const consigneeName = tryPatterns(t, [
    /(?:consignee|buyer|importer)\s*[:\-]\s*([A-Za-z0-9&.,'\- ]{3,60})/i,
  ]);

  const consigneeAddress = tryPatterns(t, [
    /(?:consignee|buyer|importer)[^\n]{0,40}?address\s*[:\-]?\s*([A-Za-z0-9,.\-#/ ]{8,90})/i,
    /(?:consignee|buyer|importer)\s*[:\-]?\s*[A-Za-z0-9&.,'\- ]{3,60}\n\s*([A-Za-z0-9,.\-#/ ]{8,90})/i,
  ]);

  const hsCode = tryPatterns(t, [
    /(?:hs\s*code|hts\s*code|harmoni[sz]ed\s*(?:system|tariff)\s*code)\s*[:\-]?\s*(\d{4,10}(?:\.\d{2,4})?)/i,
  ]);

  const totalAmount = tryPatterns(t, [
    /(?:grand\s*total|total\s*amount|total\s*value|invoice\s*total)\s*[:\-]?\s*(?:USD|EUR|GBP|INR|\$|€|£)?\s*([\d,]+\.\d{2}|[\d,]{3,})/i,
    /total\s*[:\-]?\s*(?:USD|EUR|GBP|INR|\$|€|£)\s*([\d,]+\.?\d{0,2})/i,
  ]);

  return finalize([
    buildCheck("Invoice Number", invoiceNumber),
    buildCheck("Invoice Date", invoiceDate),
    buildCheck("Shipper Name", shipperName),
    buildCheck("Shipper Address", shipperAddress),
    buildCheck("Consignee Name", consigneeName),
    buildCheck("Consignee Address", consigneeAddress),
    buildCheck("HS Code", hsCode),
    buildCheck("Total Amount", totalAmount),
  ]);
}

/* ── Bill of Lading (sea / road / rail) ──────────────────────────── */

export function validateBillOfLading(text) {
  const t = text || "";

  const blNumber = tryPatterns(t, [
    /b\/?l\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i,
    /bill\s*of\s*lading\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i,
    /(?:cmr|consignment)\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i,
  ]);

  const vesselName = tryPatterns(t, [
    /vessel\s*(?:name)?\s*[:\-]\s*([A-Za-z0-9&.,'\- ]{2,50})/i,
  ]);

  const voyageNumber = tryPatterns(t, [
    /voyage\s*(?:no\.?|number|#)?\s*[:\-]\s*([A-Z0-9\-/]{2,20})/i,
  ]);

  const portOfLoading = tryPatterns(t, [
    /port\s*of\s*loading\s*[:\-]\s*([A-Za-z0-9,.\-/ ]{2,60})/i,
  ]);

  const portOfDischarge = tryPatterns(t, [
    /port\s*of\s*discharge\s*[:\-]\s*([A-Za-z0-9,.\-/ ]{2,60})/i,
  ]);

  const shipper = tryPatterns(t, [
    /(?:shipper|exporter)\s*[:\-]\s*([A-Za-z0-9&.,'\- ]{3,60})/i,
  ]);

  const consignee = tryPatterns(t, [
    /consignee\s*[:\-]\s*([A-Za-z0-9&.,'\- ]{3,60})/i,
  ]);

  return finalize([
    buildCheck("Bill of Lading Number", blNumber),
    buildCheck("Vessel Name", vesselName),
    buildCheck("Voyage Number", voyageNumber),
    buildCheck("Port of Loading", portOfLoading),
    buildCheck("Port of Discharge", portOfDischarge),
    buildCheck("Shipper", shipper),
    buildCheck("Consignee", consignee),
  ]);
}

/* ── Air Waybill (AWB) ───────────────────────────────────────────── */

export function validateAwb(text) {
  const t = text || "";

  const awbNumber = tryPatterns(t, [
    /awb\s*(?:no\.?|number|#)\s*[:\-]?\s*(\d{3}[\-\s]?\d{8})/i,
    /air\s*waybill\s*(?:no\.?|number|#)?\s*[:\-]?\s*(\d{3}[\-\s]?\d{8})/i,
  ]);

  const airline = tryPatterns(t, [
    /(?:airline|carrier)\s*(?:name)?\s*[:\-]\s*([A-Za-z0-9&.,'\- ]{2,50})/i,
  ]);

  const originAirport = tryPatterns(t, [
    /airport\s*of\s*departure\s*[:\-]\s*([A-Za-z0-9,.\-/ ]{2,50})/i,
    /(?:origin|departure)\s*airport\s*[:\-]\s*([A-Za-z0-9,.\-/ ]{2,50})/i,
  ]);

  const destinationAirport = tryPatterns(t, [
    /airport\s*of\s*destination\s*[:\-]\s*([A-Za-z0-9,.\-/ ]{2,50})/i,
    /destination\s*airport\s*[:\-]\s*([A-Za-z0-9,.\-/ ]{2,50})/i,
  ]);

  const flightDetails = tryPatterns(t, [
    /flight\s*(?:no\.?|number|#|details)\s*[:\-]\s*([A-Za-z0-9,.\-/ ]{2,50})/i,
  ]);

  return finalize([
    buildCheck("AWB Number", awbNumber),
    buildCheck("Airline", airline),
    buildCheck("Origin Airport", originAirport),
    buildCheck("Destination Airport", destinationAirport),
    buildCheck("Flight Details", flightDetails),
  ]);
}

/* ── Packing List ─────────────────────────────────────────────────── */

export function validatePackingList(text) {
  const t = text || "";

  const packageCount = tryPatterns(t, [
    /(?:total\s*)?(?:no\.?\s*of\s*)?(?:packages|cartons|pallets|pieces)\s*[:\-]\s*([\d,]+)/i,
    /package\s*count\s*[:\-]\s*([\d,]+)/i,
  ]);

  const grossWeight = tryPatterns(t, [
    /gross\s*weight\s*[:\-]?\s*([\d,]+\.?\d*\s?(?:kg|kgs|lbs|lb|mt)?)/i,
  ]);

  const netWeight = tryPatterns(t, [
    /net\s*weight\s*[:\-]?\s*([\d,]+\.?\d*\s?(?:kg|kgs|lbs|lb|mt)?)/i,
  ]);

  const descriptionOfGoods = tryPatterns(t, [
    /description\s*of\s*goods\s*[:\-]\s*([A-Za-z0-9,.\-/&' ]{4,80})/i,
    /goods\s*description\s*[:\-]\s*([A-Za-z0-9,.\-/&' ]{4,80})/i,
  ]);

  return finalize([
    buildCheck("Package Count", packageCount),
    buildCheck("Gross Weight", grossWeight),
    buildCheck("Net Weight", netWeight),
    buildCheck("Description of Goods", descriptionOfGoods),
  ]);
}