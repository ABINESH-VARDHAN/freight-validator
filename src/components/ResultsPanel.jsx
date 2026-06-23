export default function ResultsPanel({ results }) {
  if (!results) return null;

  const severityIcon  = { error: "🔴", warning: "🟡", ok: "🟢" };
  const severityOrder = { error: 0, warning: 1, ok: 2 };

  const sorted = [...(results.issues || [])].sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  const hasExtracted = results.extractedFields &&
    Object.values(results.extractedFields).some(Boolean);

  const hasAwbFields = results.extractedFields && (
    results.extractedFields.awbNumber ||
    results.extractedFields.awbOriginAirport ||
    results.extractedFields.awbCarrierCode
  );

  const coreFields = [
    "shipper","consignee","portOfLoading","portOfDischarge",
    "vesselName","blNumber","totalWeight","totalPackages",
    "incoterms","invoiceNumber","countryOfOrigin",
  ];

  const awbFields = [
    "awbNumber","awbOriginAirport","awbDestinationAirport",
    "awbCarrierCode","awbGrossWeight","awbPieces",
    "awbDeclaredValue","awbIssueDate",
  ];

  const formatFieldLabel = (key) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Extracted fields ── */}
      {hasExtracted && (
        <div className="comparison-card">
          <div className="comparison-header">📋 Extracted Document Fields</div>
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Extracted Value</th>
                </tr>
              </thead>
              <tbody>
                {/* Core fields */}
                {coreFields.map(key =>
                  results.extractedFields[key] ? (
                    <tr key={key} className="cmp-row">
                      <td className="cmp-field">{formatFieldLabel(key)}</td>
                      <td>{results.extractedFields[key]}</td>
                    </tr>
                  ) : null
                )}

                {/* AWB fields — grouped with a divider row */}
                {hasAwbFields && (
                  <tr>
                    <td colSpan={2} style={{
                      padding: "8px 14px",
                      background: "var(--surface2)",
                      fontSize: "0.7rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      color: "var(--text-muted)",
                    }}>
                      ✈ Air Waybill fields
                    </td>
                  </tr>
                )}
                {hasAwbFields && awbFields.map(key =>
                  results.extractedFields[key] ? (
                    <tr key={key} className="cmp-row">
                      <td className="cmp-field">{formatFieldLabel(key)}</td>
                      <td>{results.extractedFields[key]}</td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Issues panel ── */}
      <div className="issues-panel">
        <div className="issues-header">
          <span>All Issues</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--error)",    fontWeight: 700 }}>
              🔴 {sorted.filter(i => i.severity === "error").length} errors
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--warning)",  fontWeight: 700 }}>
              🟡 {sorted.filter(i => i.severity === "warning").length} warnings
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--ok)",       fontWeight: 700 }}>
              🟢 {sorted.filter(i => i.severity === "ok").length} passed
            </span>
          </div>
        </div>

        <div className="issues-list">
          {sorted.length === 0 ? (
            <div className="detail-clean">✅ All checks passed — no issues found</div>
          ) : (
            sorted.map((issue, i) => (
              <div key={i} className={`issue-card ${issue.severity || "ok"}`}>
                <span className="issue-icon">{severityIcon[issue.severity] || "⚪"}</span>
                <div className="issue-body" style={{ flex: 1 }}>
                  <strong>{issue.field}</strong>
                  <p>{issue.message}</p>
                  {(issue.invoiceValue || issue.bolValue || issue.packingValue || issue.awbValue) && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      {issue.invoiceValue && (
                        <span style={{
                          fontSize: "0.72rem", background: "var(--surface2)",
                          border: "1px solid var(--border)", borderRadius: 6,
                          padding: "2px 8px", color: "var(--text-muted)",
                        }}>
                          INV: {issue.invoiceValue}
                        </span>
                      )}
                      {issue.bolValue && (
                        <span style={{
                          fontSize: "0.72rem", background: "var(--surface2)",
                          border: "1px solid var(--border)", borderRadius: 6,
                          padding: "2px 8px", color: "var(--text-muted)",
                        }}>
                          B/L: {issue.bolValue}
                        </span>
                      )}
                      {issue.packingValue && (
                        <span style={{
                          fontSize: "0.72rem", background: "var(--surface2)",
                          border: "1px solid var(--border)", borderRadius: 6,
                          padding: "2px 8px", color: "var(--text-muted)",
                        }}>
                          PKG: {issue.packingValue}
                        </span>
                      )}
                      {issue.awbValue && (
                        <span style={{
                          fontSize: "0.72rem",
                          background: "var(--blue-pale)",
                          border: "1px solid var(--blue-light)",
                          borderRadius: 6, padding: "2px 8px",
                          color: "var(--blue-mid)", fontWeight: 600,
                        }}>
                          AWB: {issue.awbValue}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}