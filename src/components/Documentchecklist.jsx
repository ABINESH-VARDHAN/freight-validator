export default function DocumentChecklist({ title, icon = "📄", result, loading }) {
  if (loading) {
    return (
      <div className="doc-checklist-card pending">
        <div className="doc-checklist-header">
          <span className="doc-checklist-title">{icon} {title}</span>
        </div>
        <div className="doc-checklist-loading">
          <span className="spinner" /> Reading document…
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { score, checks, ready } = result;
  const barTone = ready ? "ok" : score >= 50 ? "warning" : "error";

  return (
    <div className={`doc-checklist-card ${ready ? "ready" : "incomplete"}`}>
      <div className="doc-checklist-header">
        <span className="doc-checklist-title">{icon} {title}</span>
        <span className={`doc-checklist-badge ${ready ? "ok" : "warning"}`}>
          {ready ? "✔ Ready" : `${score}% Ready`}
        </span>
      </div>

      <div className="doc-checklist-progress-wrap">
        <div className="doc-checklist-progress-bar">
          <div
            className={`doc-checklist-progress-fill ${barTone}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="doc-checklist-progress-num">{score}%</span>
      </div>

      <ul className="doc-checklist-list">
        {checks.map((c, i) => (
          <li key={i} className={`doc-checklist-item ${c.passed ? "passed" : "failed"}`}>
            <span className="doc-checklist-icon">{c.passed ? "✔" : "✖"}</span>
            <span className="doc-checklist-label">{c.label}</span>
            {c.passed && c.value && <span className="doc-checklist-value">{c.value}</span>}
            {!c.passed && <span className="doc-checklist-missing">Missing</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}