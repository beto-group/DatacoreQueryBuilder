const { useState, useEffect, useMemo } = dc;

function TagHelper({ searchTerm, onTagSelect }) {
  const [allTags, setAllTags] = useState(null);
  useEffect(() => {
    try {
      const pages = dc.api.query("@page");
      const tagSet = new Set();
      for (const note of pages) {
        for (const rawTag of note.$tags || []) {
          tagSet.add(rawTag.replace(/^#/, ""));
        }
      }
      setAllTags(Array.from(tagSet).sort());
    } catch (e) {
      console.error("Datacore Explorer: Failed to fetch tags.", e);
      setAllTags([]);
    }
  }, []);
  const filteredTags = useMemo(() => {
    if (allTags === null) return null;
    if (!searchTerm) return allTags;
    return allTags.filter((tag) =>
      tag.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTags, searchTerm]);
  const styles = {
    container: {
      backgroundColor: "#0a0a0a",
      padding: "8px",
      borderRadius: "4px",
      border: "1px solid #9b87f5",
    },
    list: { maxHeight: "150px", overflowY: "auto", paddingRight: "5px" },
    button: {
      width: "100%",
      textAlign: "left",
      padding: "4px 8px",
      border: "none",
      background: "none",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "3px",
      marginBottom: "2px",
      fontFamily: "monospace",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    hover: { backgroundColor: "#1a1a1a", color: "#9b87f5" },
    message: {
      color: "#9b87f5",
      fontSize: "12px",
      textAlign: "center",
      margin: "5px 0",
    },
  };
  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {filteredTags === null ? (
          <p style={styles.message}>Loading tags...</p>
        ) : filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <button
              key={tag}
              style={styles.button}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor =
                  styles.hover.backgroundColor;
                e.currentTarget.style.color = styles.hover.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#ffffff";
              }}
              onClick={() => onTagSelect(tag)}
            >
              <dc.Icon icon="hash" style={{ fontSize: "12px" }} />
              {tag}
            </button>
          ))
        ) : (
          <p style={styles.message}>
            {searchTerm ? "No tags match." : "No tags found."}
          </p>
        )}
      </div>
    </div>
  );
}

function FolderHelper({ searchTerm, onFolderSelect }) {
  const [allFolders, setAllFolders] = useState(null);
  useEffect(() => {
    try {
      const pages = dc.api.query("@page");
      const folderSet = new Set();
      for (const page of pages) {
        const path = page.$path;
        const parts = path.split("/");
        let currentFolder = "";
        // Recursively build and add every parent folder path
        for (let i = 0; i < parts.length - 1; i++) {
          currentFolder = currentFolder ? `${currentFolder}/${parts[i]}` : parts[i];
          const hasFileExtension = /\.(md|txt|png|jpg|webp|gif|pdf|js|jsx|css|json)$/i.test(currentFolder);
          if (!hasFileExtension) {
            folderSet.add(currentFolder);
          }
        }
      }
      setAllFolders(Array.from(folderSet).sort());
    } catch (e) {
      console.error("Datacore Explorer: Failed to fetch folders.", e);
      setAllFolders([]);
    }
  }, []);

  const filteredFolders = useMemo(() => {
    if (allFolders === null) return null;
    if (!searchTerm) return allFolders;
    const lowerSearch = searchTerm.toLowerCase();
    return allFolders
      .filter((folder) => folder.toLowerCase().includes(lowerSearch))
      .sort((a, b) => {
        // Prioritize base/parent folders by sorting shortest path length first
        if (a.length !== b.length) {
          return a.length - b.length;
        }
        return a.localeCompare(b);
      });
  }, [allFolders, searchTerm]);
  const styles = {
    container: {
      backgroundColor: "#0a0a0a",
      padding: "8px",
      borderRadius: "4px",
      border: "1px solid #9b87f5",
    },
    list: { maxHeight: "150px", overflowY: "auto", paddingRight: "5px" },
    button: {
      width: "100%",
      textAlign: "left",
      padding: "4px 8px",
      border: "none",
      background: "none",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "3px",
      marginBottom: "2px",
      fontFamily: "monospace",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    hover: { backgroundColor: "#1a1a1a", color: "#9b87f5" },
    message: {
      color: "#9b87f5",
      fontSize: "12px",
      textAlign: "center",
      margin: "5px 0",
    },
  };
  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {filteredFolders === null ? (
          <p style={styles.message}>Loading folders...</p>
        ) : filteredFolders.length > 0 ? (
          filteredFolders.map((folder) => (
            <button
              key={folder}
              style={styles.button}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor =
                  styles.hover.backgroundColor;
                e.currentTarget.style.color = styles.hover.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#ffffff";
              }}
              onClick={() => onFolderSelect(folder)}
            >
              <dc.Icon icon="folder" style={{ fontSize: "12px" }} />
              {folder}
            </button>
          ))
        ) : (
          <p style={styles.message}>
            {searchTerm ? "No folders match." : "No folders found."}
          </p>
        )}
      </div>
    </div>
  );
}

