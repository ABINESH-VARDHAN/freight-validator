export default function DemoBanner() {
  return (
    <div className="demo-banner">
      <span className="demo-banner-icon">👁</span>
      <div>
        <strong>Demo mode</strong> — You are viewing a read-only preview.
        Uploading, validating, and exporting are disabled.
        <a href="#" onClick={e => { e.preventDefault(); }} className="demo-login-link">
          Sign in as Ops to validate documents →
        </a>
      </div>
    </div>
  );
}