import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { validateDocuments } from "./services/GroqApi";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./auth/LoginPage";
import ResultsPanel from "./components/ResultsPanel";
import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const RESEND_API_KEY = "re_3mpSbU3u_64Da6N5Wto43UwtR53XKAcaR";
/* ─── PDF text extraction ─────────────────────────────────────────── */
async function extractTextFromPDF(file) {
  if (!file) return "";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((i) => i.str).join(" ") + "\n";
  }
  const cleaned = fullText.trim();
  if (!cleaned || cleaned.length < 50) {
    throw new Error(`SCANNED_PDF:${file.name}`);
  }
  return cleaned;
}

/* ─── Scanned PDF pre-check (runs on upload, checks first 2 pages) ── */
async function checkIfScanned(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((i) => i.str).join(" ");
    }
    return text.trim().length < 50;
  } catch {
    return false;
  }
}

/* ─── Transport mode config ───────────────────────────────────────── */
const MODES = {
  sea: {
    label: "Sea Freight",
    icon: "🚢",
    docs: [
      { key: "invoice",      label: "Commercial Invoice" },
      { key: "billOfLading", label: "Bill of Lading" },
      { key: "packingList",  label: "Packing List" },
    ],
  },
  air: {
    label: "Air Freight",
    icon: "✈️",
    docs: [
      { key: "invoice",      label: "Commercial Invoice" },
      { key: "billOfLading", label: "Air Waybill (AWB)" },
      { key: "packingList",  label: "Packing List" },
    ],
  },
  road: {
    label: "Road Freight",
    icon: "🚚",
    docs: [
      { key: "invoice",      label: "Commercial Invoice" },
      { key: "billOfLading", label: "CMR Waybill" },
      { key: "packingList",  label: "Packing List" },
    ],
  },
  rail: {
    label: "Rail Freight",
    icon: "🚂",
    docs: [
      { key: "invoice",      label: "Commercial Invoice" },
      { key: "billOfLading", label: "Rail Consignment Note" },
      { key: "packingList",  label: "Packing List" },
    ],
  },
  multi: {
    label: "Multimode",
    icon: "🔀",
    legs: [
      {
        id: "sea",
        badge: "sea",
        label: "Sea leg",
        sub: "Origin port → Destination port",
        docs: [
          { key: "seaBol",      label: "Bill of Lading" },
          { key: "packingList", label: "Packing List" },
          { key: "seaInvoice",  label: "Sea Freight Invoice" },
        ],
      },
      {
        id: "road",
        badge: "road",
        label: "Road leg",
        sub: "Port → Inland warehouse",
        docs: [
          { key: "cmr",         label: "CMR / Truck Waybill" },
          { key: "roadInvoice", label: "Road Freight Invoice" },
        ],
      },
      {
        id: "common",
        badge: "common",
        label: "Common docs",
        sub: "Applies to all legs",
        docs: [
          { key: "invoice",   label: "Commercial Invoice" },
          { key: "origin",    label: "Certificate of Origin" },
          { key: "insurance", label: "Insurance Certificate" },
        ],
      },
    ],
  },
};