function FileHelper({ searchTerm, onFileSelect }) {
  const [allFiles, setAllFiles] = useState(null);
  useEffect(() => {
    try {
      const pages = dc.api.query("@page");
      setAllFiles(pages.map((p) => p.$path).sort());
    } catch (e) {
      console.error("Datacore Explorer: Failed to fetch files.", e);
      setAllFiles([]);
    }
  }, []);
  const filteredFiles = useMemo(() => {
    if (allFiles === null) return null;
    if (!searchTerm) return allFiles;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return allFiles.filter((file) =>
      file.toLowerCase().includes(lowerCaseSearch)
    );
  }, [allFiles, searchTerm]);
  const styles = {
    container: {
      backgroundColor: "#0a0a0a",
      padding: "8px",
      borderRadius: "4px",
      border: "1px solid #9b87f5",
    },
    list: { maxHeight: "150px", overflowY: "auto", paddingRight: "5px" },
    button: {
      width: "100%",
      textAlign: "left",
      padding: "4px 8px",
      border: "none",
      background: "none",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "3px",
      marginBottom: "2px",
      fontFamily: "monospace",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    hover: { backgroundColor: "#1a1a1a", color: "#9b87f5" },
    message: {
      color: "#9b87f5",
      fontSize: "12px",
      textAlign: "center",
      margin: "5px 0",
    },
  };
  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {filteredFiles === null ? (
          <p style={styles.message}>Loading files...</p>
        ) : filteredFiles.length > 0 ? (
          filteredFiles.map((file) => (
            <button
              key={file}
              style={styles.button}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor =
                  styles.hover.backgroundColor;
                e.currentTarget.style.color = styles.hover.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#ffffff";
              }}
              onClick={() => onFileSelect(file)}
            >
              <dc.Icon icon="file-text" style={{ fontSize: "12px" }} />
              {file}
            </button>
          ))
        ) : (
          <p style={styles.message}>
            {searchTerm ? "No files match." : "No files found."}
          </p>
        )}
      </div>
    </div>
  );
}

function GenericPropertyHelper({ searchTerm, onPropertySelect }) {
  const [allProperties, setAllProperties] = useState(null);
  const intrinsicFields = [
    "$path",
    "$ctime",
    "$mtime",
    "$extension",
    "$size",
    "$position",
    "$lineCount",
    "$name",
    "$link",
    "$tags",
    "$sections",
    "$frontmatter",
    "$infields",
    "$ordinal",
    "$title",
    "$level",
    "$type",
    "$blockId",
    "$completed",
    "$status",
    "$languages",
    "$elements",
    "$text",
    "$cleantext",
    "$parentLine",
    "$symbol",
    "$links",
  ];
  useEffect(() => {
    try {
      const allItems = dc.api.query("@page OR @task");
      const propertySet = new Set();
      intrinsicFields.forEach((f) => propertySet.add(f));
      const ignoredKeys = new Set(["$parent", "$blocks", "file"]);
      for (const item of allItems) {
        for (const key of Object.keys(item)) {
          if (!ignoredKeys.has(key) && !key.startsWith("$"))
            propertySet.add(key);
        }
        if (item.$frontmatter && typeof item.$frontmatter === "object") {
          for (const key of Object.keys(item.$frontmatter)) {
            if (!ignoredKeys.has(key)) propertySet.add(key);
          }
        }
      }
      setAllProperties(
        Array.from(propertySet).sort((a, b) => {
          const aIntrinsic = a.startsWith("$");
          const bIntrinsic = b.startsWith("$");
          if (aIntrinsic && !bIntrinsic) return -1;
          if (!aIntrinsic && bIntrinsic) return 1;
          return a.localeCompare(b);
        })
      );
    } catch (e) {
      console.error("Datacore Explorer: Failed to fetch properties.", e);
      setAllProperties([]);
    }
  }, []);
  const filteredProperties = useMemo(() => {
    if (allProperties === null) return null;
    if (!searchTerm) return allProperties;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return allProperties.filter((prop) =>
      prop.toLowerCase().includes(lowerCaseSearch)
    );
  }, [allProperties, searchTerm]);
  const styles = {
    container: {
      backgroundColor: "#0a0a0a",
      padding: "8px",
      borderRadius: "4px",
      border: "1px solid #9b87f5",
    },
    list: { maxHeight: "150px", overflowY: "auto", paddingRight: "5px" },
    button: {
      width: "100%",
      textAlign: "left",
      padding: "4px 8px",
      border: "none",
      background: "none",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "3px",
      marginBottom: "2px",
      fontFamily: "monospace",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    hover: { backgroundColor: "#1a1a1a", color: "#9b87f5" },
    message: {
      color: "#9b87f5",
      fontSize: "12px",
      textAlign: "center",
      margin: "5px 0",
    },
  };
  const getPropertyIcon = (propName) => {
    const p = propName.toLowerCase();
    
    // 1. Array/List fields
    const arrayFields = [
      "$tags", "$links", "$sections", "$elements", "$languages", "$infields", 
      "tags", "links", "sections", "elements", "languages", "infields"
    ];
    if (arrayFields.includes(propName) || p.includes("list") || p.includes("array")) {
      return "list";
    }

    // 2. Date/Time fields
    const dateFields = ["$ctime", "$mtime", "ctime", "mtime", "date", "time", "created", "modified"];
    if (dateFields.includes(propName) || p.includes("date") || p.includes("time")) {
      return "clock";
    }

    // 3. Boolean/Checkbox/Status fields
    const booleanFields = ["$completed", "$status", "completed", "status", "active", "done", "checked"];
    if (booleanFields.includes(propName) || p.includes("completed") || p.includes("status")) {
      return "check-square";
    }

    // 4. Number/Binary/Digit fields
    const numberFields = ["$size", "$lineCount", "$level", "$ordinal", "size", "rating", "score", "count", "number"];
    if (numberFields.includes(propName) || p.includes("count") || p.includes("size") || p.includes("rating") || p.includes("level")) {
      return "binary";
    }

    // 5. Default/Text/String fields
    return "align-left";
  };

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {filteredProperties === null ? (
          <p style={styles.message}>Loading fields...</p>
        ) : filteredProperties.length > 0 ? (
          filteredProperties.map((prop) => (
            <button
              key={prop}
              style={styles.button}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor =
                  styles.hover.backgroundColor;
                e.currentTarget.style.color = styles.hover.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#ffffff";
              }}
              onClick={() => onPropertySelect(prop)}
            >
              <dc.Icon
                icon={getPropertyIcon(prop)}
                style={{ fontSize: "12px" }}
              />{" "}
              {prop}
            </button>
          ))
        ) : (
          <p style={styles.message}>
            {searchTerm ? "No fields match." : "No fields found."}
          </p>
        )}
      </div>
    </div>
  );
}

