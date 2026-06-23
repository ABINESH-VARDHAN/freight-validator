function ValidateButton({ onClick, loading }) {
  return (
    <button className="validate-btn" onClick={onClick} disabled={loading}>
      {loading ? (
        <>
          <div className="spinner"></div>
          Validating...
        </>
      ) : (
        "✦ Validate Documents"
      )}
    </button>
  );
}

export default ValidateButton;