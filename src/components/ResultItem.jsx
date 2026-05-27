const { useState, useMemo } = dc;

function jsonReplacer(key, value) {
  if (
    key === "$parent" ||
    key === "$sections" ||
    key === "$blocks" ||
    key === "file"
  ) {
    if (value && value.$path) return `[Reference to ${value.$path}]`;
    return `[Circular Reference]`;
  }
  if (value && value.isLuxonDateTime) return value.toISO();
  return value;
}

function ResultItem({ item }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFields, setShowFields] = useState(false);

  const getFilePath = (data) => {
    if (typeof data !== "object" || data === null) return null;
    if (data.$path) return data.$path;
    if (data.file?.path) return data.file.path;
    if (data.$page && data.$page.$path) return data.$page.$path;
    if (data.$parent) {
      const parentPath = getFilePath(data.$parent);
      if (parentPath) return parentPath;
    }
    return null;
  };

  const getDisplayName = (data) => {
    if (typeof data !== "object" || data === null) return String(data);
    if (data.$name) return String(data.$name);
    if (data.text) {
      const text = String(data.text);
      return text.length > 80 ? text.substring(0, 77) + "..." : text;
    }
    const pathVal = getFilePath(data);
    if (pathVal) {
      const parts = pathVal.split("/");
      return parts[parts.length - 1]; // Return beautiful basename instead of path
    }
    return "Untitled Item";
  };

  const displayName = getDisplayName(item);
  const filePath = getFilePath(item);

  const handleOpenEntry = async (path) => {
    try {
      const file = app.vault.getAbstractFileByPath(path);
      if (file) {
        // Open file inside a new tab ('tab') to avoid replacing your explorer tab!
        await app.workspace.getLeaf('tab').openFile(file);
        console.log("[ResultItem] Successfully opened entry in new tab:", path);
      } else {
        console.warn("[ResultItem] File path not found in vault:", path);
      }
    } catch (e) {
      console.error("[ResultItem] Failed to open file:", e);
    }
  };

  const itemStyles = {
    container: {
      padding: "10px 12px",
      borderBottom: "1px solid #1a1a1a",
      backgroundColor: "#0a0a0a",
      color: "#ffffff",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "pointer",
    },
    name: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      marginRight: "10px",
    },
    buttonContainer: { display: "flex", gap: "8px", flexShrink: 0 },
    button: {
      padding: "2px 8px",
      backgroundColor: "#1a1a1a",
      border: "1px solid #9b87f5",
      borderRadius: "3px",
      color: "#ffffff",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    pre: {
      marginTop: "8px",
      backgroundColor: "#000000",
      padding: "10px",
      borderRadius: "4px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      maxHeight: "300px",
      overflow: "auto",
      border: "1px solid #1a1a1a",
      userSelect: "text",
      cursor: "text",
    },
    fieldsHeader: {
      fontSize: "12px",
      color: "#9b87f5",
      marginTop: "12px",
      marginBottom: "4px",
      fontFamily: "monospace",
    },
  };

  const fields = useMemo(() => {
    if (!showFields || typeof item.fields !== "function") return null;
    try {
      return item.fields();
    } catch (e) {
      console.error("Failed to call item.fields()", e);
      return [{ key: "Error", value: "Could not load fields." }];
    }
  }, [showFields, item]);

  return (
    <div style={itemStyles.container}>
      <div style={itemStyles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <span style={itemStyles.name} title={displayName}>
          {item.$typename && (
            <span style={{
              fontSize: "9px",
              color: "#9b87f5",
              backgroundColor: "rgba(155, 135, 245, 0.08)",
              border: "1px solid rgba(155, 135, 245, 0.22)",
              padding: "2px 6px",
              borderRadius: "4px",
              marginRight: "8px",
              fontWeight: "700",
              textTransform: "uppercase",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              display: "inline-flex",
              alignItems: "center"
            }}>
              {item.$typename}
            </span>
          )}
          <span style={{ verticalAlign: "middle" }}>{displayName}</span>
        </span>
        <div style={itemStyles.buttonContainer}>
          {filePath && (
            <button
              style={itemStyles.button}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEntry(filePath);
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#9b87f5";
                e.currentTarget.style.color = "#000000";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#1a1a1a";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              <dc.Icon icon="external-link" style={{ fontSize: "12px" }} />
              {" Open"}
            </button>
          )}
          {typeof item.fields === "function" && (
            <button
              style={itemStyles.button}
              onClick={(e) => {
                e.stopPropagation();
                setShowFields(!showFields);
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#9b87f5";
                e.currentTarget.style.color = "#000000";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#1a1a1a";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              <dc.Icon
                icon={showFields ? "eye-off" : "eye"}
                style={{ fontSize: "12px" }}
              />
              {showFields ? " Hide Fields" : " Show Fields"}
            </button>
          )}
          <button
            style={itemStyles.button}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#9b87f5";
              e.currentTarget.style.color = "#000000";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#1a1a1a";
              e.currentTarget.style.color = "#ffffff";
            }}
          >
            <dc.Icon
              icon={isExpanded ? "chevron-up" : "chevron-down"}
              style={{ fontSize: "12px" }}
            />
            {isExpanded ? " Collapse" : " Expand"}
          </button>
        </div>
      </div>
      {showFields && fields && (
        <div>
          <h4 style={itemStyles.fieldsHeader}>
            Available Fields (via item.fields()):
          </h4>
          <pre style={itemStyles.pre}>
            <code>
              {JSON.stringify(
                fields,
                (k, v) => (k === "$parent" ? "[Ref]" : v),
                2
              )}
            </code>
          </pre>
        </div>
      )}
      {isExpanded && (
        <div>
          <h4 style={itemStyles.fieldsHeader}>Raw Data Object:</h4>
          <pre style={itemStyles.pre}>
            <code>{JSON.stringify(item, jsonReplacer, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

return { ResultItem };