function ComparisonOperatorHelper({ onOperatorSelect, fieldName }) {
  const arrayFields = [
    "$tags",
    "tags",
    "$links",
    "links",
    "$sections",
    "sections",
    "$elements",
    "elements",
    "$languages",
    "languages",
    "$infields",
    "infields",
  ];
  const dateFields = ["$ctime", "$mtime", "ctime", "mtime"];
  const isArrayField = arrayFields.includes(fieldName);
  const isDateField = dateFields.includes(fieldName);
  let operators;
  let message;
  if (isArrayField) {
    operators = [".contains"];
    message = `Array field: use .contains() to check if array contains a value`;
  } else if (isDateField) {
    operators = ["==", "!=", ">", ">=", "<", "<="];
    message = `Date field: use comparison operators (avoid .contains())`;
  } else {
    operators = ["==", "!=", ">", ">=", "<", "<=", ".contains"];
    message = `Select an operator or method:`;
  }
  const styles = {
    container: {
      backgroundColor: "#0a0a0a",
      padding: "8px",
      borderRadius: "4px",
      border: "1px solid #9b87f5",
    },
    list: {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px",
      justifyContent: "center",
    },
    button: {
      padding: "4px 10px",
      border: "1px solid #9b87f5",
      background: "#1a1a1a",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "3px",
      fontFamily: "monospace",
      fontSize: "14px",
      transition: "all 0.2s",
    },
    hover: { backgroundColor: "#9b87f5", color: "#000000" },
    message: {
      color: "#9b87f5",
      fontSize: "12px",
      textAlign: "center",
      margin: "5px 0",
      width: "100%",
    },
  };
  return (
    <div style={styles.container}>
      <p style={styles.message}>{message}</p>
      <div style={styles.list}>
        {operators.map((op) => (
          <button
            key={op}
            style={styles.button}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor =
                styles.hover.backgroundColor;
              e.currentTarget.style.color = styles.hover.color;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = styles.button.background;
              e.currentTarget.style.color = styles.button.color;
            }}
            onClick={() => onOperatorSelect(op)}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );
}

function MainSelectorHelper({ onSelectCategory }) {
  const categories = [
    { id: "file", label: "Files", icon: "file-text", desc: "Select a note path" },
    { id: "folder", label: "Folders", icon: "folder", desc: "Select a folder path" },
    { id: "tag", label: "Tags", icon: "hash", desc: "Select a tag" },
    { id: "property", label: "Properties", icon: "key", desc: "Select a custom field or frontmatter key" },
  ];
  
  const styles = {
    container: {
      backgroundColor: "#0a0a0a",
      padding: "8px",
      borderRadius: "4px",
      border: "1px solid #9b87f5",
    },
    list: { display: "flex", flexDirection: "column", gap: "4px" },
    button: {
      width: "100%",
      textAlign: "left",
      padding: "8px 12px",
      border: "none",
      background: "none",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "3px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      transition: "all 0.15s",
    },
    hover: { backgroundColor: "#161622", color: "#9b87f5" },
    label: { fontWeight: "bold", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" },
    desc: { color: "#666680", fontSize: "10px", marginTop: "2px" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            style={styles.button}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = styles.hover.backgroundColor;
              e.currentTarget.style.color = styles.hover.color;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#ffffff";
            }}
            onClick={() => onSelectCategory(cat.id)}
          >
            <dc.Icon icon={cat.icon} style={{ fontSize: "14px", color: "#9b87f5" }} />
            <div>
              <div style={styles.label}>{cat.label}</div>
              <div style={styles.desc}>{cat.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PropertyOperatorHelper({ onOperatorSelect, fieldName }) {
  const p = fieldName.toLowerCase();
  let category = "text";
  
  const arrayFields = [
    "$tags", "$links", "$sections", "$elements", "$languages", "$infields", 
    "tags", "links", "sections", "elements", "languages", "infields", "$frontmatter", "frontmatter"
  ];
  const dateFields = ["$ctime", "$mtime", "ctime", "mtime", "date", "time", "created", "modified"];
  const numberFields = ["$size", "$lineCount", "$level", "$ordinal", "size", "rating", "score", "count", "number"];

  if (arrayFields.includes(fieldName) || p.includes("list") || p.includes("array") || p.includes("frontmatter")) {
    category = "array";
  } else if (dateFields.includes(fieldName) || p.includes("date") || p.includes("time")) {
    category = "number";
  } else if (numberFields.includes(fieldName) || p.includes("count") || p.includes("size") || p.includes("rating") || p.includes("level")) {
    category = "number";
  }

  let filteredOps = [];
  if (category === "array") {
    filteredOps = [
      { id: "any", label: "Is Present", desc: "Simply check if this property exists in the note" },
      { id: "contains", label: "Contains Item", desc: "Check if the list contains a specific value" },
    ];
  } else if (category === "number") {
    filteredOps = [
      { id: "any", label: "Is Present", desc: "Simply check if this property exists in the note" },
      { id: "eq", label: "Is Equal To", desc: "Check if the number/value matches exactly" },
      { id: "gt", label: "Is Greater Than", desc: "Check if the value is larger" },
      { id: "lt", label: "Is Less Than", desc: "Check if the value is smaller" },
    ];
  } else {
    filteredOps = [
      { id: "any", label: "Is Present", desc: "Simply check if this property exists in the note" },
      { id: "eq", label: "Matches Exactly", desc: "Check if text matches a value exactly" },
      { id: "contains", label: "Contains Text", desc: "Check if text contains a word or substring" },
    ];
  }
  
  const styles = {
    container: {
      backgroundColor: "#0a0a0a",
      padding: "8px",
      borderRadius: "4px",
      border: "1px solid #9b87f5",
    },
    header: {
      color: "#9b87f5",
      fontSize: "11px",
      marginBottom: "6px",
      fontFamily: "monospace",
    },
    list: { display: "flex", flexDirection: "column", gap: "4px" },
    button: {
      width: "100%",
      textAlign: "left",
      padding: "6px 10px",
      border: "none",
      background: "none",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "3px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      transition: "all 0.15s",
    },
    hover: { backgroundColor: "#161622", color: "#9b87f5" },
    label: { fontWeight: "bold", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" },
    desc: { color: "#666680", fontSize: "9px", marginTop: "2px" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Select attribute check for <strong>{fieldName}</strong>:</div>
      <div style={styles.list}>
        {filteredOps.map((op) => (
          <button
            key={op.id}
            style={styles.button}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = styles.hover.backgroundColor;
              e.currentTarget.style.color = styles.hover.color;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#ffffff";
            }}
            onClick={() => onOperatorSelect(op.id)}
          >
            <dc.Icon icon={op.id === "any" ? "zap" : op.id === "eq" ? "link" : op.id === "contains" ? "search" : op.id === "gt" ? "trending-up" : "trending-down"} style={{ fontSize: "12px", color: "#9b87f5" }} />
            <div>
              <div style={styles.label}>{op.label}</div>
              <div style={styles.desc}>{op.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

return {
  TagHelper,
  FolderHelper,
  FileHelper,
  GenericPropertyHelper,
  ComparisonOperatorHelper,
  MainSelectorHelper,
  PropertyOperatorHelper,
};
