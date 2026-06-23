import { useState, useRef } from "react";

function DropZone({ label, docType, icon, onFileChange, fileRef }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  // expose a reset function via fileRef
  if (fileRef) fileRef.current = () => { setFile(null); };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      onFileChange(docType, dropped);
    } else {
      alert("Please drop a PDF file.");
    }
  };

  const handleChange = (e) => {
    const selected = e.target.files[0];
    if (selected) { setFile(selected); onFileChange(docType, selected); }
  };

  return (
    <div
      className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleChange} />
      <div className="dz-icon">{file ? "✅" : icon}</div>
      <div className="dz-label">{label}</div>
      {file
        ? <div className="dz-filename">{file.name}</div>
        : <div className="dz-hint">Drag & drop or <span>browse</span></div>
      }
    </div>
  );
}

export default function UploadSection({ onFilesSelected, onModeChange }) {
  const [files, setFiles] = useState({ invoice: null, billOfLading: null, packingList: null });
  const [transportMode, setTransportMode] = useState("sea");
  const bolResetRef = useRef(null);

  const handleFileChange = (docType, file) => {
    const updated = { ...files, [docType]: file };
    setFiles(updated);
    onFilesSelected(updated);
  };

  const handleModeChange = (mode) => {
    if (mode === transportMode) return;
    setTransportMode(mode);
    onModeChange?.(mode);
    // clear the BOL/AWB file when switching modes
    if (bolResetRef.current) bolResetRef.current();
    const updated = { ...files, billOfLading: null };
    setFiles(updated);
    onFilesSelected(updated);
  };

  const bolLabel = transportMode === "sea" ? "Bill of Lading" : "Air Waybill (AWB)";
  const bolIcon  = transportMode === "sea" ? "🚢" : "✈️";

  return (
    <div className="upload-section">
      <div className="section-header">
        <span>Upload Documents</span>
        <span className="section-sub">PDF format only · All 3 required</span>
      </div>

      <div className="transport-toggle">
        <span className="toggle-label">Transport mode:</span>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${transportMode === "sea" ? "active" : ""}`}
            onClick={() => handleModeChange("sea")}
          >
            🚢 Sea Freight
          </button>
          <button
            className={`toggle-btn ${transportMode === "air" ? "active" : ""}`}
            onClick={() => handleModeChange("air")}
          >
            ✈️ Air Freight
          </button>
        </div>
      </div>

      <div className="drop-grid">
        <DropZone label="Commercial Invoice" docType="invoice"      icon="🧾" onFileChange={handleFileChange} />
        <DropZone label={bolLabel}            docType="billOfLading" icon={bolIcon} onFileChange={handleFileChange} fileRef={bolResetRef} />
        <DropZone label="Packing List"        docType="packingList"  icon="📦" onFileChange={handleFileChange} />
      </div>
    </div>
  );
}