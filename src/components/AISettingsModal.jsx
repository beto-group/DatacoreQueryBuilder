const { useState } = dc;

function AISettingsModal({
  onClose,
  onSave,
  currentProvider,
  currentApiKey,
  isInline = false,
}) {
  const [provider, setProvider] = useState(currentProvider || "gemini");
  const [apiKey, setApiKey] = useState(currentApiKey || "");
  const [isSaving, setIsSaving] = useState(false);
  const providers = [
    {
      id: "gemini",
      name: "Google Gemini",
      model: "gemini-2.0-flash-exp",
      icon: "sparkles",
      placeholder: "Enter your Gemini API key",
      docs: "https://ai.google.dev/gemini-api/docs/api-key",
    },
    {
      id: "openai",
      name: "OpenAI",
      model: "gpt-4o",
      icon: "bot",
      placeholder: "Enter your OpenAI API key (sk-...)",
      docs: "https://platform.openai.com/api-keys",
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      model: "claude-3-5-sonnet-20241022",
      icon: "brain",
      placeholder: "Enter your Anthropic API key (sk-ant-...)",
      docs: "https://console.anthropic.com/settings/keys",
    },
    {
      id: "groq",
      name: "Groq",
      model: "llama-3.3-70b-versatile",
      icon: "zap",
      placeholder: "Enter your Groq API key (gsk_...)",
      docs: "https://console.groq.com/keys",
    },
  ];
  const selectedProvider = providers.find((p) => p.id === provider);
  const handleSave = async () => {
    if (!apiKey.trim()) {
      alert("Please enter an API key");
      return;
    }
    setIsSaving(true);
    await onSave(provider, apiKey.trim());
    setIsSaving(false);
  };
  const styles = {
    overlay: {
      position: isInline ? "absolute" : "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isInline ? "rgba(0,0,0,0.95)" : "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: isInline ? 100 : 10000,
    },
    modal: {
      backgroundColor: "#0a0a0a",
      border: "2px solid #9b87f5",
      borderRadius: "8px",
      padding: isInline ? "20px" : "24px",
      maxWidth: isInline ? "90%" : "500px",
      width: isInline ? "90%" : "90%",
      maxHeight: isInline ? "80%" : "90vh",
      overflowY: "auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    title: {
      margin: 0,
      color: "#ffffff",
      fontSize: "20px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "#9b87f5",
      fontSize: "24px",
      cursor: "pointer",
      padding: "4px 8px",
    },
    section: { marginBottom: "20px" },
    label: {
      display: "block",
      color: "#9b87f5",
      fontSize: "14px",
      fontWeight: "bold",
      marginBottom: "8px",
    },
    providerGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: "10px",
      marginBottom: "20px",
    },
    providerCard: {
      padding: "16px",
      backgroundColor: "#1a1a1a",
      border: "2px solid #2d2d2d",
      borderRadius: "6px",
      cursor: "pointer",
      transition: "all 0.2s",
      textAlign: "center",
    },
    providerCardActive: { borderColor: "#9b87f5", backgroundColor: "#2d1f3d" },
    providerIcon: { fontSize: "32px", marginBottom: "8px" },
    providerName: { fontSize: "13px", color: "#ffffff", fontWeight: "bold" },
    providerModel: { fontSize: "10px", color: "#9b87f5", marginTop: "4px" },
    input: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#1a1a1a",
      border: "1px solid #9b87f5",
      borderRadius: "4px",
      color: "#ffffff",
      fontFamily: "monospace",
      fontSize: "13px",
      boxSizing: "border-box",
    },
    helperText: {
      fontSize: "11px",
      color: "#666",
      marginTop: "6px",
      lineHeight: "1.4",
    },
    link: { color: "#9b87f5", textDecoration: "underline", cursor: "pointer" },
    buttonGroup: {
      display: "flex",
      gap: "10px",
      justifyContent: "flex-end",
      marginTop: "24px",
    },
    button: {
      padding: "10px 20px",
      backgroundColor: "#9b87f5",
      border: "none",
      borderRadius: "4px",
      color: "#000000",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
    },
    cancelButton: {
      backgroundColor: "#1a1a1a",
      color: "#ffffff",
      border: "1px solid #9b87f5",
    },
  };
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <dc.Icon icon="settings" style={{ fontSize: "20px" }} />
            AI Provider Settings
          </h3>{" "}
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>{" "}
        <div style={styles.section}>
          <label style={styles.label}>Select AI Provider:</label>{" "}
          <div style={styles.providerGrid}>
            {providers.map((p) => (
              <div
                key={p.id}
                style={{
                  ...styles.providerCard,
                  ...(provider === p.id ? styles.providerCardActive : {}),
                }}
                onClick={() => setProvider(p.id)}
              >
                <div style={styles.providerIcon}>
                  <dc.Icon icon={p.icon} />
                </div>{" "}
                <div style={styles.providerName}>{p.name}</div>{" "}
                <div style={styles.providerModel}>{p.model}</div>
              </div>
            ))}
          </div>
        </div>{" "}
        <div style={styles.section}>
          <label style={styles.label}>
            API Key for {selectedProvider.name}:
          </label>{" "}
          <input
            type="password"
            style={styles.input}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={selectedProvider.placeholder}
          />{" "}
          <div style={styles.helperText}>
            Get your API key from{" "}
            <a
              style={styles.link}
              href={selectedProvider.docs}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                window.open(selectedProvider.docs);
              }}
            >
              {selectedProvider.name} Dashboard
            </a>
          </div>
        </div>{" "}
        <div style={styles.buttonGroup}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>{" "}
          <button style={styles.button} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

return { AISettingsModal };