/* ─── Inline UploadSection ────────────────────────────────────────── */
function DropZone({ label, file, onFile }) {
  const [dragging, setDragging] = useState(false);
  const id = `dz-${label.replace(/\s+/g, "-")}`;
  return (
    <label
      htmlFor={id}
      className={`drop-zone ${file ? "has-file" : ""} ${dragging ? "dragging" : ""}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <input id={id} type="file" accept=".pdf" style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files[0];
          if (!f) return;
          checkIfScanned(f).then(isScanned => {
            if (isScanned) {
              alert(`⚠️ "${f.name}" looks like a scanned PDF with no readable text.\n\nRun it through an OCR tool first (e.g. Adobe Acrobat, Smallpdf, or ILovePDF), then re-upload.`);
            }
            onFile(f);
          });
        }} />
      <span className="dz-icon">{file ? "✅" : "📄"}</span>
      <span className="dz-label">{label}</span>
      {file
        ? <span className="dz-filename">{file.name}</span>
        : <span className="dz-hint">Drag & drop or <span>browse</span></span>}
    </label>
  );
}

function LegHeader({ badge, label, sub }) {
  return (
    <div className="leg-header">
      <span className={`leg-badge ${badge}`}>{label}</span>
      <span className="leg-label">{sub}</span>
      <span className="leg-connector" />
    </div>
  );
}

function UploadSection({ files, onFile, transportMode, onModeChange }) {
  const modeKeys = ["sea", "air", "road", "rail", "multi"];

  const gridClass = (count) =>
    count === 2 ? "drop-grid drop-grid-2"
    : count === 4 ? "drop-grid drop-grid-4"
    : "drop-grid";

  return (
    <div className="upload-section">
      <div className="section-header">
        Upload Documents
        <span className="section-sub">PDF format only · Upload all required docs</span>
      </div>

      {/* ── Transport mode toggle ── */}
      <div className="transport-toggle">
        <span className="toggle-label">Transport mode</span>
        <div className="toggle-group">
          {modeKeys.map(key => (
            <button
              key={key}
              className={`toggle-btn ${
                transportMode === key
                  ? key === "multi" ? "active-multi" : "active"
                  : ""
              }`}
              onClick={() => onModeChange(key)}
            >
              {MODES[key].icon} {MODES[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Single-mode drop zones ── */}
      {transportMode !== "multi" && (
        <div className={gridClass(MODES[transportMode].docs.length)}>
          {MODES[transportMode].docs.map(({ key, label }) => (
            <DropZone key={key} label={label} file={files[key]} onFile={f => onFile(key, f)} />
          ))}
        </div>
      )}

      {/* ── Multimode: leg-by-leg layout ── */}
      {transportMode === "multi" && (
        <>
          {MODES.multi.legs.map(leg => (
            <div key={leg.id}>
              <LegHeader badge={leg.badge} label={leg.label} sub={leg.sub} />
              <div className={gridClass(leg.docs.length)}>
                {leg.docs.map(({ key, label }) => (
                  <DropZone key={key} label={label} file={files[key]} onFile={f => onFile(key, f)} />
                ))}
              </div>
            </div>
          ))}
          <div className="multimode-note">
            <span className="multimode-note-icon">ℹ️</span>
            <span>Each transport leg is validated separately. Documents for all legs must be uploaded before running validation.</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Helpers: upload count ───────────────────────────────────────── */
function requiredKeys(mode) {
  if (mode === "multi") {
    return MODES.multi.legs.flatMap(l => l.docs.map(d => d.key));
  }
  return MODES[mode].docs.map(d => d.key);
}

function uploadedCount(files, mode) {
  return requiredKeys(mode).filter(k => Boolean(files[k])).length;
}

function requiredCount(mode) {
  return requiredKeys(mode).length;
}

function fileNameList(files, mode) {
  if (mode === "multi") {
    return MODES.multi.legs.flatMap(l =>
      l.docs.map(d => files[d.key]?.name || d.label)
    );
  }
  return MODES[mode].docs.map(d => files[d.key]?.name || d.label);
}

/* ─── Export helpers ──────────────────────────────────────────────── */
function exportReportAsHTML(results, confidence, fileNames) {
  const date     = new Date().toLocaleString();
  const errors   = results.issues?.filter(i => i.severity === "error")   || [];
  const warnings = results.issues?.filter(i => i.severity === "warning") || [];
  const passed   = results.issues?.filter(i => i.severity === "ok")      || [];
  const sColor = { error: "#dc2626", warning: "#d97706", ok: "#16a34a" };
  const sBg    = { error: "#fff5f5", warning: "#fffbeb", ok: "#f0fdf4" };
  const sIcon  = { error: "🔴", warning: "🟡", ok: "🟢" };
  const confColor = confidence >= 80 ? "#16a34a" : confidence >= 50 ? "#d97706" : "#dc2626";

  const issueRows = (results.issues || []).map(issue => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 16px;border-radius:8px;
      border-left:4px solid ${sColor[issue.severity]};background:${sBg[issue.severity]};margin-bottom:8px;">
      <span>${sIcon[issue.severity]}</span>
      <div>
        <strong style="display:block;font-size:0.88rem;color:#0d1f3c;margin-bottom:2px;">${issue.field}</strong>
        <span style="font-size:0.82rem;color:#5a6f8a;">${issue.message}</span>
      </div>
    </div>`).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Freight Validation Report</title>
<style>
  * { box-sizing:border-box;margin:0;padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif;background:#f0f4fb;color:#0d1f3c;padding:40px 24px; }
  .page { max-width:800px;margin:0 auto; }
  .header { background:linear-gradient(135deg,#0a3d8f,#2d7dd2);border-radius:16px;padding:32px;margin-bottom:24px;color:white;display:flex;justify-content:space-between;align-items:center; }
  .header h1 { font-size:1.6rem;font-weight:800;margin-bottom:4px; }
  .header p  { font-size:0.85rem;opacity:0.75; }
  .header-right { text-align:right;font-size:0.82rem;opacity:0.8;line-height:1.7; }
  .card { background:white;border:1px solid #dce6f5;border-radius:16px;padding:24px;margin-bottom:20px; }
  .card-title { font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#5a6f8a;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #dce6f5; }
  .score-row { display:flex;align-items:center;gap:32px;flex-wrap:wrap; }
  .ring-wrap { position:relative;width:100px;height:100px;flex-shrink:0; }
  .ring-wrap svg { width:100px;height:100px; }
  .ring-num { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;color:${confColor}; }
  .stat-boxes { display:flex;gap:12px;flex:1;flex-wrap:wrap; }
  .stat-box { flex:1;min-width:80px;padding:14px;border-radius:12px;text-align:center; }
  .stat-num { font-size:1.8rem;font-weight:800;line-height:1; }
  .stat-lbl { font-size:0.68rem;font-weight:600;text-transform:uppercase;color:#5a6f8a;margin-top:4px; }
  .stat-box.err { background:#fff5f5; } .stat-box.err .stat-num { color:#dc2626; }
  .stat-box.wrn { background:#fffbeb; } .stat-box.wrn .stat-num { color:#d97706; }
  .stat-box.ok  { background:#f0fdf4; } .stat-box.ok  .stat-num { color:#16a34a; }
  .summary-box { background:#f5f8ff;border-left:3px solid #2d7dd2;border-radius:8px;padding:14px 16px;font-size:0.9rem;line-height:1.6; }
  .files-row { display:flex;gap:10px;flex-wrap:wrap; }
  .file-tag { display:flex;align-items:center;gap:8px;background:#f5f8ff;border:1px solid #dce6f5;border-radius:8px;padding:8px 14px;font-size:0.82rem;font-weight:500; }
  .footer { text-align:center;font-size:0.75rem;color:#5a6f8a;margin-top:32px;padding-top:20px;border-top:1px solid #dce6f5; }
</style></head><body><div class="page">
  <div class="header">
    <div><h1>🚢 Freight Validator</h1><p>AI-Powered Document Validation Report</p></div>
    <div class="header-right"><div><strong>Report Date</strong></div><div>${date}</div></div>
  </div>
  <div class="card">
    <div class="card-title">Validation Score</div>
    <div class="score-row">
      <div class="ring-wrap">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#dce6f5" stroke-width="10"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="${confColor}" stroke-width="10"
            stroke-linecap="round" stroke-dasharray="${((confidence||0)/100)*251} 251" transform="rotate(-90 50 50)"/>
        </svg>
        <div class="ring-num">${confidence ?? "—"}%</div>
      </div>
      <div class="stat-boxes">
        <div class="stat-box err"><div class="stat-num">${errors.length}</div><div class="stat-lbl">Errors</div></div>
        <div class="stat-box wrn"><div class="stat-num">${warnings.length}</div><div class="stat-lbl">Warnings</div></div>
        <div class="stat-box ok"><div class="stat-num">${passed.length}</div><div class="stat-lbl">Passed</div></div>
      </div>
    </div>
  </div>
  <div class="card"><div class="card-title">Summary</div><div class="summary-box">${results.summary}</div></div>
  <div class="card">
    <div class="card-title">Documents Validated</div>
    <div class="files-row">
      ${(fileNames||[]).map(f=>`<div class="file-tag">📄 ${f}</div>`).join("")}
    </div>
  </div>
  <div class="card">
    <div class="card-title">All Findings (${(results.issues||[]).length} total)</div>
    ${issueRows || '<p style="color:#5a6f8a;font-size:0.88rem;">No issues found.</p>'}
  </div>
  <div class="footer">Generated by <strong>Freight Validator AI</strong> · ${date}</div>
</div></body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `freight-validation-report-${Date.now()}.html`;
  a.click();
}

function exportReportAsCSV(results) {
  const rows = [["Severity","Field","Message"], ...(results.issues||[]).map(i=>[i.severity,i.field,`"${i.message}"`])];
  const blob = new Blob([rows.map(r=>r.join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `freight-validation-${Date.now()}.csv`;
  a.click();
}

function buildEmailBody(results, confidence, fileNames) {
  const errors   = results.issues?.filter(i => i.severity === "error")   || [];
  const warnings = results.issues?.filter(i => i.severity === "warning") || [];
  const passed   = results.issues?.filter(i => i.severity === "ok")      || [];
  const lines = [
    "FREIGHT DOCUMENT VALIDATION REPORT","===================================","",
    `Date: ${new Date().toLocaleString()}`,
    `Confidence Score: ${confidence ?? "—"}%`,
    `Result: ${errors.length} Errors · ${warnings.length} Warnings · ${passed.length} Passed`,
    "","DOCUMENTS VALIDATED","-------------------",
    ...(fileNames||[]).map(f=>`  • ${f}`),"",
    "SUMMARY","-------",results.summary,"",
  ];
  if (errors.length)   { lines.push("ERRORS","------");   errors.forEach((e,n)=>lines.push(`${n+1}. ${e.field}: ${e.message}`));   lines.push(""); }
  if (warnings.length) { lines.push("WARNINGS","--------"); warnings.forEach((e,n)=>lines.push(`${n+1}. ${e.field}: ${e.message}`)); lines.push(""); }
  if (passed.length)   { lines.push("PASSED CHECKS","-------------"); passed.forEach((e,n)=>lines.push(`${n+1}. ${e.field}: ${e.message}`)); lines.push(""); }
  lines.push("---","Generated by Freight Validator AI");
  return lines.join("\n");
}

/* ─── Email Modal ─────────────────────────────────────────────────── */
function EmailModal({ results, confidence, fileNames, onClose }) {
  const [to, setTo]           = useState("");
  const [subject, setSubject] = useState("Freight Document Validation Report");
  const [message, setMessage] = useState("");
  const [tab, setTab]         = useState("compose");
  const [sent, setSent]       = useState(false);
  const autoBody = buildEmailBody(results, confidence, fileNames);
  const errors   = results?.issues?.filter(i => i.severity === "error")   || [];
  const warnings = results?.issues?.filter(i => i.severity === "warning") || [];
  const passed   = results?.issues?.filter(i => i.severity === "ok")      || [];
  const statusColor = errors.length > 0 ? "#dc2626" : warnings.length > 0 ? "#d97706" : "#16a34a";
  const statusText  = errors.length > 0 ? `${errors.length} error(s) found` : warnings.length > 0 ? `${warnings.length} warning(s)` : "All checks passed";

  const handleSend = async () => {
    if (!to.includes("@")) { alert("Enter a valid email address."); return; }
    setSent("sending");

try {
  const body = message ? message + "\n\n---\n\n" + autoBody : autoBody;

  const res = await fetch("/api/send-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ to, subject, text: body }),
});

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.message || "Failed to send email");
  }

  setSent("done");
  setTimeout(onClose, 2500);
  } catch (err) {
  console.error("Resend error:", err);
  alert("Failed to send: " + err.message);
  setSent(false);
  }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="email-modal" onClick={e => e.stopPropagation()}>
        <div className="email-modal-header">
          <div className="email-modal-title">✉️ Email Validation Report</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {sent === "done" ? (
          <div className="email-sent-state">
            <div className="sent-icon">✅</div>
            <div className="sent-title">Email sent successfully!</div>
            <div className="sent-sub">The validation report has been delivered to {to}.</div>
          </div>
        ) : (
          <>
            <div className="email-report-strip">
              <div className="strip-item"><span className="strip-label">Score</span><span className="strip-value" style={{color:statusColor}}>{confidence ?? "—"}%</span></div>
              <div className="strip-divider"/>
              <div className="strip-item"><span className="strip-label">Status</span><span className="strip-value" style={{color:statusColor}}>{statusText}</span></div>
              <div className="strip-divider"/>
              <div className="strip-item">
                <span className="strip-label">Findings</span>
                <span className="strip-value">
                  {errors.length > 0   && <span className="mini-badge error">🔴 {errors.length}</span>}
                  {warnings.length > 0 && <span className="mini-badge warning">🟡 {warnings.length}</span>}
                  {passed.length > 0   && <span className="mini-badge ok">🟢 {passed.length}</span>}
                </span>
              </div>
            </div>
            <div className="email-tabs">
              <button className={`email-tab ${tab==="compose"?"active":""}`} onClick={()=>setTab("compose")}>✏️ Compose</button>
              <button className={`email-tab ${tab==="preview"?"active":""}`} onClick={()=>setTab("preview")}>👁 Preview</button>
            </div>
            {tab === "compose" && (
              <div className="email-compose">
                <div className="email-field">
                  <label className="email-label">To</label>
                  <input className="email-input" type="email" placeholder="recipient@company.com" value={to} onChange={e=>setTo(e.target.value)}/>
                </div>
                <div className="email-field">
                  <label className="email-label">Subject</label>
                  <input className="email-input" type="text" value={subject} onChange={e=>setSubject(e.target.value)}/>
                </div>
                <div className="email-field">
                  <label className="email-label">Personal message <span className="optional">(optional)</span></label>
                  <textarea className="email-textarea" placeholder="Add a note before the report…" rows={3} value={message} onChange={e=>setMessage(e.target.value)}/>
                </div>
                <div className="email-attach-note">📎 The full validation report will be included automatically in the email body.</div>
              </div>
            )}
            {tab === "preview" && (
              <div className="email-preview">
                <div className="preview-meta">
                  <div><span className="preview-label">To:</span> {to || <em>not set</em>}</div>
                  <div><span className="preview-label">Subject:</span> {subject}</div>
                </div>
                <pre className="preview-body">{message ? message + "\n\n---\n\n" + autoBody : autoBody}</pre>
              </div>
            )}
            <div className="email-modal-footer">
              <button className="ghost-btn" onClick={onClose}>Cancel</button>
              <div className="email-footer-right">
                <button className="action-btn" onClick={() => exportReportAsHTML(results, confidence, fileNames)}>↓ Download Report</button>
                <button
                  className="validate-btn"
                  onClick={handleSend}
                  disabled={!to || sent === "sending"}
                >
                  {sent === "sending"
                    ? <><span className="spinner"/> Sending…</>
                    : "✉ Send Report"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── History Card ────────────────────────────────────────────────── */
function HistoryCard({ entry, index, total }) {
  const [open, setOpen] = useState(false);
  const modeIcon = { sea:"🚢", air:"✈️", road:"🚚", rail:"🚂", multi:"🔀" }[entry.mode] || "📦";
  return (
    <div className={`history-card ${open?"expanded":""}`}>
      <div className="history-card-header" onClick={()=>setOpen(!open)}>
        <div className="history-index">#{total-index}</div>
        <div className="history-info">
          <div className="history-date">{entry.date} · {modeIcon} {entry.mode ? MODES[entry.mode]?.label : "Sea Freight"}</div>
          <div className="history-summary">{entry.summary}</div>
        </div>
        <div className="history-right">
          <div className="history-badges">
            {entry.errors   > 0 && <span className="badge error">🔴 {entry.errors} error{entry.errors>1?"s":""}</span>}
            {entry.warnings > 0 && <span className="badge warning">🟡 {entry.warnings} warning{entry.warnings>1?"s":""}</span>}
            {entry.ok       > 0 && <span className="badge ok">🟢 {entry.ok} passed</span>}
          </div>
          <span className="history-chevron">{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && (
        <div className="history-detail">
          <div className="detail-section">
            <div className="detail-section-title">📁 Documents Validated</div>
            <div className="detail-docs">
              {(entry.files||[]).map((f,i)=>(
                <div key={i} className="detail-doc-tag"><span className="doc-icon">📄</span><span>{f}</span></div>
              ))}
            </div>
          </div>
          {entry.issues && entry.issues.length > 0 ? (
            <div className="detail-section">
              <div className="detail-section-title">⚠️ Issues Found</div>
              <div className="detail-issues">
                {entry.issues.map((issue,i)=>(
                  <div key={i} className={`detail-issue ${issue.severity}`}>
                    <span className="detail-issue-icon">{issue.severity==="error"?"🔴":issue.severity==="warning"?"🟡":"🟢"}</span>
                    <div className="detail-issue-body"><strong>{issue.field}</strong><p>{issue.message}</p></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="detail-section"><div className="detail-clean">✅ All checks passed — no issues found</div></div>
          )}
          {entry.confidence != null && (
            <div className="detail-section">
              <div className="detail-section-title">📊 Confidence Score</div>
              <div className="detail-confidence">
                <div className="detail-conf-bar-wrap"><div className="detail-conf-bar" style={{width:`${entry.confidence}%`}}/></div>
                <span className="detail-conf-num">{entry.confidence}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────── */
function Dashboard() {
  const { user, logout } = useAuth();

  const historyKey = `fv_history_${user.id}`;

  const [files, setFiles]                   = useState({});
  const [transportMode, setTransportMode]   = useState("sea");
  const [loading, setLoading]               = useState(false);
  const [results, setResults]               = useState(null);
  const [activeTab, setActiveTab]           = useState("validate");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [fileNames, setFileNames]           = useState([]);
  const [batchSets, setBatchSets]           = useState([]);
  const [batchLoading, setBatchLoading]     = useState(false);
  const [sidebarOpen, setSidebarOpen]       = useState(false);

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(historyKey) || "[]"); } catch { return []; }
  });

  const [theme, setTheme] = useState(() => {
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", sys);
    return sys;
  });

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleFile = (key, file) => setFiles(prev => ({ ...prev, [key]: file }));

  const handleModeChange = (mode) => {
    setTransportMode(mode);
    setFiles({});
  };

  const uploaded = uploadedCount(files, transportMode);
  const required = requiredCount(transportMode);
  const modeIcon = MODES[transportMode].icon;

  const handleValidate = async () => {
    if (uploaded < required) { alert(`Please upload all ${required} documents.`); return; }
    setLoading(true); setResults(null);

    try {
      let invoiceText = "", bolText = "", packingText = "", awbText = null;

      if (transportMode === "multi") {
        invoiceText  = await extractTextFromPDF(files.invoice);
        bolText      = await extractTextFromPDF(files.seaBol);
        packingText  = await extractTextFromPDF(files.packingList);
      } else {
        invoiceText  = await extractTextFromPDF(files.invoice);
        bolText      = await extractTextFromPDF(files.billOfLading);
        packingText  = await extractTextFromPDF(files.packingList);
        if (transportMode === "air") awbText = bolText;
      }

      const names = fileNameList(files, transportMode);
      setFileNames(names);

      const res = await validateDocuments(invoiceText, bolText, packingText, awbText);
      setResults(res);

      const errCount  = res.issues?.filter(i => i.severity === "error").length   || 0;
      const warnCount = res.issues?.filter(i => i.severity === "warning").length || 0;
      const okCount   = res.issues?.filter(i => i.severity === "ok").length      || 0;
      const tot  = errCount + warnCount + okCount;
      const conf = tot > 0 ? Math.round((okCount / tot) * 100) : 100;

      const entry = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        summary: res.summary,
        errors: errCount, warnings: warnCount, ok: okCount,
        confidence: conf,
        issues: res.issues || [],
        files: names,
        mode: transportMode,
      };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem(historyKey, JSON.stringify(updated));
      setActiveTab("results");
    } catch (err) {
      console.error(err);
      const isScanned = err.message?.startsWith("SCANNED_PDF:");
      const fileName  = isScanned ? err.message.split(":")[1] : null;
      setResults({
        summary: isScanned
          ? `"${fileName}" appears to be a scanned document with no extractable text. Please upload a digital (text-based) PDF.`
          : "Could not validate. Please upload valid freight documents.",
        issues: [{
          severity: "error",
          field: isScanned ? "Scanned PDF Detected" : "Document Type",
          message: isScanned
            ? `"${fileName}" is an image-based PDF. Run it through an OCR tool (e.g. Adobe Acrobat, Smallpdf, or ILovePDF) to make the text extractable, then re-upload.`
            : "Please upload valid freight documents.",
        }],
      });
      setActiveTab("results");
    }
    setLoading(false);
  };

  const handleBatchValidate = async () => {
    if (batchSets.length === 0) { alert("Add at least one batch set."); return; }
    setBatchLoading(true);
    const updatedSets = [...batchSets];
    for (let i = 0; i < updatedSets.length; i++) {
      const set = updatedSets[i];
      if (!set.invoice || !set.billOfLading || !set.packingList) {
        updatedSets[i] = { ...set, result: null, error: "Missing documents" }; continue;
      }
      try {
        const inv = await extractTextFromPDF(set.invoice);
        const bol = await extractTextFromPDF(set.billOfLading);
        const pak = await extractTextFromPDF(set.packingList);
        const awb = set.mode === "air" ? bol : null;
        const res = await validateDocuments(inv, bol, pak, awb);
        updatedSets[i] = { ...set, result: res };
      } catch (e) { updatedSets[i] = { ...set, error: "Validation failed" }; }
    }
    setBatchSets(updatedSets);
    setBatchLoading(false);
  };

  const addBatchSet     = () => setBatchSets([...batchSets, { id: Date.now(), invoice: null, billOfLading: null, packingList: null, result: null, mode: "sea" }]);
  const updateBatchFile = (setId, docType, file) => setBatchSets(batchSets.map(s => s.id === setId ? { ...s, [docType]: file } : s));
  const updateBatchMode = (setId, mode) => setBatchSets(batchSets.map(s => s.id === setId ? { ...s, mode } : s));
  const removeBatchSet  = (setId) => setBatchSets(batchSets.filter(s => s.id !== setId));

  const errorCount = results?.issues?.filter(i => i.severity === "error").length   || 0;
  const warnCount  = results?.issues?.filter(i => i.severity === "warning").length || 0;
  const okCount    = results?.issues?.filter(i => i.severity === "ok").length      || 0;
  const total      = errorCount + warnCount + okCount;
  const confidence = total > 0 ? Math.round((okCount / total) * 100) : null;
  const hasAwbValues = (results?.issues || []).some(i => i.awbValue != null && i.awbValue !== "");

  const navItems = [
    { id: "validate", icon: "📋", label: "Validate" },
    { id: "results",  icon: "📊", label: "Results" },
    { id: "batch",    icon: "📦", label: "Batch" },
    { id: "history",  icon: "🕐", label: "History" },
  ];

  const bolHeaderLabel =
    transportMode === "air"   ? "Air Waybill (AWB)" :
    transportMode === "road"  ? "CMR Waybill" :
    transportMode === "rail"  ? "Rail Consignment Note" :
    transportMode === "multi" ? "Bill of Lading (Sea)" :
    "Bill of Lading";

  return (
    <div className="dashboard">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">FV</div>
          <div className="logo-text">
            <span className="logo-brand">Freight</span>
            <span className="logo-sub">Validator</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === "results" && results               && <span className="nav-badge">{total}</span>}
              {item.id === "batch"   && batchSets.length > 0  && <span className="nav-badge">{batchSets.length}</span>}
              {item.id === "history" && history.length > 0    && <span className="nav-badge">{history.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar" style={{ background: "#1254b5" }}>{user.avatar}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
            </div>
          </div>
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === "light" ? "🌙" : "☀️"}
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>
          <button className="logout-btn" onClick={logout}>← Sign out</button>
          <div className="sidebar-version">v1.0 · AI Validator</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            {activeTab !== "validate" && <button className="back-btn" onClick={() => setActiveTab("validate")}>← Home</button>}
            <div className="topbar-title">
              {activeTab === "validate" && "Document Validation"}
              {activeTab === "results"  && "Validation Results"}
              {activeTab === "batch"    && "Batch Validation"}
              {activeTab === "history"  && "Validation History"}
            </div>
          </div>
          <div className="topbar-right">
            {activeTab === "validate" && uploaded > 0 && (
              <span className="upload-status">
                {uploaded}/{required} · {modeIcon} {MODES[transportMode].label}
              </span>
            )}
            {activeTab === "validate" && (
              <button className="validate-btn" onClick={handleValidate} disabled={loading || uploaded < required}>
                {loading ? <><span className="spinner" /> Validating…</> : "✦ Run Validation"}
              </button>
            )}
            {activeTab === "results" && results && (
              <div className="topbar-actions">
                <button className="action-btn hide-mobile" onClick={() => setShowComparison(!showComparison)}>
                  {showComparison ? "Hide" : "Show"} Comparison
                </button>
                <button className="action-btn" onClick={() => exportReportAsCSV(results)}>↓ CSV</button>
                <button className="action-btn hide-mobile" onClick={() => exportReportAsHTML(results, confidence, fileNames)}>↓ Report</button>
                <button className="action-btn accent" onClick={() => setShowEmailModal(true)}>✉ Email</button>
              </div>
            )}
            {activeTab === "batch" && (
              <div className="topbar-actions">
                <button className="action-btn" onClick={addBatchSet}>+ Add Set</button>
                <button className="validate-btn" onClick={handleBatchValidate} disabled={batchLoading || batchSets.length === 0}>
                  {batchLoading ? <><span className="spinner" /> Running…</> : "✦ Validate All"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── VALIDATE TAB ── */}
        {activeTab === "validate" && (
          <div className="tab-content">
            <div className="stat-row">
              <div className="stat-card">
                <div className="stat-value">{uploaded}/{required}</div>
                <div className="stat-label">Docs Uploaded</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{history.length}</div>
                <div className="stat-label">Total Validations</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {history.length > 0
                    ? Math.round(history.reduce((a, h) => a + (h.confidence ?? (h.errors === 0 ? 100 : Math.round((h.ok / Math.max(h.errors + h.warnings + h.ok, 1)) * 100))), 0) / history.length) + "%"
                    : "—"}
                </div>
                <div className="stat-label">Avg Confidence</div>
              </div>
              <div className="stat-card accent">
                <div className="stat-value">{history.filter(h => h.errors === 0).length}</div>
                <div className="stat-label">Clean Runs</div>
              </div>
            </div>

            <UploadSection
              files={files}
              onFile={handleFile}
              transportMode={transportMode}
              onModeChange={handleModeChange}
            />
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {activeTab === "results" && (
          <div className="tab-content">
            {results ? (
              <>
                <div className="results-grid">
                  <div className="confidence-card">
                    <div className="conf-label">Confidence Score</div>
                    <div className="conf-ring">
                      <svg viewBox="0 0 100 100" className="ring-svg">
                        <circle cx="50" cy="50" r="40" className="ring-bg" />
                        <circle cx="50" cy="50" r="40" className="ring-fill"
                          strokeDasharray={`${(confidence || 0) * 2.51} 251`}
                          transform="rotate(-90 50 50)" />
                      </svg>
                      <div className="conf-number">{confidence ?? "—"}%</div>
                    </div>
                    <div className="conf-sub">Document consistency</div>
                  </div>
                  <div className="issue-stats">
                    <div className="issue-stat error"><span className="issue-count">{errorCount}</span><span className="issue-type">Errors</span></div>
                    <div className="issue-stat warning"><span className="issue-count">{warnCount}</span><span className="issue-type">Warnings</span></div>
                    <div className="issue-stat ok"><span className="issue-count">{okCount}</span><span className="issue-type">Passed</span></div>
                    <div className="summary-box">
                      <div className="summary-label">Summary</div>
                      <div className="summary-text">{results.summary}</div>
                    </div>
                  </div>
                </div>

                {showComparison && results && (
                  <div className="comparison-card">
                    <div className="comparison-header">Field Comparison — Side by Side</div>
                    <div className="comparison-table-wrap">
                      <table className="comparison-table">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Commercial Invoice</th>
                            <th>{bolHeaderLabel}</th>
                            <th>Packing List</th>
                            {hasAwbValues && <th>AWB</th>}
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(results.issues || []).map((issue, i) => (
                            <tr key={i} className={`cmp-row ${issue.severity}`}>
                              <td className="cmp-field">{issue.field}</td>
                              <td className="cmp-cell">{issue.invoiceValue ?? "—"}</td>
                              <td className="cmp-cell">{issue.bolValue ?? "—"}</td>
                              <td className="cmp-cell">{issue.packingValue ?? "—"}</td>
                              {hasAwbValues && <td className="cmp-cell">{issue.awbValue ?? "—"}</td>}
                              <td>
                                <span className={`cmp-badge ${issue.severity}`}>
                                  {issue.severity === "error" ? "🔴" : issue.severity === "warning" ? "🟡" : "🟢"} {issue.severity}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <ResultsPanel results={results} />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <div className="empty-title">No results yet</div>
                <div className="empty-sub">Upload documents and run validation first.</div>
                <button className="ghost-btn" onClick={() => setActiveTab("validate")}>← Go to Upload</button>
              </div>
            )}
          </div>
        )}

        {/* ── BATCH TAB ── */}
        {activeTab === "batch" && (
          <div className="tab-content">
            {batchSets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <div className="empty-title">No batch sets yet</div>
                <div className="empty-sub">Click "Add Set" to add a shipment set for bulk validation.</div>
                <button className="ghost-btn" onClick={addBatchSet}>+ Add First Set</button>
              </div>
            ) : (
              <div className="batch-list">
                {batchSets.map((set, idx) => (
                  <div key={set.id} className="batch-card">
                    <div className="batch-card-header">
                      <span className="batch-index">Shipment Set #{idx + 1}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="toggle-group" style={{ transform: "scale(0.85)", transformOrigin: "right center" }}>
                          {["sea", "air", "road", "rail"].map(m => (
                            <button key={m}
                              className={`toggle-btn ${set.mode === m ? "active" : ""}`}
                              onClick={() => updateBatchMode(set.id, m)}>
                              {MODES[m].icon} {MODES[m].label}
                            </button>
                          ))}
                        </div>
                        <button className="remove-btn" onClick={() => removeBatchSet(set.id)}>✕ Remove</button>
                      </div>
                    </div>
                    <div className="batch-drops">
                      {[
                        { key: "invoice",      label: "Commercial Invoice" },
                        { key: "billOfLading", label: MODES[set.mode]?.docs[1]?.label || "Bill of Lading" },
                        { key: "packingList",  label: "Packing List" },
                      ].map(({ key, label }) => (
                        <label key={key} className={`batch-drop ${set[key] ? "has-file" : ""}`}>
                          <input type="file" accept=".pdf" style={{ display: "none" }}
                            onChange={e => updateBatchFile(set.id, key, e.target.files[0])} />
                          <span className="bdrop-icon">{set[key] ? "✅" : "📄"}</span>
                          <span className="bdrop-label">{label}</span>
                          {set[key]
                            ? <span className="bdrop-name">{set[key].name}</span>
                            : <span className="bdrop-hint">Click to upload</span>}
                        </label>
                      ))}
                    </div>
                    {set.result && (
                      <div className="batch-result">
                        <span className={`batch-badge ${set.result.issues?.some(i => i.severity === "error") ? "error" : "ok"}`}>
                          {set.result.issues?.some(i => i.severity === "error") ? "🔴 Issues Found" : "🟢 Clean"}
                        </span>
                        <span className="batch-summary">{set.result.summary}</span>
                      </div>
                    )}
                    {set.error && <div className="batch-result"><span className="batch-badge error">⚠ {set.error}</span></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="tab-content">
            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🕐</div>
                <div className="empty-title">No history yet</div>
                <div className="empty-sub">Past validations will appear here.</div>
              </div>
            ) : (
              <>
                <div className="history-toolbar">
                  <div className="history-hint">💡 Tap any row to expand details</div>
                  <button className="ghost-btn danger" onClick={() => { setHistory([]); localStorage.removeItem(historyKey); }}>
                    🗑 Clear History
                  </button>
                </div>
                <div className="history-list">
                  {history.map((h, i) => <HistoryCard key={h.id} entry={h} index={i} total={history.length} />)}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showEmailModal && results && (
        <EmailModal results={results} confidence={confidence} fileNames={fileNames} onClose={() => setShowEmailModal(false)} />
      )}
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────── */
function AppInner() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}