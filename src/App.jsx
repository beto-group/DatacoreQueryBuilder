const activeFile = dc.resolvePath("DATACORE QUERY BUILDER") || "_RESOURCES/DATACORE/_DONE/DATACORE QUERY BUILDER/DATACORE QUERY BUILDER";
const folderPath = activeFile.substring(0, activeFile.lastIndexOf('/'));

const { useState, useEffect, useMemo, useRef } = dc;

const { ResultItem } = await dc.require(folderPath + "/src/components/ResultItem.jsx");
const { TagHelper, FolderHelper, FileHelper, GenericPropertyHelper, ComparisonOperatorHelper, MainSelectorHelper, PropertyOperatorHelper } = await dc.require(folderPath + "/src/components/Helpers.jsx");
const { AIQueryAssistant, FieldValueHelper } = await dc.require(folderPath + "/src/components/AIChat.jsx");
const { findNearestAncestorWithClass, findDirectChildByClass } = await dc.require(folderPath + "/src/utils/domUtils.js");

const QUERY_LIBRARY = [
  // ── Pages ──────────────────────────────────────────────────────────────────
  { category: "Pages", icon: "file-text", label: "All pages", query: "@page", desc: "Return every markdown page in the vault." },
  { category: "Pages", icon: "star", label: "Pages with rating ≥ 7", query: "@page and rating >= 7", desc: "Pages where the frontmatter field `rating` is 7 or higher." },
  { category: "Pages", icon: "calendar", label: "Pages modified today", query: "@page and $mtime >= date(today)", desc: "Pages modified since the start of today." },
  { category: "Pages", icon: "calendar-plus", label: "Pages created this week", query: "@page and $ctime >= date(today) - dur(7 days)", desc: "Pages created in the last 7 days." },
  { category: "Pages", icon: "eye", label: "Pages with a status field", query: "@page and exists(status)", desc: "Pages that have a `status` frontmatter key." },
  { category: "Pages", icon: "alert-circle", label: "Pages where status = active", query: '@page and status == "active"', desc: "Pages whose status is exactly 'active'." },
  { category: "Pages", icon: "layers", label: "Pages with multiple tags", query: "@page and #project", desc: "Pages that carry the #project tag." },
  // ── Tasks ──────────────────────────────────────────────────────────────────
  { category: "Tasks", icon: "square", label: "All incomplete tasks", query: "@task and $completed = false", desc: "Every unchecked task in the vault." },
  { category: "Tasks", icon: "check-square", label: "All completed tasks", query: "@task and $completed = true", desc: "Every checked task in the vault." },
  { category: "Tasks", icon: "alert-triangle", label: "Urgent unchecked tasks", query: "@task and $completed = false and #urgent", desc: "Incomplete tasks tagged #urgent." },
  { category: "Tasks", icon: "clock", label: "Tasks with a due date", query: "@task and exists(due)", desc: "Tasks that have a due frontmatter/inline field." },
  { category: "Tasks", icon: "calendar", label: "Tasks due today", query: "@task and $completed = false and due == date(today)", desc: "Uncompleted tasks due today." },
  { category: "Tasks", icon: "list-checks", label: "Tasks in a project folder", query: '@task and $completed = false and path("Projects")', desc: "Incomplete tasks anywhere inside the Projects folder." },
  { category: "Tasks", icon: "user", label: "Tasks assigned to me", query: '@task and assignee == "me"', desc: "Tasks whose `assignee` field equals 'me'." },
  // ── Tags ───────────────────────────────────────────────────────────────────
  { category: "Tags", icon: "hash", label: "All items tagged #project", query: "#project", desc: "All vault items with the #project tag." },
  { category: "Tags", icon: "hash", label: "Pages tagged #idea", query: "@page and #idea", desc: "Only pages carrying the #idea tag." },
  { category: "Tags", icon: "hash", label: "Tasks tagged #waiting", query: "@task and #waiting", desc: "Tasks that carry the #waiting tag." },
  { category: "Tags", icon: "layers", label: "Multi-tag: project AND active", query: "@page and #project and #active", desc: "Pages tagged with both #project and #active." },
  { category: "Tags", icon: "layers", label: "Either tag: research OR idea", query: "@page and (#research OR #idea)", desc: "Pages tagged with #research or #idea (or both)." },
  // ── Files & Folders ────────────────────────────────────────────────────────
  { category: "Files & Folders", icon: "folder", label: "Pages in Projects folder", query: '@page and path("Projects")', desc: 'Pages located under the Projects/ directory.' },
  { category: "Files & Folders", icon: "folder-open", label: "Pages in Resources folder", query: '@page and path("_RESOURCES")', desc: 'Pages under any _RESOURCES directory.' },
  { category: "Files & Folders", icon: "file", label: "All files", query: "@file", desc: "Every tracked file (images, PDFs, notes, etc.)." },
  { category: "Files & Folders", icon: "file-code", label: "All codeblocks", query: "@codeblock", desc: "Every fenced code block across all notes." },
  { category: "Files & Folders", icon: "database", label: "Datablocks with rating", query: "@datablock and exists(rating)", desc: "YAML datablocks that contain a `rating` field." },
  // ── Links ──────────────────────────────────────────────────────────────────
  { category: "Links", icon: "link-2", label: "Connected to a note", query: "@page and connected([[Note]])", desc: "Pages linked to or from [[Note]] — replace Note with a real path." },
  { category: "Links", icon: "arrow-right", label: "Pages that link TO a note", query: "@page and linkedto([[Note]])", desc: "Pages that contain a wikilink pointing at [[Note]]." },
  { category: "Links", icon: "arrow-left", label: "Pages linked FROM a note", query: "@page and linkedfrom([[Note]])", desc: "Pages that are linked from [[Note]]." },
  { category: "Links", icon: "external-link", label: "Orphan pages (no outgoing)", query: "@page and !connected([[]])", desc: "Pages with no outgoing or incoming links. (Adjust as needed.)" },
  // ── Hierarchy ──────────────────────────────────────────────────────────────
  { category: "Hierarchy", icon: "arrow-up-circle", label: "Parent pages of tasks", query: "parentof(@task and #urgent)", desc: "Pages/sections that are direct parents of urgent tasks." },
  { category: "Hierarchy", icon: "arrow-down-circle", label: "Children of a page", query: "childof(@page and path(\"Projects\"))", desc: "Sections and blocks that are direct children of pages in Projects." },
  { category: "Hierarchy", icon: "git-merge", label: "Subtree of a page", query: "subtree(@page and #project)", desc: "A page tagged #project plus all its descendant sections/blocks." },
  { category: "Hierarchy", icon: "git-branch", label: "Supertree of a codeblock", query: "supertree(@codeblock)", desc: "Every codeblock plus all ancestor nodes up to the root." },
  // ── Date & Time ────────────────────────────────────────────────────────────
  { category: "Date & Time", icon: "calendar", label: "Modified in the last 24h", query: "@page and $mtime >= date(now) - dur(1 day)", desc: "Pages touched in the past 24 hours." },
  { category: "Date & Time", icon: "calendar", label: "Created this month", query: "@page and $ctime >= date(today) - dur(30 days)", desc: "Pages created in the last 30 days." },
  { category: "Date & Time", icon: "clock", label: "Tasks due this week", query: "@task and $completed = false and due <= date(today) + dur(7 days)", desc: "Incomplete tasks due within the next 7 days." },
  // ── Fields ─────────────────────────────────────────────────────────────────
  { category: "Fields", icon: "check-circle", label: "Pages with a 'due' field", query: "@page and exists(due)", desc: "Pages that have a frontmatter 'due' key." },
  { category: "Fields", icon: "check-circle", label: "Pages with 'author' field", query: "@page and exists(author)", desc: "Pages that have an 'author' frontmatter key." },
  { category: "Fields", icon: "filter", label: "Rating between 5 and 8", query: "@page and rating >= 5 and rating <= 8", desc: "Pages whose rating is in the 5–8 range." },
  { category: "Fields", icon: "type", label: "Field contains keyword", query: '@page and title.contains("Guide")', desc: "Pages whose title contains the word 'Guide'." },
  { category: "Fields", icon: "hash", label: "Pages without a status", query: "@page and !exists(status)", desc: "Pages that do NOT have a 'status' frontmatter key." },
  // ── Advanced ───────────────────────────────────────────────────────────────
  { category: "Advanced", icon: "zap", label: "All list items", query: "@list-item", desc: "Every list item (bullet or numbered) across the vault." },
  { category: "Advanced", icon: "heading-1", label: "All sections", query: "@section", desc: "Every heading-delimited section in the vault." },
  { category: "Advanced", icon: "alert-circle", label: "Incomplete + high priority", query: "@task and $completed = false and priority == \"high\"", desc: "Incomplete tasks marked with priority: high." },
  { category: "Advanced", icon: "layers", label: "Pages in folder, rated", query: '@page and path("Projects") and exists(rating)', desc: "Pages inside Projects/ that also have a rating field." },
  { category: "Advanced", icon: "git-merge", label: "Linked + tagged", query: "@page and #project and connected([[README]])", desc: "Pages tagged #project that are also linked to [[README]]." },
];

const LIBRARY_CATEGORIES = ["All", ...Array.from(new Set(QUERY_LIBRARY.map((e) => e.category)))];

function OperatorSelector({ top, left, onSelect, onClose, isNegated }) {
  const styles = {
    container: {
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      backgroundColor: "#0a0a0a",
      border: "1px solid #9b87f5",
      borderRadius: "4px",
      zIndex: 20,
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 4px 8px rgba(155,135,245,0.3)",
    },
    button: {
      padding: "6px 12px",
      background: "none",
      border: "none",
      color: "#ffffff",
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "monospace",
      transition: "all 0.2s",
    },
    hover: { backgroundColor: "#1a1a1a", color: "#9b87f5" },
    separator: { borderBottom: "1px solid #9b87f5", margin: "2px 6px" },
  };
  const ref = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  return (
    <div ref={ref} style={styles.container}>
      <button
        style={styles.button}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = styles.hover.backgroundColor;
          e.currentTarget.style.color = styles.hover.color;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#ffffff";
        }}
        onClick={() => onSelect("AND")}
      >
        AND
      </button>
      <button
        style={styles.button}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = styles.hover.backgroundColor;
          e.currentTarget.style.color = styles.hover.color;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#ffffff";
        }}
        onClick={() => onSelect("OR")}
      >
        OR
      </button>
      <div style={styles.separator}></div>
      <button
        style={{ ...styles.button, color: isNegated ? "#9b87f5" : "#ffffff" }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = styles.hover.backgroundColor;
          e.currentTarget.style.color = styles.hover.color;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = isNegated ? "#9b87f5" : "#ffffff";
        }}
        onClick={() => onSelect("!not")}
      >
        {isNegated ? "is not" : "!not"}
      </button>
    </div>
  );
}

function getCoordsFromIndex(textarea, index) {
  if (!textarea) return { top: 0, left: 0 };
  const properties = [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "line-height",
    "text-transform",
    "word-spacing",
    "text-indent",
    "padding-top",
    "padding-left",
    "padding-right",
    "padding-bottom",
    "border-top-width",
    "border-left-width",
    "border-right-width",
    "border-bottom-width",
  ];
  const computedStyle = window.getComputedStyle(textarea);
  const div = document.createElement("div");
  div.id = "input-mirror-div";
  document.body.appendChild(div);
  properties.forEach((prop) => {
    div.style[prop] = computedStyle[prop];
  });
  div.style.position = "absolute";
  div.style.top = "-9999px";
  div.style.left = "0px";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.width = `${textarea.clientWidth}px`;
  div.textContent = textarea.value.substring(0, index);
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(index) || ".";
  div.appendChild(span);
  const coords = {
    top: span.offsetTop - textarea.scrollTop,
    left: span.offsetLeft - textarea.scrollLeft,
  };
  document.body.removeChild(div);
  return coords;
}

function QueryControls({ onBaseTypeChange, onAppend, onStartFilterWizard }) {
  const styles = {
    container: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      alignItems: "center",
      padding: "10px",
      backgroundColor: "#05050a",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.05)",
    },
    select: {
      padding: "8px",
      backgroundColor: "#111118",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "4px",
      color: "#c8c8e8",
      fontFamily: "monospace",
      transition: "all 0.2s",
      cursor: "pointer",
    },
    button: {
      padding: "6px 12px",
      backgroundColor: "#111118",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "4px",
      color: "#c8c8e8",
      cursor: "pointer",
      fontFamily: "monospace",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "12px",
    },
    separator: {
      borderLeft: "1px solid rgba(255, 255, 255, 0.06)",
      height: "20px",
      margin: "0 4px",
    },
    categoryLabel: {
      width: "100%",
      fontSize: "9px",
      color: "#7f7fa0",
      fontWeight: "bold",
      textTransform: "uppercase",
      marginTop: "8px",
      marginBottom: "0",
      fontFamily: "monospace",
      letterSpacing: "1px",
    },
  };
  const baseTypes = [
    {
      value: "@page",
      label: "@page",
      icon: "file-text",
      desc: "All markdown pages",
    },
    {
      value: "@task",
      label: "@task",
      icon: "check-square",
      desc: "All task items",
    },
    { value: "@file", label: "@file", icon: "file", desc: "All files" },
    {
      value: "@section",
      label: "@section",
      icon: "heading",
      desc: "All sections",
    },
    { value: "@block", label: "@block", icon: "box", desc: "All blocks" },
    {
      value: "@block-list",
      label: "@block-list",
      icon: "list",
      desc: "List blocks",
    },
    {
      value: "@codeblock",
      label: "@codeblock",
      icon: "code",
      desc: "All codeblocks",
    },
    {
      value: "@datablock",
      label: "@datablock",
      icon: "database",
      desc: "YAML datablocks",
    },
    {
      value: "@list-item",
      label: "@list-item",
      icon: "list-ordered",
      desc: "All list items",
    },
  ];
  const addOns = [
    { type: "category", label: "FILTERS" },
    {
      label: "#tag",
      value: "#",
      helper: "tag",
      icon: "hash",
      selection: { start_offset: 0, length: 0 },
      description: "Find items with a specific tag.\nExample: #work",
    },
    {
      label: "path()",
      value: 'path("")',
      helper: "folder",
      icon: "folder",
      selection: { start_offset: -2, length: 0 },
      description:
        'Find items within a specific folder path.\nExample: path("Projects/Active")',
    },
    {
      label: "exists()",
      value: "exists()",
      helper: "property",
      icon: "check-circle",
      selection: { start_offset: -1, length: 0 },
      description:
        "Find items where a specific property exists.\nExample: exists(due)",
    },
    { type: "separator" },
    { type: "category", label: "HIERARCHY" },
    {
      label: "parentof()",
      value: "parentof(@page)",
      icon: "arrow-up-circle",
      selection: { start_offset: -6, length: 5 },
      description:
        "Find the parents of items matching a sub-query.\nExample: parentof(@task and #urgent)",
    },
    {
      label: "childof()",
      value: "childof(@page)",
      icon: "arrow-down-circle",
      selection: { start_offset: -6, length: 5 },
      description:
        "Find the children of items matching a sub-query.\nExample: childof(@page)",
    },
    {
      label: "supertree()",
      value: "supertree(@page)",
      icon: "git-branch",
      selection: { start_offset: -6, length: 5 },
      description:
        "Find items and all their parents (inclusive).\nExample: supertree(@codeblock)",
    },
    {
      label: "subtree()",
      value: "subtree(@page)",
      icon: "git-merge",
      selection: { start_offset: -6, length: 5 },
      description:
        "Find items and all their children (inclusive).\nExample: subtree(@page)",
    },
    { type: "separator" },
    { type: "category", label: "LINKS" },
    {
      label: "connected()",
      value: "connected([[]])",
      helper: "file",
      icon: "link-2",
      selection: { start_offset: -3, length: 0 },
      description:
        "Find items linked TO or FROM a specific file.\nExample: connected([[/projects/roadmap]])",
    },
    {
      label: "linkedto()",
      value: "linkedto([[]])",
      helper: "file",
      icon: "arrow-right",
      selection: { start_offset: -3, length: 0 },
      description:
        "Find items that link TO a specific file.\nExample: linkedto([[/goals/q3]])",
    },
    {
      label: "linkedfrom()",
      value: "linkedfrom([[]])",
      helper: "file",
      icon: "arrow-left",
      selection: { start_offset: -3, length: 0 },
      description:
        "Find items that a specific file links FROM.\nExample: linkedfrom([[/meetings/2023-10-26]])",
    },
    { type: "separator" },
    { type: "category", label: "SPECIAL" },
    {
      label: "$completed",
      value: "$completed",
      icon: "check",
      description:
        "Find tasks that are marked as complete.\nExample: @task AND $completed",
    },
    {
      isFilterWizard: true,
      label: "Field Query...",
      icon: "filter",
      description:
        'Build a custom filter for a field.\nExample: rating >= 7\nAlso handles fields with spaces: row["last reviewed"]\nPro-tip: Type `$` to trigger this wizard.',
    },
  ];
  return (
    <div style={styles.container}>
      <select
        style={styles.select}
        title="Select the base object type for the query"
        onChange={(e) => onBaseTypeChange(e.target.value)}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#9b87f5")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1a1a1a")}
      >
        <option value="">-- Select Base Type --</option>
        {baseTypes.map((type) => (
          <option key={type.value} value={type.value} title={type.desc}>
            {type.label}
          </option>
        ))}
      </select>{" "}
      <div style={styles.separator}></div>
      {addOns.map((addon, index) => {
        if (addon.type === "separator")
          return <div key={`sep-${index}`} style={styles.separator}></div>;
        if (addon.type === "category")
          return (
            <div key={`cat-${index}`} style={styles.categoryLabel}>
              {addon.label}
            </div>
          );
        if (addon.isFilterWizard)
          return (
            <button
              key={index}
              style={styles.button}
              title={addon.description}
              onClick={onStartFilterWizard}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#9b87f5";
                e.currentTarget.style.color = "#000000";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#1a1a1a";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              {addon.icon && (
                <dc.Icon icon={addon.icon} style={{ fontSize: "12px" }} />
              )}
              {addon.label}
            </button>
          );
        return (
          <button
            key={index}
            style={styles.button}
            title={addon.description}
            onClick={() => onAppend(addon)}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#9b87f5";
              e.currentTarget.style.color = "#000000";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#1a1a1a";
              e.currentTarget.style.color = "#ffffff";
            }}
          >
            {addon.icon && (
              <dc.Icon icon={addon.icon} style={{ fontSize: "12px" }} />
            )}
            {addon.label}
          </button>
        );
      })}
    </div>
  );
}

function DatacoreQueryExplorer() {
  const instanceId = useRef(Math.random().toString(36).substr(2, 5)).current;
  const uniqueWrapperClass = `query-explorer-${instanceId}`;
  const [isFullTab, setIsFullTab] = useState(true);
  const containerRef = useRef(null);
  const stateRefs = useRef({}).current;

  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const textareaRef = useRef(null);
  const inputAreaRef = useRef(null);
  const [helperState, setHelperState] = useState({
    type: null,
    step: null,
    searchTerm: "",
    startIndex: 0,
    context: {},
    position: { top: 0 },
  });
  const [operators, setOperators] = useState([]);
  const [activeOperator, setActiveOperator] = useState(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [showExamplesLibrary, setShowExamplesLibrary] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [activeLibraryCategory, setActiveLibraryCategory] = useState("All");
  const [queryTiming, setQueryTiming] = useState(null);

  // --- Gemini AI Assistant States ---
  const [aiTermsAccepted, setAiTermsAccepted] = useState(() => localStorage.getItem("datacore-ai-consent-v2") === "true");
  const [aiDebugInfo, setAiDebugInfo] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [hasKeyInKeychain, setHasKeyInKeychain] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [copilotHelperState, setCopilotHelperState] = useState({
    type: null,
    searchTerm: "",
    startIndex: -1,
  });

  const detectCopilotTrigger = (text, cursorIndex) => {
    if (copilotHelperState.type === "property_op") {
      return;
    }
    if (copilotHelperState.type === "property_value") {
      const propName = copilotHelperState.propertyName;
      const op = copilotHelperState.operator;
      let opString = "==";
      if (op === "contains") opString = ".contains";
      else if (op === "gt") opString = ">";
      else if (op === "lt") opString = "<";

      const prefix = `@property:${propName}`;
      const prefixIndex = text.indexOf(prefix);
      if (prefixIndex > -1) {
        const opIndex = text.indexOf(opString, prefixIndex + prefix.length);
        if (opIndex > -1) {
          let valuePart = text.substring(opIndex + opString.length);
          valuePart = valuePart.trim();
          if (valuePart.startsWith('("')) {
            valuePart = valuePart.substring(2);
          } else if (valuePart.startsWith('"') || valuePart.startsWith('(')) {
            valuePart = valuePart.substring(1);
          }
          if (valuePart.endsWith('")')) {
            valuePart = valuePart.substring(0, valuePart.length - 2);
          } else if (valuePart.endsWith('"') || valuePart.endsWith(')')) {
            valuePart = valuePart.substring(0, valuePart.length - 1);
          }
          setCopilotHelperState((prev) => ({
            ...prev,
            searchTerm: valuePart,
          }));
          return;
        }
      }
    }

    let i = cursorIndex - 1;
    while (i >= 0 && text[i] !== " " && text[i] !== "\n") {
      if (text[i] === "#" || text[i] === "/" || text[i] === "@") {
        if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
          const searchTerm = text.substring(i + 1, cursorIndex);
          setCopilotHelperState((prev) => {
            if (text[i] === "@") {
              const activeSubmenus = ["tag", "folder", "file", "property", "property_op", "property_value"];
              if (activeSubmenus.includes(prev.type) && prev.startIndex === i) {
                return { ...prev, searchTerm };
              }
              return { type: "main", searchTerm, startIndex: i };
            } else {
              const type = text[i] === "#" ? "tag" : "folder";
              return { type, searchTerm, startIndex: i };
            }
          });
          return;
        }
      }
      i--;
    }
    setCopilotHelperState({ type: null, searchTerm: "", startIndex: -1 });
  };

  const handleSelectCopilotCategory = (categoryId) => {
    setCopilotHelperState((prev) => ({
      ...prev,
      type: categoryId,
      searchTerm: "",
    }));
    setTimeout(() => {
      const textarea = document.querySelector(".dqb-copilot-textarea");
      if (textarea) {
        textarea.focus();
      }
    }, 50);
  };

  const handleSelectCopilotSuggestion = (selectedValue) => {
    if (copilotHelperState.type === "property") {
      const insertText = `@property:${selectedValue}`;
      const before = aiPrompt.substring(0, copilotHelperState.startIndex);
      const after = aiPrompt.substring(copilotHelperState.startIndex + copilotHelperState.searchTerm.length + 1);
      const newVal = before + insertText + " " + after;
      setAiPrompt(newVal);

      setCopilotHelperState((prev) => ({
        ...prev,
        type: "property_op",
        propertyName: selectedValue,
        searchTerm: "",
      }));
      return;
    }

    let insertText = selectedValue;
    if (copilotHelperState.type === "tag") {
      insertText = `@tag:${selectedValue}`;
    } else if (copilotHelperState.type === "folder") {
      insertText = `@path:"${selectedValue}"`;
    } else if (copilotHelperState.type === "file") {
      insertText = `@file:"${selectedValue}"`;
    }

    const before = aiPrompt.substring(0, copilotHelperState.startIndex);
    const after = aiPrompt.substring(copilotHelperState.startIndex + copilotHelperState.searchTerm.length + 1);
    const newVal = before + insertText + " " + after;
    setAiPrompt(newVal);
    setCopilotHelperState({ type: null, searchTerm: "", startIndex: -1 });

    setTimeout(() => {
      const textarea = document.querySelector(".dqb-copilot-textarea");
      if (textarea) {
        textarea.focus();
        const cursorLoc = copilotHelperState.startIndex + insertText.length + 1;
        textarea.setSelectionRange(cursorLoc, cursorLoc);
      }
    }, 50);
  };

  const handleSelectCopilotPropertyOperator = (opId) => {
    const propName = copilotHelperState.propertyName;
    if (opId === "any") {
      setCopilotHelperState({ type: null, searchTerm: "", startIndex: -1 });
      return;
    }

    let opTemplate = ` == ""`;
    if (opId === "contains") opTemplate = `.contains("")`;
    else if (opId === "gt") opTemplate = ` > `;
    else if (opId === "lt") opTemplate = ` < `;

    const before = aiPrompt.substring(0, copilotHelperState.startIndex);
    const newVal = before + `@property:${propName}${opTemplate}`;
    setAiPrompt(newVal);

    setCopilotHelperState((prev) => ({
      ...prev,
      type: "property_value",
      operator: opId,
      searchTerm: "",
    }));

    setTimeout(() => {
      const textarea = document.querySelector(".dqb-copilot-textarea");
      if (textarea) {
        textarea.focus();
        let cursorLoc = before.length + `@property:${propName}`.length + 5;
        if (opId === "contains") {
          cursorLoc = before.length + `@property:${propName}`.length + 11;
        } else if (opId === "gt" || opId === "lt") {
          cursorLoc = before.length + `@property:${propName}`.length + 4;
        }
        textarea.setSelectionRange(cursorLoc, cursorLoc);
      }
    }, 50);
  };

  const handleSelectCopilotPropertyValue = (selectedValue) => {
    const propName = copilotHelperState.propertyName;
    const op = copilotHelperState.operator;
    let insertText = `@property:${propName}`;

    if (op === "eq") {
      insertText = `@property:${propName} == "${selectedValue}"`;
    } else if (op === "contains") {
      insertText = `@property:${propName}.contains("${selectedValue}")`;
    } else if (op === "gt") {
      insertText = `@property:${propName} > ${selectedValue}`;
    } else if (op === "lt") {
      insertText = `@property:${propName} < ${selectedValue}`;
    }

    const before = aiPrompt.substring(0, copilotHelperState.startIndex);
    const newVal = before + insertText + " ";
    setAiPrompt(newVal);
    setCopilotHelperState({ type: null, searchTerm: "", startIndex: -1 });

    setTimeout(() => {
      const textarea = document.querySelector(".dqb-copilot-textarea");
      if (textarea) {
        textarea.focus();
        const cursorLoc = before.length + insertText.length + 1;
        textarea.setSelectionRange(cursorLoc, cursorLoc);
      }
    }, 50);
  };

  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [aiMessages, setAiMessages] = useState(() => [
    {
      role: "assistant",
      content: "👋 Hi! I'm your Datacore Query Copilot. Describe what data you want to build or filter, and I'll generate a valid, validated query for you!"
    }
  ]);

  // Dynamic Metadata Extractor to feed Gemini for context-aware query generation
  const getVaultMetadata = () => {
    try {
      const pages = dc.api.query("@page");
      const tagSet = new Set();
      const folderSet = new Set();
      const fieldSet = new Set();

      for (const note of pages) {
        if (note.$tags) {
          for (const t of note.$tags) {
            tagSet.add(t.replace(/^#/, ""));
            if (tagSet.size >= 15) break;
          }
        }
        const path = note.$path;
        if (path) {
          const lastSlash = path.lastIndexOf("/");
          if (lastSlash > -1) {
            const folder = path.substring(0, lastSlash);
            // Exclude system, repository, or private skill directories to keep context clean and self-contained
            if (!folder.startsWith(".") && 
                !folder.toLowerCase().includes("node_modules") && 
                !folder.toLowerCase().includes("betoskills") && 
                !folder.includes("_RESOURCES") && 
                !folder.includes("_DONE")) {
              folderSet.add(folder);
            }
          }
        }
        const ignored = new Set(["$parent", "$blocks", "file"]);
        for (const key of Object.keys(note)) {
          if (!ignored.has(key) && !key.startsWith("$")) {
            fieldSet.add(key);
          }
        }
      }

      return {
        tags: Array.from(tagSet).slice(0, 15),
        folders: Array.from(folderSet).slice(0, 10),
        fields: Array.from(fieldSet).slice(0, 15)
      };
    } catch (e) {
      console.error("Failed to gather vault metadata", e);
      return { tags: [], folders: [], fields: [] };
    }
  };

  // Local adaptive learning logs utilities
  const getSkillPrompt = async () => {
    try {
      const skillPath = folderPath + "/data/SKILL.md";
      const adapter = dc.app.vault.adapter;
      if (await adapter.exists(skillPath)) {
        return await adapter.read(skillPath);
      }
    } catch (e) {
      console.error("Failed to read SKILL.md system prompt instructions", e);
    }
    return `You are an expert helper for Datacore, a powerful query plugin for Obsidian.
Generate a valid Datacore query string based on the user's natural language request.
Output ONLY the raw query string inside a JSON block: {"query": "YOUR_QUERY_STRING"}. Do not include markdown codeblocks or other explanations.
Use AND/OR/!not for logic.`;
  };

  const saveLearnedLesson = async (promptText, incorrectQuery, errText, correctedQuery) => {
    try {
      const skillPath = folderPath + "/data/SKILL.md";
      const adapter = dc.app.vault.adapter;
      let existingContent = "";
      if (await adapter.exists(skillPath)) {
        existingContent = await adapter.read(skillPath);
      } else {
        existingContent = "# Datacore AI Query Assistant Skill Guide\n\n## Learned Lessons & Corrections\n";
      }
      
      const newLesson = `\n### Lesson: ${promptText.slice(0, 50)}${promptText.length > 50 ? "..." : ""}\n- **Request**: "${promptText}"\n- **Incorrect Query**: \`${incorrectQuery}\`\n- **Error**: "${errText}"\n- **Corrected Working Query**: \`${correctedQuery}\`\n`;
      
      await adapter.write(skillPath, existingContent + newLesson);
      console.log("[AI Learning] Successfully recorded corrected syntax lesson directly to SKILL.md!");
    } catch (e) {
      console.error("Failed to record learned lesson directly to SKILL.md", e);
    }
  };

  const KEYCHAIN_KEY = "datacore-gemini-apikey";

  // Load key from keychain on mount
  useEffect(() => {
    const loadKey = async () => {
      try {
        const storage = dc.app.secretStorage || (window.app && window.app.secretStorage);
        if (storage) {
          let keyVal = "";
          if (typeof storage.getSecret === "function") {
            keyVal = await storage.getSecret(KEYCHAIN_KEY);
          } else if (storage.secrets && storage.secrets[KEYCHAIN_KEY]) {
            keyVal = storage.secrets[KEYCHAIN_KEY];
          }
          if (keyVal) {
            setGeminiKey(keyVal);
            setHasKeyInKeychain(true);
          }
        }
      } catch (e) {
        console.error("Failed to load Gemini API Key from Keychain", e);
      }
    };
    loadKey();
  }, []);

  const handleSaveKey = async (newKey) => {
    if (!newKey.trim()) return;
    try {
      const storage = dc.app.secretStorage || (window.app && window.app.secretStorage);
      if (storage) {
        if (typeof storage.setSecret === "function") {
          await storage.setSecret(KEYCHAIN_KEY, newKey);
        } else if (storage.secrets) {
          storage.secrets[KEYCHAIN_KEY] = newKey;
          if (storage.saveSecrets) await storage.saveSecrets();
          else if (storage.save) await storage.save();
        }
        setHasKeyInKeychain(true);
        setGeminiKey(newKey);
        setAiError(null);
      }
    } catch (e) {
      console.error("Failed to save Gemini API Key to Keychain", e);
      setAiError("Failed to save to Keychain: " + e.message);
    }
  };

  const handleDeleteKey = async () => {
    try {
      const storage = dc.app.secretStorage || (window.app && window.app.secretStorage);
      if (storage) {
        if (typeof storage.deleteSecret === "function") {
          await storage.deleteSecret(KEYCHAIN_KEY);
        } else if (storage.secrets && storage.secrets[KEYCHAIN_KEY]) {
          delete storage.secrets[KEYCHAIN_KEY];
          if (storage.saveSecrets) await storage.saveSecrets();
          else if (storage.save) await storage.save();
        }
        setHasKeyInKeychain(false);
        setGeminiKey("");
        setAiError(null);
      }
    } catch (e) {
      console.error("Failed to delete key", e);
    }
  };

  const handleGenerateQuery = async () => {
    if (!geminiKey) {
      setAiError("Please provide a Gemini API Key first.");
      return;
    }
    if (!aiPrompt.trim()) {
      setAiError("Please describe what data query you want to build.");
      return;
    }
    const userPrompt = aiPrompt;
    setAiMessages(prev => [...prev, { role: "user", content: userPrompt }]);
    setGenerating(true);
    setAiError(null);

    const metadata = getVaultMetadata();
    const skillPrompt = await getSkillPrompt();

    const systemPrompt = `${skillPrompt}

VAULT SCHEMA CONTEXT:
- Active Tags in vault: ${metadata.tags.map(t => "#" + t).join(", ") || "None"}
- Active Folders in vault: ${metadata.folders.map(f => `"${f}"`).join(", ") || "None"}
- Active Custom Properties in vault: ${metadata.fields.join(", ") || "None"}`;

    // Filter out the initial welcome message from history to prevent cluttering context
    const cleanHistory = aiMessages.filter(
      msg => !msg.content.includes("I see you're working on this query") && !msg.content.includes("Hi! I am your Datacore Query Copilot")
    );

    const baseContents = cleanHistory.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content.includes("successfully generated") || msg.content.includes("self-healing successful")
        ? JSON.stringify({ query: msg.query || "" })
        : msg.content
      }]
    }));

    baseContents.push({
      role: "user",
      parts: [{ text: userPrompt }]
    });

    let attempts = 0;
    const maxAttempts = 3;
    let lastGeneratedQuery = "";
    let failedQueryOnAttempt = "";
    let queryRunErrorMsg = "";
    let activeContents = [...baseContents];

    while (attempts < maxAttempts) {
      attempts++;
      try {
        // Dynamic Model Discovery to fetch only supported models on the user's key
        let availableModels = [];
        try {
          const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
          const listRes = await fetch(listUrl);
          if (listRes.ok) {
            const listData = await listRes.json();
            if (listData.models) {
              availableModels = listData.models
                .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
                .map(m => m.name.replace("models/", ""));
            }
          }
        } catch (listErr) {
          console.warn("[Gemini Fallback] Failed to fetch dynamic models list:", listErr);
        }

        // Safe known fallback order if list is empty or fails
        if (availableModels.length === 0) {
          availableModels = ["gemini-3.1-flash", "gemini-3.0-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash-latest"];
        } else {
          // Dynamic Sorter: extracts versions (e.g. 3.1, 3.0, 2.5, 1.5) and places highest first,
          // prioritizing "flash" over "pro" to get the absolute fastest generation.
          availableModels.sort((a, b) => {
            const getVersion = (name) => {
              const match = name.match(/gemini-(\d+(?:\.\d+)?)/);
              return match ? parseFloat(match[1]) : 0;
            };
            const versionA = getVersion(a);
            const versionB = getVersion(b);
            if (versionA !== versionB) {
              return versionB - versionA;
            }
            const isFlashA = a.includes("flash") || a.includes("lite");
            const isFlashB = b.includes("flash") || b.includes("lite");
            if (isFlashA && !isFlashB) return -1;
            if (!isFlashA && isFlashB) return 1;
            return a.localeCompare(b);
          });
        }


        let response = null;
        let data = null;
        let lastError = null;

        for (const modelName of availableModels) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
            response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: activeContents,
                systemInstruction: { parts: [{ text: systemPrompt }] }
              })
            });
            data = await response.json();
            if (response.ok && !data.error) {
              lastError = null;
              break;
            } else {
              const errMsg = data.error?.message || "HTTP " + response.status;
              lastError = new Error(`Model ${modelName} failed: ${errMsg}`);
              console.warn(`[Gemini Fallback] ${modelName} failed/quota exceeded. Trying next. Error: ${errMsg}`);
            }
          } catch (fetchErr) {
            lastError = fetchErr;
            console.warn(`[Gemini Fallback] Fetch error for ${modelName}:`, fetchErr);
          }
        }

        if (lastError) {
          throw lastError;
        }


        // Log to debug panel
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
        setAiDebugInfo({
          prompt: JSON.stringify(activeContents),
          response: responseText,
          attempts: attempts,
          status: data.error ? "FAILED" : "COMPILING"
        });
        
        if (data.error) {
          throw new Error(data.error.message || "API Error");
        }
        
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let cleanedText = rawText.trim();
        if (cleanedText.includes("```")) {
          cleanedText = cleanedText.replace(/```json|```/g, "").trim();
        }
        
        let parsed = null;
        try {
          parsed = JSON.parse(cleanedText);
        } catch (jsonErr) {
          // Attempt highly resilient regex matching to extract the first valid JSON block
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[0].trim());
            } catch (innerErr) {
              console.error("[JSON Parser] Regex inner block parse failed:", innerErr);
            }
          }
        }

        if (!parsed || !parsed.query) {
          throw new Error("Invalid response schema: " + rawText);
        }


        lastGeneratedQuery = parsed.query;

        // --- SELF-HEALING / ERROR AUTO-FIXING LOOP ---
        try {
          dc.api.query(lastGeneratedQuery);
          
          // Successful execution run!
          if (attempts > 1 && failedQueryOnAttempt && queryRunErrorMsg) {
            await saveLearnedLesson(userPrompt, failedQueryOnAttempt, queryRunErrorMsg, lastGeneratedQuery);
          }
          
          setAiDebugInfo(prev => ({
            ...prev,
            status: "SUCCESS"
          }));

          let aiText = `I've successfully generated the query for you! Below is the code:

\`\`\`datacore
${lastGeneratedQuery}
\`\`\``;
          
          if (attempts > 1) {
            aiText = `🔧 **Syntax self-healing successful!** 
On my first try, I encountered a syntax error: *"${queryRunErrorMsg}"* with the query \`${failedQueryOnAttempt}\`. 
I dynamically re-prompted Gemini and auto-corrected it to a working query:

\`\`\`datacore
${lastGeneratedQuery}
\`\`\`

This correction lesson has also been recorded directly inside \`SKILL.md\` so I will avoid this mistake in the future!`;
          }

          setAiMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content: aiText,
              query: lastGeneratedQuery
            }
          ]);

          setInputValue(lastGeneratedQuery);
          setAiPrompt("");
          setGenerating(false);
          return;
        } catch (queryRunError) {
          console.warn(`[AI Self-Healing] Attempt ${attempts} failed for query: "${lastGeneratedQuery}". Error: ${queryRunError.message}`);
          
          queryRunErrorMsg = queryRunError.message;
          failedQueryOnAttempt = lastGeneratedQuery;
          
          if (attempts >= maxAttempts) {
            throw new Error(`Datacore syntax error: ${queryRunError.message}`);
          }
          
          // Append the self-healing prompts in active conversation history
          activeContents.push({
            role: "model",
            parts: [{ text: JSON.stringify({ query: lastGeneratedQuery }) }]
          });
          activeContents.push({
            role: "user",
            parts: [{ text: `Executing that query returned this syntax error: "${queryRunError.message}"

Please analyze this error carefully and output a corrected, valid Datacore query string inside the JSON block: {"query": "CORRECTED_QUERY_STRING"}. Do not make the same mistake.` }]
          });
        }

      } catch (e) {
        if (attempts >= maxAttempts) {
          setAiDebugInfo(prev => ({
            ...prev,
            status: "FAILED",
            response: prev ? prev.response + "\n\nError: " + e.message : e.message
          }));

          const failText = `❌ **Query Generation Failed** after ${maxAttempts} healing attempts.
* **Error**: "${e.message}"
${failedQueryOnAttempt ? `* **Failed Query**: \`${failedQueryOnAttempt}\`` : ""}`;

          setAiMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content: failText
            }
          ]);

          setAiError("AI Query generation failed: " + e.message);
          setGenerating(false);
          return;
        }
        
        // Wait 1.5 seconds before retrying on API / transient error
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  };

  // --- Full Tab Effect ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isFullTab) return;

    // Suppress global Obsidian status bar and view footers
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      .status-bar,
      .view-footer,
      .workspace-leaf-content-footer {
        display: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    const targetPaneContent = findNearestAncestorWithClass(
      container,
      "workspace-leaf-content"
    );
    if (!targetPaneContent) {
      setIsFullTab(false);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      return;
    }

    const contentWrapper =
      findDirectChildByClass(targetPaneContent, "view-content") ||
      targetPaneContent;
    stateRefs.originalParent = container.parentNode;
    stateRefs.placeholder = document.createElement("div");
    stateRefs.placeholder.style.display = "none";
    container.parentNode.insertBefore(stateRefs.placeholder, container);

    stateRefs.parentPositionInfo = {
      element: contentWrapper,
      original: window.getComputedStyle(contentWrapper).position,
    };

    if (stateRefs.parentPositionInfo.original === "static") {
      contentWrapper.style.position = "relative";
    }

    contentWrapper.appendChild(container);
    Object.assign(container.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "9998",
      overflow: "auto",
    });

    return () => {
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
      if (stateRefs.placeholder?.parentNode) {
        stateRefs.placeholder.parentNode.replaceChild(
          container,
          stateRefs.placeholder
        );
      }
      if (stateRefs.parentPositionInfo?.element) {
        stateRefs.parentPositionInfo.element.style.position =
          stateRefs.parentPositionInfo.original === "static"
            ? ""
            : stateRefs.parentPositionInfo.original;
      }
      container.removeAttribute("style");
      Object.keys(stateRefs).forEach((key) => (stateRefs[key] = null));
    };
  }, [isFullTab]);

  // --- Effects ---
  useEffect(() => {
    setLoading(true);
    const handler = setTimeout(() => {
      const queryToRun = inputValue.trim();
      if (!queryToRun) {
        setResults(null);
        setLoading(false);
        setError(null);
        setQueryTiming(null);
        return;
      }
      setError(null);
      setCurrentPage(1);
      const t0 = performance.now();
      console.log(`%c[Datacore Explorer] Running Query: "${queryToRun}"`, "color: #9b87f5; font-weight: bold;");
      try {
        let queryResult = dc.api.query(queryToRun);
        const elapsed = performance.now() - t0;
        
        // Deduplicate results by $path or file.path to filter out identical notes
        if (Array.isArray(queryResult)) {
          const seenPaths = new Set();
          queryResult = queryResult.filter(item => {
            const path = item.$path || item.file?.path || item.id;
            if (!path) return true;
            if (seenPaths.has(path)) return false;
            seenPaths.add(path);
            return true;
          });
        }

        console.log(`%c[Datacore Explorer] Success! Completed in ${elapsed.toFixed(2)}ms. Unique Count: ${Array.isArray(queryResult) ? queryResult.length : 0}`, "color: #6bffb0; font-weight: bold;");
        
        if (Array.isArray(queryResult) && queryResult.length > 0) {
          console.groupCollapsed(`[Results Details - ${queryResult.length} items]`);
          queryResult.forEach((item, index) => {
            console.log(`Item #${index + 1}:`, {
              name: item.$name || item.text || "Untitled",
              typename: item.$typename || "Unknown Typename",
              types: item.$types || [],
              path: item.$path || item.file?.path || "No direct path",
              resolvedParentPath: (item.$parent?.$path || item.$page?.$path) || "None",
              raw: item
            });
          });
          console.groupEnd();
        }

        setResults(queryResult);
        setQueryTiming({ ms: elapsed.toFixed(2), count: Array.isArray(queryResult) ? queryResult.length : 0, error: null, query: queryToRun });
      } catch (e) {
        const elapsed = performance.now() - t0;
        console.error(`%c[Datacore Explorer] Syntax Error in ${elapsed.toFixed(2)}ms: ${e.message}`, "color: #ff7070; font-weight: bold;", e);
        setError(e);
        setResults(null);
        setQueryTiming({ ms: elapsed.toFixed(2), count: 0, error: e, query: queryToRun });
      }
      setLoading(false);
    }, 600);
    return () => clearTimeout(handler);
  }, [inputValue]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const regex = /\b(AND|OR)\b/g;
    const newOperators = [];
    let match;
    while ((match = regex.exec(inputValue)) !== null) {
      const position = getCoordsFromIndex(textareaRef.current, match.index);
      const opEndIndex = match.index + match[0].length;
      const nextChar = inputValue.substring(opEndIndex).trimStart()[0];
      newOperators.push({
        index: match.index,
        value: match[0],
        isNegated: nextChar === "!",
        position: position,
      });
    }
    setOperators(newOperators);
  }, [inputValue, textareaRef.current]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        helperState.type &&
        inputAreaRef.current &&
        !inputAreaRef.current.contains(event.target)
      ) {
        if (!event.target.closest('[title="Click to change operator"]')) {
          setHelperState({ type: null });
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [helperState.type]);

  // --- Handlers ---
  const checkAndSetHelpers = (query, cursorPosition) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const currentPosition = { top: textarea.offsetHeight + 2 };

    const triggerChar = query[cursorPosition - 1];
    const textBeforeTrigger = query.substring(0, cursorPosition - 1).trim();
    if (
      triggerChar === "$" &&
      (textBeforeTrigger === "" ||
        textBeforeTrigger.endsWith("AND") ||
        textBeforeTrigger.endsWith("OR"))
    ) {
      const newQuery =
        query.slice(0, cursorPosition - 1) + query.slice(cursorPosition);
      setInputValue(newQuery);
      setHelperState({
        type: "filter",
        step: "select_property",
        searchTerm: "",
        startIndex: cursorPosition - 1,
        context: {},
        position: currentPosition,
      });
      setTimeout(() => textarea.focus(), 0);
      return;
    }

    const fileRegex = /(connected|linkedto|linkedfrom)\(\[\[([^\]]*)\]\]\)/g;
    let match;
    while ((match = fileRegex.exec(query)) !== null) {
      const contentStartIndex = match.index + match[1].length + 3;
      const contentEndIndex = match.index + match[0].length - 2;
      if (
        cursorPosition >= contentStartIndex &&
        cursorPosition <= contentEndIndex
      ) {
        const currentSearchTerm = query.substring(
          contentStartIndex,
          contentEndIndex
        );
        setHelperState({
          type: "file",
          searchTerm: currentSearchTerm,
          startIndex: match.index,
          context: { function: match[1], fullMatch: match[0] },
          position: currentPosition,
        });
        return;
      }
    }
    const pathRegex = /path\("([^"]*)"\)/g;
    while ((match = pathRegex.exec(query)) !== null) {
      const contentStartIndex = match.index + 6;
      const contentEndIndex = match.index + match[0].length - 2;
      if (
        cursorPosition >= contentStartIndex &&
        cursorPosition <= contentEndIndex
      ) {
        const currentSearchTerm = query.substring(
          contentStartIndex,
          contentEndIndex
        );
        setHelperState({
          type: "folder",
          searchTerm: currentSearchTerm,
          startIndex: match.index,
          context: { fullMatch: match[0] },
          position: currentPosition,
        });
        return;
      }
    }
    const existsRegex = /exists\(([^)]*)\)/g;
    while ((match = existsRegex.exec(query)) !== null) {
      const contentStartIndex = match.index + 7;
      const contentEndIndex = match.index + match[0].length - 1;
      if (
        cursorPosition >= contentStartIndex &&
        cursorPosition <= contentEndIndex
      ) {
        const currentSearchTerm = query.substring(
          contentStartIndex,
          contentEndIndex
        );
        setHelperState({
          type: "property",
          searchTerm: currentSearchTerm,
          startIndex: match.index,
          context: { fullMatch: match[0] },
          position: currentPosition,
        });
        return;
      }
    }
    const textBeforeCursor = query.substring(0, cursorPosition);
    if (helperState.type === "filter") return;
    const fileMatch = textBeforeCursor.match(
      /(connected|linkedto|linkedfrom)\(\[\[([^\]]*)$/
    );
    if (fileMatch) {
      setHelperState({
        type: "file",
        searchTerm: fileMatch[2],
        startIndex: fileMatch.index,
        context: { function: fileMatch[1], fullMatch: fileMatch[0] },
        position: currentPosition,
      });
      return;
    }
    const pathMatch = textBeforeCursor.match(/path\("([^"]*)$/);
    if (pathMatch) {
      setHelperState({
        type: "folder",
        searchTerm: pathMatch[1],
        startIndex: pathMatch.index,
        context: { fullMatch: pathMatch[0] },
        position: currentPosition,
      });
      return;
    }
    const existsMatch = textBeforeCursor.match(/\bexists\(([^)]*)$/);
    if (existsMatch) {
      setHelperState({
        type: "property",
        searchTerm: existsMatch[1],
        startIndex: existsMatch.index,
        context: { fullMatch: existsMatch[0] },
        position: currentPosition,
      });
      return;
    }
    const tagMatch = textBeforeCursor.match(/#([\w-]*)$/);
    if (tagMatch) {
      setHelperState({
        type: "tag",
        searchTerm: tagMatch[1],
        startIndex: tagMatch.index,
        context: { fullMatch: tagMatch[0] },
        position: currentPosition,
      });
      return;
    }

    setHelperState({ type: null });
  };

  const handleBaseTypeChange = (newBase) => {
    if (!newBase) return;
    setInputValue((currentQuery) => {
      const baseTypeRegex = /@\w+(-list)?/g;
      return baseTypeRegex.test(currentQuery)
        ? currentQuery.replace(baseTypeRegex, newBase)
        : newBase + (currentQuery.trim() ? " AND " + currentQuery.trim() : "");
    });
    setHelperState({ type: null });
  };

  const handleAppend = (addon) => {
    const { value: fragment, helper: helperType, selection } = addon;
    const currentQuery = inputValue.trim();
    const prefix = currentQuery === "" ? "" : currentQuery + " AND ";
    const newQuery = prefix + fragment;
    setInputValue(newQuery);
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      if (selection) {
        const selectionStart = newQuery.length + selection.start_offset;
        const selectionEnd = selectionStart + selection.length;
        textarea.setSelectionRange(selectionStart, selectionEnd);
      } else {
        textarea.setSelectionRange(newQuery.length, newQuery.length);
      }
      if (helperType) {
        const startIndex = prefix.length;
        let context = { fullMatch: fragment };
        if (helperType === "file") {
          context.function = fragment.substring(0, fragment.indexOf("("));
        }
        setHelperState({
          type: helperType,
          step: null,
          searchTerm: "",
          startIndex: startIndex,
          context: context,
          position: { top: textarea.offsetHeight + 2 },
        });
      } else {
        setHelperState({ type: null });
      }
    }, 0);
  };

  const handleInputChange = (e) => {
    const { value, selectionStart } = e.target;
    setActiveOperator(null);
    setInputValue(value);
    
    if (manualMode) {
      return;
    }
    
    if (
      helperState.type === "filter" &&
      helperState.step === "select_property"
    ) {
      const newSearchTerm = value.substring(
        helperState.startIndex,
        selectionStart
      );
      setHelperState((s) => ({ ...s, searchTerm: newSearchTerm }));
    } else if (
      helperState.type === "filter" &&
      helperState.step === "select_value"
    ) {
      const newSearchTerm = value
        .substring(helperState.startIndex, selectionStart)
        .replace(/^"|"$/g, "");
      setHelperState((s) => ({ ...s, searchTerm: newSearchTerm }));
    } else if (helperState.type && !helperState.step) {
      const startIdx = helperState.startIndex;
      let endIdx = selectionStart;
      if (helperState.type === "tag") {
        const beforeCursor = value.substring(0, selectionStart);
        const tagMatch = beforeCursor.match(/#([\w-]*)$/);
        if (tagMatch) {
          setHelperState((s) => ({ ...s, searchTerm: tagMatch[1] }));
        } else {
          setHelperState({ type: null });
        }
      } else if (helperState.type === "folder") {
        const beforeCursor = value.substring(0, selectionStart);
        const pathMatch = beforeCursor.match(/path\("([^"]*)$/);
        if (pathMatch) {
          setHelperState((s) => ({ ...s, searchTerm: pathMatch[1] }));
        } else {
          setHelperState({ type: null });
        }
      } else if (helperState.type === "file") {
        const beforeCursor = value.substring(0, selectionStart);
        const fileMatch = beforeCursor.match(
          /(connected|linkedto|linkedfrom)\(\[\[([^\]]*)$/
        );
        if (fileMatch) {
          setHelperState((s) => ({ ...s, searchTerm: fileMatch[2] }));
        } else {
          setHelperState({ type: null });
        }
      } else if (helperState.type === "property") {
        const beforeCursor = value.substring(0, selectionStart);
        const existsMatch = beforeCursor.match(/\bexists\(([^)]*)$/);
        if (existsMatch) {
          setHelperState((s) => ({ ...s, searchTerm: existsMatch[1] }));
        } else {
          setHelperState({ type: null });
        }
      }
    }
  };

  const handleCursorMove = (e) => {
    if (manualMode) {
      return;
    }
    checkAndSetHelpers(e.target.value, e.target.selectionStart);
  };

  const handleTextareaScroll = () => {
    if (!textareaRef.current) return;
    const regex = /\b(AND|OR)\b/g;
    const newOperators = [];
    let match;
    while ((match = regex.exec(inputValue)) !== null) {
      const position = getCoordsFromIndex(textareaRef.current, match.index);
      const opEndIndex = match.index + match[0].length;
      const nextChar = inputValue.substring(opEndIndex).trimStart()[0];
      newOperators.push({
        index: match.index,
        value: match[0],
        isNegated: nextChar === "!",
        position: position,
      });
    }
    setOperators(newOperators);
    setActiveOperator(null);
  };

  const handleOperatorChange = (newOperatorValue) => {
    if (!activeOperator) return;
    const { index, value, isNegated } = activeOperator;
    let newQuery;
    const beforeOperator = inputValue.substring(0, index);
    const afterOperator = inputValue.substring(index + value.length);
    if (newOperatorValue === "AND" || newOperatorValue === "OR") {
      if (isNegated) {
        newQuery =
          beforeOperator +
          newOperatorValue +
          afterOperator.trimStart().substring(1);
      } else {
        newQuery = beforeOperator + newOperatorValue + afterOperator;
      }
    } else if (newOperatorValue === "!not") {
      if (isNegated) {
        newQuery =
          beforeOperator + value + afterOperator.trimStart().substring(1);
      } else {
        newQuery = beforeOperator + value + " !" + afterOperator.trimStart();
      }
    }
    setInputValue(newQuery);
    setActiveOperator(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(index, index);
    }, 0);
  };

  const handleHelperSelect = (selectedValue, type) => {
    const { startIndex, context } = helperState;
    let replacement = "";
    if (type === "tag") {
      replacement = `#${selectedValue} `;
    } else if (type === "folder") {
      replacement = `path("${selectedValue}") `;
    } else if (type === "file") {
      replacement = `${context.function}([[${selectedValue}]]) `;
    } else if (type === "property") {
      replacement = `exists(${selectedValue}) `;
    }
    const textBeforeFragment = inputValue.substring(0, startIndex);
    const endOfReplacementIndex = context.fullMatch
      ? startIndex + context.fullMatch.length
      : textareaRef.current.selectionEnd;
    const textAfterFragment = inputValue.substring(endOfReplacementIndex);
    const newQuery = textBeforeFragment + replacement + textAfterFragment;
    setInputValue(newQuery);
    setHelperState({ type: null });
    setTimeout(() => {
      const newCursorPos = (textBeforeFragment + replacement).length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleStartFilterWizard = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setInputValue((currentVal) => {
      const trimmed = currentVal.trim();
      const newQuery =
        trimmed === "" || trimmed.endsWith("AND") || trimmed.endsWith("OR")
          ? currentVal
          : currentVal + " AND ";
      setHelperState({
        type: "filter",
        step: "select_property",
        searchTerm: "",
        startIndex: newQuery.length,
        context: {},
        position: { top: textarea.offsetHeight + 2 },
      });
      setTimeout(() => textarea.focus(), 0);
      return newQuery;
    });
  };

  const handleFilterWizardStep = (selectedValue) => {
    const { step, context, startIndex } = helperState;
    if (step === "select_property") {
      const propertyText = selectedValue.includes(" ")
        ? `row["${selectedValue}"]`
        : selectedValue;
      const textBefore = inputValue.substring(0, startIndex);
      const textAfter = inputValue.substring(
        startIndex + helperState.searchTerm.length
      );
      const newQuery = textBefore + propertyText + textAfter;
      setInputValue(newQuery);
      setHelperState((s) => ({
        ...s,
        step: "select_operator",
        context: {
          ...s.context,
          property: propertyText,
          propertyName: selectedValue,
        },
        startIndex: (textBefore + propertyText).length,
      }));
    } else if (step === "select_operator") {
      const needsValueHelper = [".contains", "==", "!="].includes(
        selectedValue
      );
      if (needsValueHelper) {
        let textToInsert =
          selectedValue === ".contains"
            ? '.contains("")'
            : ` ${selectedValue} `;
        const newQuery = inputValue + textToInsert;
        setInputValue(newQuery);
        const cursorOffset = selectedValue === ".contains" ? -2 : 0;
        setHelperState((s) => ({
          ...s,
          step: "select_value",
          operator: selectedValue,
          searchTerm: "",
          startIndex: newQuery.length + cursorOffset,
          position: { top: textareaRef.current?.offsetHeight + 2 },
        }));
        setTimeout(() => {
          const newCursorPos = newQuery.length + cursorOffset;
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        let textToInsert = ` ${selectedValue} `;
        const newQuery = inputValue + textToInsert;
        setInputValue(newQuery);
        setHelperState({ type: null });
        setTimeout(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(
            newQuery.length,
            newQuery.length
          );
        }, 0);
      }
    }
  };

  const handleValueSelect = (selectedValue) => {
    const { startIndex } = helperState;
    const textBefore = inputValue.substring(0, startIndex);
    const textAfter = inputValue.substring(startIndex);
    const charBefore = textBefore[textBefore.length - 1];
    const charAfter = textAfter[0];
    const alreadyInQuotes =
      charBefore === '"' &&
      (charAfter === '"' || textAfter.indexOf('"') !== -1);
    const valueToInsert = alreadyInQuotes
      ? selectedValue
      : `"${selectedValue}"`;
    const newQuery = textBefore + valueToInsert + textAfter;
    setInputValue(newQuery);
    setHelperState({ type: null });
    setTimeout(() => {
      const newCursorPos = (textBefore + valueToInsert).length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // --- Styles & Render Logic ---
  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#09090f",
      color: "#e4e4f0",
      height: "100%",
      width: "100%",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
    },
    scrollArea: {
      flex: 1,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "16px 20px 28px 20px",
    },
    header: {
      padding: "11px 18px",
      borderBottom: "1px solid rgba(155,135,245,0.12)",
      background: "linear-gradient(180deg,rgba(155,135,245,0.06) 0%,transparent 100%)",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
    },
    titleArea: {
      display: "flex",
      alignItems: "center",
      gap: "9px",
      minWidth: 0,
      flex: 1,
    },
    titleText: {
      margin: 0,
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "700",
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
    },
    docLink: {
      fontSize: "10px",
      color: "#9b87f5",
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: "3px",
      padding: "3px 8px",
      border: "1px solid rgba(155,135,245,0.28)",
      borderRadius: "4px",
      transition: "all 0.15s",
      backgroundColor: "rgba(155,135,245,0.07)",
      whiteSpace: "nowrap",
      fontWeight: "600",
    },
    toolbar: {
      display: "flex",
      gap: "1px",
      alignItems: "center",
      flexShrink: 0,
    },
    toolbarBtn: {
      width: "29px",
      height: "29px",
      border: "none",
      background: "transparent",
      color: "#9090b0",
      cursor: "pointer",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.13s",
      flexShrink: 0,
    },
    toolbarBtnActive: {
      backgroundColor: "rgba(155,135,245,0.15)",
      color: "#9b87f5",
    },
    toolbarDivider: {
      width: "1px",
      height: "16px",
      backgroundColor: "rgba(155,135,245,0.18)",
      margin: "0 5px",
      flexShrink: 0,
    },
    card: {
      backgroundColor: "#111118",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      borderRadius: "8px",
      overflow: "visible",
    },
    cardHeader: {
      padding: "9px 14px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "rgba(255, 255, 255, 0.01)",
    },
    cardTitle: {
      margin: 0,
      fontSize: "10px",
      fontWeight: "700",
      color: "#a5a5c5",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flex: 1,
    },
    label: {
      display: "flex",
      alignItems: "center",
      gap: "7px",
      fontSize: "10px",
      fontWeight: "700",
      color: "#9090b0",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "6px",
    },
    modeBadge: {
      fontSize: "10px",
      color: "#9b87f5",
      backgroundColor: "rgba(155,135,245,0.12)",
      padding: "1px 8px",
      borderRadius: "20px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      border: "1px solid rgba(155,135,245,0.25)",
      textTransform: "none",
      letterSpacing: "normal",
    },
    inputWrapper: { position: "relative" },
    textarea: {
      width: "100%",
      minHeight: "72px",
      padding: "11px 14px",
      backgroundColor: "#0a0a12",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "6px",
      fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
      color: "#c8c8e8",
      fontSize: "13px",
      resize: "vertical",
      transition: "border-color 0.2s,box-shadow 0.2s",
      outline: "none",
      lineHeight: "1.65",
      boxSizing: "border-box",
    },
    helperContainer: {
      position: "absolute",
      width: "100%",
      left: 0,
      zIndex: 10,
      marginTop: "2px",
    },
    resultsContainer: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      borderRadius: "6px",
      overflow: "hidden",
      backgroundColor: "#0d0d16",
    },
    list: { flex: 1, overflowY: "auto" },
    paginationControls: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
      padding: "9px",
      borderTop: "1px solid rgba(155,135,245,0.09)",
      backgroundColor: "#09090f",
      flexShrink: 0,
    },
    pageButton: {
      padding: "4px 14px",
      backgroundColor: "rgba(155,135,245,0.08)",
      border: "1px solid rgba(155,135,245,0.25)",
      borderRadius: "5px",
      color: "#9b87f5",
      cursor: "pointer",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "12px",
    },
    pageButtonDisabled: {
      opacity: 0.3,
      cursor: "not-allowed",
    },
    pageInfo: {
      minWidth: "100px",
      textAlign: "center",
      color: "#9090b0",
      fontFamily: "monospace",
      fontSize: "12px",
    },
    operatorOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      padding: "11px 14px",
      border: "1px solid transparent",
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      fontSize: "13px",
      lineHeight: "1.65",
    },
    operatorHotspot: {
      position: "absolute",
      cursor: "pointer",
      pointerEvents: "auto",
      color: "#9b87f5",
      backgroundColor: "rgba(155,135,245,0.1)",
      borderRadius: "3px",
      borderBottom: "1px dashed rgba(155,135,245,0.5)",
    },
    compactWrapper: {
      padding: "20px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      border: "1px dashed rgba(155,135,245,0.22)",
      borderRadius: "8px",
      backgroundColor: "#09090f",
    },
    compactText: { margin: 0, color: "#9090b0", fontSize: "13px" },
    compactButton: {
      padding: "7px 18px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#09090f",
      backgroundColor: "#9b87f5",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    exitIcon: { position: "absolute", top: "12px", right: "12px", color: "#9b87f5", cursor: "pointer", opacity: 0, transition: "opacity 0.2s", zIndex: 10 },
  };

  const renderResults = () => {
    if (loading)
      return (
        <p style={{ textAlign: "center", padding: "20px", color: "#9090b0", fontFamily: "monospace", fontSize: "12px" }}>
          Running query…
        </p>
      );
    if (error)
      return (
        <div style={{ padding: "12px 14px", backgroundColor: "#1a0a0a", border: "1px solid rgba(255,112,112,0.3)", borderRadius: "6px" }}>
          <div style={{ color: "#ff7070", fontSize: "12px", fontWeight: "700", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <dc.Icon icon="alert-circle" style={{ fontSize: "13px" }} />
            Query Error
          </div>
          <code style={{ color: "#ff9090", fontSize: "12px", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{error.message}</code>
        </div>
      );
    if (!results)
      return (
        <p style={{ textAlign: "center", padding: "20px", color: "#555570", fontFamily: "monospace", fontSize: "12px" }}>
          Select a base type or type a query to begin.
        </p>
      );
    if (results.length === 0)
      return (
        <p style={{ textAlign: "center", padding: "20px", color: "#555570", fontFamily: "monospace", fontSize: "12px" }}>
          No results found.
        </p>
      );
    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = results.slice(startIndex, startIndex + itemsPerPage);
    return (
      <div style={styles.resultsContainer}>
        <div style={styles.list}>
          {currentItems.map((item, index) => (
            <ResultItem key={startIndex + index} item={item} />
          ))}
        </div>
        {totalPages > 1 && (
          <div style={styles.paginationControls}>
            <button
              style={{ ...styles.pageButton, ...(currentPage === 1 ? styles.pageButtonDisabled : {}) }}
              onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
              disabled={currentPage === 1}
            >
              <dc.Icon icon="chevron-left" style={{ fontSize: "13px" }} />
              Prev
            </button>
            <span style={styles.pageInfo}>{currentPage} / {totalPages}</span>
            <button
              style={{ ...styles.pageButton, ...(currentPage >= totalPages ? styles.pageButtonDisabled : {}) }}
              onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
              <dc.Icon icon="chevron-right" style={{ fontSize: "13px" }} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const filteredLibrary = QUERY_LIBRARY.filter((ex) => {
    const catOk = activeLibraryCategory === "All" || ex.category === activeLibraryCategory;
    const q = librarySearch.toLowerCase();
    const searchOk = !q || ex.label.toLowerCase().includes(q) || ex.query.toLowerCase().includes(q) || ex.desc.toLowerCase().includes(q);
    return catOk && searchOk;
  });

  const renderExamplesLibrary = () => (
    <div style={{ ...styles.card, maxHeight: "390px", display: "flex", flexDirection: "column" }}>
      <div style={{ ...styles.cardHeader, flexWrap: "wrap", gap: "8px" }}>
        <h4 style={styles.cardTitle}>
          <dc.Icon icon="library" style={{ fontSize: "12px" }} />
          Examples Library
        </h4>
        <input
          placeholder="Search…"
          value={librarySearch}
          onChange={(e) => setLibrarySearch(e.target.value)}
          style={{ padding: "3px 9px", backgroundColor: "#0a0a12", border: "1px solid rgba(155,135,245,0.25)", borderRadius: "4px", color: "#c8c8e8", fontFamily: "monospace", fontSize: "11px", width: "140px", outline: "none" }}
        />
      </div>
      <div style={{ padding: "7px 12px", borderBottom: "1px solid rgba(155,135,245,0.07)", display: "flex", gap: "4px", flexWrap: "wrap", flexShrink: 0, backgroundColor: "rgba(0,0,0,0.15)" }}>
        {LIBRARY_CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => setActiveLibraryCategory(cat)}
            style={{
              padding: "2px 9px", fontSize: "10px", border: "1px solid", borderRadius: "20px", cursor: "pointer",
              fontFamily: "monospace", fontWeight: "600", transition: "all 0.12s",
              borderColor: activeLibraryCategory === cat ? "#9b87f5" : "rgba(155,135,245,0.2)",
              backgroundColor: activeLibraryCategory === cat ? "#9b87f5" : "transparent",
              color: activeLibraryCategory === cat ? "#09090f" : "#9090b0",
            }}
          >{cat}</button>
        ))}
      </div>
      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px", padding: "6px 8px" }}>
        {filteredLibrary.length === 0 && (
          <p style={{ color: "#555570", fontFamily: "monospace", fontSize: "11px", textAlign: "center", margin: "14px 0" }}>No examples match your search.</p>
        )}
        {filteredLibrary.map((ex, i) => {
          const isActive = inputValue.trim() === ex.query.trim();
          return (
            <div key={i}
              style={{
                display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 10px",
                borderRadius: "5px", cursor: "pointer", transition: "all 0.12s",
                border: `1px solid ${isActive ? "rgba(155,135,245,0.5)" : "transparent"}`,
                backgroundColor: isActive ? "rgba(155,135,245,0.08)" : "transparent",
              }}
              onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.border = "1px solid rgba(155,135,245,0.28)"; e.currentTarget.style.backgroundColor = "rgba(155,135,245,0.05)"; } }}
              onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.border = "1px solid transparent"; e.currentTarget.style.backgroundColor = "transparent"; } }}
              onClick={() => setInputValue(ex.query)}
              title={ex.desc}
            >
              <div style={{ width: "24px", height: "24px", borderRadius: "5px", backgroundColor: "rgba(155,135,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                <dc.Icon icon={ex.icon} style={{ fontSize: "12px", color: "#9b87f5" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#e4e4f0", fontWeight: "600", lineHeight: "1.3" }}>{ex.label}</div>
                <code style={{ fontSize: "11px", color: "#7c6fe0", display: "block", marginTop: "2px", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: "1.4" }}>{ex.query}</code>
                <div style={{ fontSize: "10px", color: "#555570", marginTop: "2px", lineHeight: "1.4" }}>{ex.desc}</div>
              </div>
              {isActive && <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#9b87f5", flexShrink: 0, marginTop: "9px" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDebugPanel = () => (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h4 style={styles.cardTitle}>
          <dc.Icon icon="bug" style={{ fontSize: "12px" }} />
          Debug Panel
        </h4>
      </div>
      <div style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "11px" }}>
        {!queryTiming && !inputValue.trim() && !aiDebugInfo && (
          <p style={{ color: "#555570", margin: 0 }}>Run a query to see debug info.</p>
        )}
        {queryTiming && (
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "5px 14px", alignItems: "start" }}>
            <span style={{ color: "#9090b0" }}>Execution time</span>
            <span style={{ color: "#e4e4f0" }}>{queryTiming.ms} ms</span>
            <span style={{ color: "#9090b0" }}>Result count</span>
            <span style={{ color: queryTiming.error ? "#ff7070" : "#6bffb0" }}>{queryTiming.error ? "—" : queryTiming.count}</span>
            <span style={{ color: "#9090b0" }}>Status</span>
            <span style={{ color: queryTiming.error ? "#ff7070" : "#6bffb0", fontWeight: "700" }}>{queryTiming.error ? "FAILED" : "OK"}</span>
            <span style={{ color: "#9090b0", alignSelf: "flex-start" }}>Query</span>
            <code style={{ color: "#c8c8e8", backgroundColor: "#0a0a12", padding: "3px 7px", borderRadius: "3px", whiteSpace: "pre-wrap", wordBreak: "break-all", display: "block", border: "1px solid rgba(255,255,255,0.05)" }}>{queryTiming.query}</code>
            {queryTiming.error && (
              <>
                <span style={{ color: "#ff7070", alignSelf: "flex-start" }}>Error</span>
                <span style={{ color: "#ff7070" }}>{queryTiming.error.message}</span>
                {queryTiming.error.stack && (
                  <>
                    <span style={{ color: "#ff7070", alignSelf: "flex-start" }}>Stack</span>
                    <pre style={{ color: "#ff9090", margin: 0, fontSize: "10px", maxHeight: "110px", overflowY: "auto", backgroundColor: "#1a0a0a", padding: "5px", borderRadius: "3px", border: "1px solid rgba(255,112,112,0.2)" }}>{queryTiming.error.stack}</pre>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {aiDebugInfo && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "12px", paddingTop: "12px" }}>
            <div style={{ color: "#9b87f5", fontWeight: "700", marginBottom: "8px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
              <dc.Icon icon="sparkles" style={{ fontSize: "12px" }} />
              Gemini AI Copilot Debug Logs
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "5px 14px", alignItems: "start" }}>
              <span style={{ color: "#9090b0" }}>AI Status</span>
              <span style={{ color: aiDebugInfo.status === "FAILED" ? "#ff7070" : "#6bffb0", fontWeight: "700" }}>{aiDebugInfo.status}</span>
              <span style={{ color: "#9090b0" }}>Healing Attempts</span>
              <span style={{ color: "#e4e4f0" }}>{aiDebugInfo.attempts} / 3</span>
              <span style={{ color: "#9090b0", alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: "4px" }}>
                Raw Sent Prompt
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiDebugInfo.prompt);
                    setNotification("Prompt copied to clipboard!");
                    setTimeout(() => setNotification(null), 2000);
                  }}
                  style={{
                    alignSelf: "flex-start",
                    fontSize: "9px",
                    color: "#9b87f5",
                    background: "rgba(155,135,245,0.08)",
                    border: "1px solid rgba(155,135,245,0.2)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    marginTop: "2px"
                  }}
                >
                  <dc.Icon icon="copy" style={{ fontSize: "9px" }} /> Copy
                </button>
              </span>
              <pre style={{ color: "#9090b0", margin: 0, fontSize: "10px", maxHeight: "150px", overflowY: "auto", backgroundColor: "#07070c", padding: "8px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.05)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{aiDebugInfo.prompt}</pre>
              <span style={{ color: "#9090b0", alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: "4px" }}>
                Raw JSON Response
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiDebugInfo.response);
                    setNotification("Response payload copied to clipboard!");
                    setTimeout(() => setNotification(null), 2000);
                  }}
                  style={{
                    alignSelf: "flex-start",
                    fontSize: "9px",
                    color: "#9b87f5",
                    background: "rgba(155,135,245,0.08)",
                    border: "1px solid rgba(155,135,245,0.2)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    marginTop: "2px"
                  }}
                >
                  <dc.Icon icon="copy" style={{ fontSize: "9px" }} /> Copy
                </button>
              </span>
              <pre style={{ color: "#00d2ff", margin: 0, fontSize: "10px", maxHeight: "150px", overflowY: "auto", backgroundColor: "#07070c", padding: "8px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.05)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{aiDebugInfo.response}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isFullTab) {
    return (
      <div ref={containerRef} style={styles.compactWrapper}>
        <dc.Icon icon="search" style={{ fontSize: "22px", color: "rgba(155,135,245,0.35)" }} />
        <p style={styles.compactText}>Query Explorer — compact mode</p>
        <button
          style={styles.compactButton}
          onClick={() => setIsFullTab(true)}
          onMouseOver={(e) => { e.currentTarget.style.filter = "brightness(1.12)"; }}
          onMouseOut={(e) => { e.currentTarget.style.filter = ""; }}
        >
          <dc.Icon icon="maximize-2" style={{ fontSize: "13px" }} />
          Enter Full Tab
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: "100%", width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{`
        .dqb-toolbar-btn:hover { background: rgba(155,135,245,0.13) !important; color: #c0b0ff !important; }
        .dqb-doc-link:hover { background: rgba(155,135,245,0.2) !important; color: #fff !important; border-color: rgba(155,135,245,0.6) !important; }
        .dqb-ex-load:hover { background: rgba(155,135,245,0.18) !important; border-color: rgba(155,135,245,0.5) !important; color: #fff !important; }
        #query-input:focus { border-color: rgba(155,135,245,0.55) !important; box-shadow: 0 0 0 3px rgba(155,135,245,0.07) !important; }
        .dqb-scrollarea::-webkit-scrollbar { width: 4px; }
        .dqb-scrollarea::-webkit-scrollbar-track { background: transparent; }
        .dqb-scrollarea::-webkit-scrollbar-thumb { background: rgba(155,135,245,0.25); border-radius: 2px; }
      `}</style>
      <div style={styles.container}>
        {notification && (
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#9b87f5",
              color: "#000",
              padding: "10px 18px",
              borderRadius: "6px",
              boxShadow: "0 8px 24px rgba(155, 135, 245, 0.4)",
              zIndex: 10005,
              fontSize: "12px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: "slideInUp 0.2s ease-out"
            }}
          >
            <dc.Icon icon="check-circle" style={{ fontSize: "14px" }} />
            {notification}
          </div>
        )}

        {/* ── HEADER ────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <dc.Icon icon="search" style={{ fontSize: "16px", color: "#9b87f5", flexShrink: 0 }} />
            <h1 style={styles.titleText}>Datacore Query Explorer</h1>
            <div style={{ display: "flex", gap: "5px", marginLeft: "6px" }}>
              <a href="https://blacksmithgu.github.io/datacore/" target="_blank" rel="noopener noreferrer"
                className="dqb-doc-link" style={styles.docLink}>
                <dc.Icon icon="book-open" style={{ fontSize: "10px" }} /> Docs
              </a>
              <a href="https://deepwiki.com/blacksmithgu/datacore" target="_blank" rel="noopener noreferrer"
                className="dqb-doc-link" style={styles.docLink}>
                <dc.Icon icon="globe" style={{ fontSize: "10px" }} /> DeepWiki
              </a>
            </div>
          </div>
          <div style={styles.toolbar}>
            <button className="dqb-toolbar-btn"
              style={{ ...styles.toolbarBtn, ...(showAIAssistant ? styles.toolbarBtnActive : {}) }}
              onClick={() => setShowAIAssistant((v) => !v)}
              title="AI Query Assistant">
              <dc.Icon icon="sparkles" style={{ fontSize: "14px" }} />
            </button>
            <button className="dqb-toolbar-btn"
              style={{ ...styles.toolbarBtn, ...(manualMode ? styles.toolbarBtnActive : {}) }}
              onClick={() => setManualMode(!manualMode)}
              title={manualMode ? "Manual Mode ON" : "Enable Manual Mode"}>
              <dc.Icon icon={manualMode ? "pencil" : "wand"} style={{ fontSize: "14px" }} />
            </button>
            <button className="dqb-toolbar-btn"
              style={{ ...styles.toolbarBtn, ...((!showCheatsheet && !showExamplesLibrary && !showDebugPanel) ? styles.toolbarBtnActive : {}) }}
              onClick={() => { setShowCheatsheet(false); setShowExamplesLibrary(false); setShowDebugPanel(false); }}
              title="Quick Start">
              <dc.Icon icon="zap" style={{ fontSize: "14px" }} />
            </button>
            <button className="dqb-toolbar-btn"
              style={{ ...styles.toolbarBtn, ...(showCheatsheet ? styles.toolbarBtnActive : {}) }}
              onClick={() => { setShowCheatsheet((v) => !v); setShowExamplesLibrary(false); }}
              title="Syntax Reference">
              <dc.Icon icon="book" style={{ fontSize: "14px" }} />
            </button>
            <button className="dqb-toolbar-btn"
              style={{ ...styles.toolbarBtn, ...(showExamplesLibrary ? styles.toolbarBtnActive : {}) }}
              onClick={() => { setShowExamplesLibrary((v) => !v); setShowCheatsheet(false); }}
              title="Examples Library">
              <dc.Icon icon="library" style={{ fontSize: "14px" }} />
            </button>
            <button className="dqb-toolbar-btn"
              style={{ ...styles.toolbarBtn, ...(showDebugPanel ? styles.toolbarBtnActive : {}) }}
              onClick={() => setShowDebugPanel((v) => !v)}
              title="Debug Panel">
              <dc.Icon icon="bug" style={{ fontSize: "14px" }} />
            </button>
            <div style={styles.toolbarDivider} />
            <button className="dqb-toolbar-btn" style={styles.toolbarBtn}
              onClick={() => setIsFullTab(false)} title="Exit Full Tab">
              <dc.Icon icon="minimize-2" style={{ fontSize: "14px" }} />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ─────────────────────────────── */}
        <div style={styles.scrollArea} className="dqb-scrollarea">

          {/* TOP SECTION: 2 columns (Left: Editor & options, Right: Library info panels) */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "20px" }}>
            
            {/* LEFT COLUMN: Query editor and direct options */}
            <div style={{ flex: 1, minWidth: "320px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Query Input Card */}
              <div style={{ ...styles.card, padding: "16px" }}>
                <div style={styles.label}>
                  <dc.Icon icon="terminal" style={{ fontSize: "10px" }} />
                  Live Query
                  {manualMode && (
                    <span style={styles.modeBadge}>
                      <dc.Icon icon="pencil" style={{ fontSize: "9px" }} /> Manual
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    onClick={() => setManualMode(!manualMode)}
                    style={{
                      padding: "4px 11px",
                      backgroundColor: manualMode ? "rgba(155,135,245,0.15)" : "transparent",
                      border: `1px solid ${manualMode ? "rgba(155,135,245,0.6)" : "rgba(155,135,245,0.2)"}`,
                      borderRadius: "5px",
                      color: manualMode ? "#9b87f5" : "#9090b0",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "all 0.15s",
                    }}
                  >
                    <dc.Icon icon={manualMode ? "pencil" : "wand"} style={{ fontSize: "11px" }} />
                    {manualMode ? "Manual Mode ON" : "Enable Manual Mode"}
                  </button>
                  <span style={{ fontSize: "11px", color: "#555570" }}>
                    {manualMode ? "Auto-helpers disabled" : "Auto-helpers active"}
                  </span>
                </div>
                <div style={styles.inputWrapper} ref={inputAreaRef}>
                  <textarea
                    ref={textareaRef}
                    id="query-input"
                    style={styles.textarea}
                    value={inputValue}
                    onChange={handleInputChange}
                    onScroll={handleTextareaScroll}
                    onClick={handleCursorMove}
                    onKeyUp={handleCursorMove}
                    placeholder="Type a query… e.g. @page and rating >= 7"
                  />
                  {helperState.type && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "300px",
                        maxHeight: "180px",
                        overflowY: "auto",
                        zIndex: 100,
                        backgroundColor: "#161624",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "6px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                        padding: "4px"
                      }}
                    >
                      {helperState.type === "tag" && (
                        <TagHelper searchTerm={helperState.searchTerm} onTagSelect={(val) => handleHelperSelect(val, "tag")} />
                      )}
                      {helperState.type === "folder" && (
                        <FolderHelper searchTerm={helperState.searchTerm} onFolderSelect={(val) => handleHelperSelect(val, "folder")} />
                      )}
                      {helperState.type === "file" && (
                        <FileHelper searchTerm={helperState.searchTerm} onFileSelect={(val) => handleHelperSelect(val, "file")} />
                      )}
                      {helperState.type === "property" && (
                        <GenericPropertyHelper searchTerm={helperState.searchTerm} onPropertySelect={(val) => handleHelperSelect(val, "property")} />
                      )}
                      {helperState.type === "filter" && helperState.step === "select_property" && (
                        <GenericPropertyHelper searchTerm={helperState.searchTerm} onPropertySelect={handleFilterWizardStep} />
                      )}
                      {helperState.type === "filter" && helperState.step === "select_operator" && (
                        <ComparisonOperatorHelper
                          fieldName={helperState.context.propertyName || helperState.context.property}
                          onOperatorSelect={handleFilterWizardStep}
                        />
                      )}
                      {helperState.type === "filter" && helperState.step === "select_value" && (
                        <FieldValueHelper
                          searchTerm={helperState.searchTerm}
                          onValueSelect={handleValueSelect}
                          fieldName={helperState.context.property}
                          operator={helperState.operator}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Query Controls */}
              <QueryControls
                onBaseTypeChange={handleBaseTypeChange}
                onAppend={handleAppend}
                onStartFilterWizard={handleStartFilterWizard}
              />

            </div>

            {/* RIGHT COLUMN: Quick Start / Examples library / Cheatsheet / Debug panel */}
            <div style={{ width: "420px", minWidth: "320px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "490px", overflowY: "auto", paddingRight: "4px" }}>
              {/* Quick Start (shown inside right panel by default when not browsing library/cheatsheet/debug) */}
              {!showExamplesLibrary && !showCheatsheet && !showDebugPanel && (
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h4 style={styles.cardTitle}>
                      <dc.Icon icon="zap" style={{ fontSize: "12px" }} />
                      Quick Start
                    </h4>
                    <button
                      onClick={() => setShowExamplesLibrary(true)}
                      style={{ fontSize: "10px", color: "#9b87f5", background: "rgba(155,135,245,0.09)", border: "1px solid rgba(155,135,245,0.22)", borderRadius: "4px", padding: "3px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s" }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(155,135,245,0.2)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(155,135,245,0.09)"; }}
                    >
                      <dc.Icon icon="library" style={{ fontSize: "10px" }} /> Browse All
                    </button>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {QUERY_LIBRARY.slice(0, 8).map((ex, i) => (
                      <button
                        key={i}
                        className="dqb-ex-load"
                        style={{
                          padding: "4px 10px",
                          backgroundColor: "rgba(155,135,245,0.06)",
                          border: "1px solid rgba(155,135,245,0.17)",
                          borderRadius: "5px",
                          color: "#c8c8e8",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          transition: "all 0.12s",
                        }}
                        onClick={() => setInputValue(ex.query)}
                        title={ex.desc}
                      >
                        <dc.Icon icon={ex.icon} style={{ fontSize: "11px" }} />
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showExamplesLibrary && renderExamplesLibrary()}
              {showDebugPanel && renderDebugPanel()}
              {showCheatsheet && (
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h4 style={styles.cardTitle}>
                      <dc.Icon icon="book-open" style={{ fontSize: "12px", color: "#9b87f5" }} />
                      Syntax Reference & Engine Guide
                    </h4>
                  </div>
                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "12px", color: "#b0b0d0", maxHeight: "650px", overflowY: "auto", fontFamily: "sans-serif", lineHeight: "1.6" }}>
                      
                      <div style={{ fontSize: "11px", color: "#777790", fontStyle: "italic", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                        Details the query capabilities and architectural logic required to retrieve and filter data from your Obsidian vault.
                      </div>

                      {/* 1. Base Query Targets */}
                      <div>
                        <h5 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9b87f5" }} />
                          1. Base Query Targets (@type)
                        </h5>
                        <div style={{ paddingLeft: "10px", fontSize: "11px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>Every query starts by declaring a base target type to pull from indices:</div>
                          <ul style={{ margin: "4px 0", paddingLeft: "20px", color: "#9090b0", display: "flex", flexDirection: "column", gap: "3px" }}>
                            <li><code style={{ background: "#1a1a28", color: "#9b87f5", padding: "1px 5px", borderRadius: "3px" }}>@page</code> — All markdown notes and pages in your vault.</li>
                            <li><code style={{ background: "#1a1a28", color: "#9b87f5", padding: "1px 5px", borderRadius: "3px" }}>@task</code> — All checkbox elements listed in markdown.</li>
                            <li><code style={{ background: "#1a1a28", color: "#9b87f5", padding: "1px 5px", borderRadius: "3px" }}>@file</code> — All files (including non-markdown attachments).</li>
                            <li><code style={{ background: "#1a1a28", color: "#9b87f5", padding: "1px 5px", borderRadius: "3px" }}>@section</code> — Headings and markdown section targets.</li>
                          </ul>
                        </div>
                      </div>

                      {/* 2. Core Logical Operators */}
                      <div>
                        <h5 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9b87f5" }} />
                          2. Query Logical Operators
                        </h5>
                        <div style={{ paddingLeft: "10px", fontSize: "11px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>Combine and negate indices using standard logical query grammar:</div>
                          <ul style={{ margin: "4px 0", paddingLeft: "20px", color: "#9090b0", display: "flex", flexDirection: "column", gap: "3px" }}>
                            <li><code style={{ color: "#ffffff" }}>AND</code> / <code style={{ color: "#ffffff" }}>OR</code> — Joining logical sets (e.g. <code style={{ color: "#8080a0" }}>@page and #tag</code>).</li>
                            <li><code style={{ color: "#ffffff" }}>!not</code> — Inverting expression logic (e.g. <code style={{ color: "#8080a0" }}>@task and !$completed</code>).</li>
                            <li><code style={{ color: "#ffffff" }}>parentof()</code> / <code style={{ color: "#ffffff" }}>childof()</code> — Scoped structural hierarchy filters.</li>
                          </ul>
                        </div>
                      </div>

                      {/* 3. Query Logic & Indexing Reference */}
                      <div>
                        <h5 style={{ margin: "0 0 8px 0", color: "#ffffff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9b87f5" }} />
                          3. Query Targets & Indexing
                        </h5>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", fontFamily: "monospace", color: "#c8c8e8", textAlign: "left" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#9090b0" }}>
                              <th style={{ padding: "4px" }}>Target</th>
                              <th style={{ padding: "4px" }}>Index</th>
                              <th style={{ padding: "4px" }}>Syntax / Logic</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 4px", color: "#ffffff" }}>Object</td>
                              <td style={{ padding: "5px 4px" }}>types</td>
                              <td style={{ padding: "5px 4px", color: "#9090b0" }}>@page, @section, @task</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 4px", color: "#ffffff" }}>Tags (Hier)</td>
                              <td style={{ padding: "5px 4px" }}>tags</td>
                              <td style={{ padding: "5px 4px", color: "#9090b0" }}>#tag (finds #tag/child)</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 4px", color: "#ffffff" }}>Tags (Exact)</td>
                              <td style={{ padding: "5px 4px" }}>etags</td>
                              <td style={{ padding: "5px 4px", color: "#9090b0" }}>Exact tags only</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 4px", color: "#ffffff" }}>Backlinks</td>
                              <td style={{ padding: "5px 4px" }}>links</td>
                              <td style={{ padding: "5px 4px", color: "#9090b0" }}>linksto()</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 4px", color: "#ffffff" }}>Ranges</td>
                              <td style={{ padding: "5px 4px" }}>fields</td>
                              <td style={{ padding: "5px 4px", color: "#9090b0" }}>{"rating >= 8, price < 50"}</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 4px", color: "#ffffff" }}>Folders</td>
                              <td style={{ padding: "5px 4px" }}>folder</td>
                              <td style={{ padding: "5px 4px", color: "#9090b0" }}>IN "Projects/"</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 4px", color: "#ffffff" }}>Relations</td>
                              <td style={{ padding: "5px 4px" }}>children</td>
                              <td style={{ padding: "5px 4px", color: "#9090b0" }}>Parent-child linkage</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 4. Data Model & Metadata */}
                      <div>
                        <h5 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9b87f5" }} />
                          4. Structured Data Model
                        </h5>
                        <ul style={{ margin: "4px 0", paddingLeft: "20px", color: "#9090b0", fontSize: "11px", display: "flex", flexDirection: "column", gap: "3px" }}>
                          <li><strong>Frontmatter</strong> — Standard YAML metadata block at note top.</li>
                          <li><strong>Inline Fields</strong> — Key:: Value pairs written inline in markdown body.</li>
                          <li><strong>Links & Tags</strong> — Automatically indexed on save.</li>
                          <li><strong>Attachments & Canvas</strong> — Searchable assets alongside note targets.</li>
                        </ul>
                      </div>

                      {/* 5. Expression & Date Handling */}
                      <div>
                        <h5 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9b87f5" }} />
                          5. Expressions & dates
                        </h5>
                        <ul style={{ margin: "4px 0", paddingLeft: "20px", color: "#9090b0", fontSize: "11px", display: "flex", flexDirection: "column", gap: "3px" }}>
                          <li><strong>Luxon</strong> — Powers date/time objects and literal comparisons.</li>
                          <li><strong>Parsimmon</strong> — Underlying expression parser engine.</li>
                          <li><strong>Dataview Compatibility</strong> — Concepts mapping seamlessly from Dataview.</li>
                        </ul>
                      </div>

                      {/* 6. Reactive Execution */}
                      <div>
                        <h5 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9b87f5" }} />
                          6. Reactive Performance
                        </h5>
                        <ul style={{ margin: "4px 0", paddingLeft: "20px", color: "#9090b0", fontSize: "11px", display: "flex", flexDirection: "column", gap: "3px" }}>
                          <li><strong>Auto-Updates</strong> — Monitors vault changes; re-renders seamlessly.</li>
                          <li><strong>Web Workers</strong> — Offloads query parsing to keep Obsidian UI thread buttery smooth.</li>
                        </ul>
                      </div>

                      {/* Quick Examples */}
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                        <div style={{ color: "#ffffff", fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>Quick Examples (click to load):</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {[
                            { q: "@page and rating >= 7", d: "Pages rated 7 or above" },
                            { q: "@task and !$completed", d: "Incomplete tasks" },
                            { q: 'row["field name"] == "value"', d: "Filter by inline field key" }
                          ].map((ex, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <code
                                onClick={() => setInputValue(ex.q)}
                                style={{ background: "#1a1a28", padding: "4px 8px", borderRadius: "4px", color: "#9b87f5", cursor: "pointer", fontFamily: "monospace", fontSize: "10.5px", border: "1px solid rgba(155,135,245,0.1)", transition: "all 0.15s" }}
                                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(155,135,245,0.15)"; e.currentTarget.style.borderColor = "rgba(155,135,245,0.3)"; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = "#1a1a28"; e.currentTarget.style.borderColor = "rgba(155,135,245,0.1)"; }}
                              >{ex.q}</code>
                              <span style={{ fontSize: "9px", color: "#666680", paddingLeft: "4px" }}>{ex.d}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: Results (always full width) */}
          <div style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <dc.Icon icon="database" style={{ fontSize: "14px", color: "#9b87f5" }} />
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#c8c8e8", letterSpacing: "-0.01em" }}>Results</span>
              {results && (
                <span style={{ fontSize: "11px", color: "#9090b0", backgroundColor: "rgba(155,135,245,0.09)", padding: "1px 8px", borderRadius: "10px", border: "1px solid rgba(155,135,245,0.18)" }}>
                  {results.length}
                </span>
              )}
              {queryTiming && !loading && (
                <span style={{ fontSize: "10px", color: "#555570" }}>{queryTiming.ms}ms</span>
              )}
            </div>
            {renderResults()}
          </div>

        </div>

        {/* Floating AI chat drawer overlay */}
        {showAIAssistant && (
          <div style={{
            position: "absolute",
            bottom: "80px",
            right: "20px",
            width: "380px",
            maxHeight: "500px",
            overflowY: "auto",
            backgroundColor: "rgba(11, 11, 19, 0.96)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(155, 135, 245, 0.15)",
            zIndex: 9998,
            animation: "slideInUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
          }} className="dqb-ai-floating-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <dc.Icon icon="sparkles" style={{ fontSize: "16px", color: "#9b87f5" }} />
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>Gemini Query Copilot</span>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                style={{ background: "transparent", border: "none", color: "#666680", cursor: "pointer", transition: "color 0.15s" }}
                onMouseOver={(e) => e.currentTarget.style.color = "#ffffff"}
                onMouseOut={(e) => e.currentTarget.style.color = "#666680"}
              >
                <dc.Icon icon="x" style={{ fontSize: "14px" }} />
              </button>
            </div>

             {!aiTermsAccepted ? (
              <div style={{
                padding: "16px",
                backgroundColor: "rgba(155,135,245,0.04)",
                border: "1px solid rgba(155,135,245,0.12)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
                textAlign: "center"
              }}>
                <dc.Icon icon="sparkles" style={{ fontSize: "28px", color: "#9b87f5" }} />
                <div style={{ fontSize: "13px", fontWeight: "750", color: "#ffffff", letterSpacing: "-0.01em" }}>Enable Vault AI Assistant</div>
                <div style={{ fontSize: "10px", color: "#9090b0", lineHeight: "1.5" }}>
                  To build customized, context-aware queries tailored specifically for your files, tags, and properties, the Copilot needs access to your vault's structural index.
                </div>
                
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  textAlign: "left",
                  width: "100%",
                  padding: "8px",
                  background: "rgba(255,255,255,0.01)",
                  borderRadius: "6px"
                }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                    <dc.Icon icon="shield" style={{ fontSize: "10px", color: "#9b87f5", marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ fontSize: "9px", color: "#7a7a9a" }}><strong>Privacy First</strong>: The assistant only indexes metadata names. It <strong>never</strong> reads, uploads, or sends actual note content or private text.</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem("datacore-ai-consent-v2", "true");
                    setAiTermsAccepted(true);
                  }}
                  style={{
                    marginTop: "4px",
                    width: "100%",
                    padding: "8px 16px",
                    backgroundColor: "#9b87f5",
                    color: "#050508",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "750",
                    fontSize: "11px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Allow Access & Enable AI
                </button>
              </div>
            ) : (
              <>
                {/* API Key management */}
                {!hasKeyInKeychain ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "10px", color: "#9090b0", display: "flex", alignItems: "center", gap: "5px" }}>
                      <dc.Icon icon="key" style={{ fontSize: "11px", color: "#9b87f5" }} />
                      Secure Gemini API Key required:
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        id="gemini-key-input"
                        style={{
                          flex: 1,
                          background: "#08080d",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "4px",
                          color: "#fff",
                          padding: "6px 10px",
                          fontSize: "11px",
                          outline: "none"
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveKey(e.currentTarget.value);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById("gemini-key-input");
                          if (input) handleSaveKey(input.value);
                        }}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#9b87f5",
                          color: "#09090f",
                          border: "none",
                          borderRadius: "4px",
                          fontWeight: "700",
                          fontSize: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        Save Key
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,210,255,0.03)", border: "1px solid rgba(0,210,255,0.08)", padding: "8px 12px", borderRadius: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#00d2ff" }}>
                      <dc.Icon icon="shield-check" style={{ fontSize: "12px" }} />
                      🔑 Gemini Key Securely Loaded
                    </div>
                    <button
                      onClick={handleDeleteKey}
                      style={{ background: "transparent", border: "none", color: "#ff7070", fontSize: "9px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Chat Message History */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  paddingRight: "4px",
                  marginBottom: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                  paddingBottom: "12px"
                }} className="dqb-ai-chat-history">
                  {aiMessages.map((msg, i) => (
                    <div key={i} style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      lineHeight: "1.4",
                      backgroundColor: msg.role === "user" ? "rgba(155, 135, 245, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: msg.role === "user" ? "1px solid rgba(155, 135, 245, 0.25)" : "1px solid rgba(255, 255, 255, 0.05)",
                      color: msg.role === "user" ? "#ffffff" : "#c8c8e8",
                    }}>
                      <div style={{ fontWeight: "700", fontSize: "10px", color: msg.role === "user" ? "#9b87f5" : "#9090b0", marginBottom: "4px" }}>
                        {msg.role === "user" ? "You" : "Gemini Copilot"}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>
                        {msg.content}
                      </div>
                      {msg.query && (
                        <button
                          onClick={() => {
                            setInputValue(msg.query);
                            setNotification("Query applied to editor!");
                            setTimeout(() => setNotification(null), 2000);
                          }}
                          style={{
                            marginTop: "8px",
                            padding: "4px 10px",
                            backgroundColor: "#9b87f5",
                            color: "#09090f",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <dc.Icon icon="check" style={{ fontSize: "10px" }} /> Use This Query
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {generating && (
                  <div style={{ padding: "10px 12px", backgroundColor: "rgba(155,135,245,0.04)", border: "1px solid rgba(155,135,245,0.12)", borderRadius: "6px", color: "#c8c8e8", fontSize: "11px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", marginBottom: "4px" }}>
                      <dc.Icon icon="loader" className="animate-spin" style={{ fontSize: "12px", color: "#9b87f5" }} />
                      Consulting Gemini model...
                    </div>
                    {aiDebugInfo && (
                      <div style={{ fontSize: "10px", color: "#9090b0", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                        <span>Status: {aiDebugInfo.status}</span>
                        <span>Attempt: {aiDebugInfo.attempts} / 3</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error messages */}
                {aiError && (
                  <div style={{ padding: "10px", backgroundColor: "rgba(255,112,112,0.05)", border: "1px solid rgba(255,112,112,0.15)", borderRadius: "6px", color: "#ff7070", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <dc.Icon icon="alert-circle" style={{ fontSize: "12px" }} />
                    {aiError}
                  </div>
                )}

                {/* Prompt field */}
                {(hasKeyInKeychain || geminiKey) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
                    {copilotHelperState.type && (
                      <div
                        className="dqb-helper-popup"
                        onKeyDown={(ev) => {
                          const target = ev.target;
                          if (target && target.tagName === "BUTTON") {
                            if (ev.key === "ArrowDown") {
                              ev.preventDefault();
                              const next = target.nextElementSibling;
                              if (next && next.tagName === "BUTTON") {
                                next.focus();
                              }
                            } else if (ev.key === "ArrowUp") {
                              ev.preventDefault();
                              const prev = target.previousElementSibling;
                              if (prev && prev.tagName === "BUTTON") {
                                prev.focus();
                              } else {
                                const container = ev.currentTarget.parentElement;
                                const textarea = container ? container.querySelector("textarea") : null;
                                if (textarea) {
                                  textarea.focus();
                                }
                              }
                            } else if (ev.key === "Escape") {
                              ev.preventDefault();
                              setCopilotHelperState({ type: null, searchTerm: "", startIndex: -1 });
                              const container = ev.currentTarget.parentElement;
                              const textarea = container ? container.querySelector("textarea") : null;
                              if (textarea) {
                                textarea.focus();
                              }
                            }
                          }
                        }}
                        style={{
                          position: "absolute",
                          bottom: "100%",
                          left: "0",
                          right: "0",
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #9b87f5",
                          borderRadius: "4px",
                          zIndex: 9999,
                          marginBottom: "4px",
                          boxShadow: "0 -4px 12px rgba(0,0,0,0.5)",
                        }}
                      >

                        {copilotHelperState.type === "main" && (
                          <MainSelectorHelper
                            onSelectCategory={handleSelectCopilotCategory}
                          />
                        )}
                        {copilotHelperState.type === "tag" && (
                          <TagHelper
                            searchTerm={copilotHelperState.searchTerm}
                            onTagSelect={handleSelectCopilotSuggestion}
                          />
                        )}
                        {copilotHelperState.type === "folder" && (
                          <FolderHelper
                            searchTerm={copilotHelperState.searchTerm}
                            onFolderSelect={handleSelectCopilotSuggestion}
                          />
                        )}
                        {copilotHelperState.type === "file" && (
                          <FileHelper
                            searchTerm={copilotHelperState.searchTerm}
                            onFileSelect={handleSelectCopilotSuggestion}
                          />
                        )}
                        {copilotHelperState.type === "property" && (
                          <GenericPropertyHelper
                            searchTerm={copilotHelperState.searchTerm}
                            onPropertySelect={handleSelectCopilotSuggestion}
                          />
                        )}
                        {copilotHelperState.type === "property_op" && (
                          <PropertyOperatorHelper
                            fieldName={copilotHelperState.propertyName}
                            onOperatorSelect={handleSelectCopilotPropertyOperator}
                          />
                        )}
                        {copilotHelperState.type === "property_value" && (
                          <FieldValueHelper
                            fieldName={copilotHelperState.propertyName}
                            searchTerm={copilotHelperState.searchTerm}
                            operator={copilotHelperState.operator}
                            onValueSelect={handleSelectCopilotPropertyValue}
                          />
                        )}
                      </div>
                    )}
                    <textarea
                      className="dqb-copilot-textarea"
                      placeholder="Ask Gemini to generate or refine your query... (e.g. Show active projects)"
                      value={aiPrompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAiPrompt(val);
                        detectCopilotTrigger(val, e.target.selectionStart);
                      }}
                      onKeyUp={(e) => {
                        if (e.key === "Tab") return;
                        detectCopilotTrigger(e.target.value, e.target.selectionStart);
                      }}
                      onSelect={(e) => {
                        detectCopilotTrigger(e.target.value, e.target.selectionStart);
                      }}
                      style={{
                        width: "100%",
                        minHeight: "54px",
                        background: "#08080d",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "6px",
                        color: "#c8c8e8",
                        padding: "8px 10px",
                        fontSize: "11px",
                        outline: "none",
                        resize: "vertical"
                      }}
                      onKeyDown={(e) => {
                        if (copilotHelperState.type) {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setCopilotHelperState({ type: null, searchTerm: "", startIndex: -1 });
                          } else if (e.key === "ArrowDown" || e.key === "Tab") {
                            e.preventDefault();
                            const parent = e.currentTarget.parentElement;
                            const popup = parent ? parent.querySelector(".dqb-helper-popup") : null;
                            const firstButton = popup ? popup.querySelector("button") : null;
                            if (firstButton) {
                              firstButton.focus();
                            }
                          }
                        } else if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerateQuery();
                        }
                      }}

                    />
                    <button
                      onClick={handleGenerateQuery}
                      disabled={generating}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: generating ? "rgba(155,135,245,0.3)" : "#9b87f5",
                        color: "#09090f",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "750",
                        fontSize: "11px",
                        cursor: generating ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.15s"
                      }}
                    >
                      {generating ? "Refining Query..." : "Send Request"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Floating Sparkles Trigger Button */}
        <button
          className="dqb-floating-ai-btn"
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            backgroundColor: showAIAssistant ? "rgba(155,135,245,0.2)" : "#9b87f5",
            border: showAIAssistant ? "1px solid rgba(155,135,245,0.4)" : "none",
            boxShadow: showAIAssistant 
              ? "0 0 12px rgba(155, 135, 245, 0.4)" 
              : "0 4px 16px rgba(0, 0, 0, 0.35)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: showAIAssistant ? "rotate(135deg) scale(1.05)" : "scale(1)",
          }}
          onClick={() => setShowAIAssistant((v) => !v)}
          title="Toggle AI Query Assistant"
        >
          <dc.Icon 
            icon={showAIAssistant ? "x" : "sparkles"} 
            style={{ fontSize: "18px", color: showAIAssistant ? "#9b87f5" : "#09090f" }} 
          />
        </button>

      </div>
    </div>
  );
}



function AIQueryLauncher() {
  const [isAIWindowOpen, setIsAIWindowOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const portalContainerRef = useRef(null);
  const aiWindowRef = useRef(null);

  useEffect(() => {
    const portalDiv = document.createElement("div");
    portalDiv.id = "ai-query-launcher-portal";
    portalDiv.style.cssText =
      "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 99998;";
    document.body.appendChild(portalDiv);
    portalContainerRef.current = portalDiv;

    return () => {
      if (portalDiv && document.body.contains(portalDiv)) {
        document.body.removeChild(portalDiv);
      }
    };
  }, []);

  const mainButtonSize = 60;
  const mainButtonOffsetFromEdge = 20;

  const handleOpenAI = () => {
    setIsAIWindowOpen(true);
  };

  const handleCloseAI = () => {
    setIsAIWindowOpen(false);
  };

  const handleQueryGenerated = (query) => {
    navigator.clipboard.writeText(query);
    setNotification("Query copied to clipboard!");
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!isAIWindowOpen) {
      if (aiWindowRef.current && aiWindowRef.current.parentNode) {
        aiWindowRef.current.parentNode.removeChild(aiWindowRef.current);
        aiWindowRef.current = null;
      }
      return;
    }

    const aiWindow = document.createElement("div");
    aiWindowRef.current = aiWindow;

    const aiWidth = 500;
    const aiHeight = 600;

    Object.assign(aiWindow.style, {
      position: "fixed",
      bottom: "100px",
      right: "20px",
      width: `${aiWidth}px`,
      height: `${aiHeight}px`,
      background: "#0a0a0a",
      border: "2px solid #9b87f5",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(155, 135, 245, 0.4)",
      zIndex: "10000",
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      cursor: "grab",
    });

    aiWindow.innerHTML = `
      <div class="ai-window-header" style="
        background: linear-gradient(135deg, #9b87f5, #7a6bc7);
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
        flex-shrink: 0;
      ">
        <div style="display: flex; align-items: center; gap: 8px; color: #000; font-weight: bold; font-size: 14px;">
          <span class="ai-header-icon"></span>
          <span>AI Query Assistant</span>
        </div>
        <button class="ai-close-btn" style="
          background: none;
          border: none;
          color: #000;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
      <div class="ai-window-content" style="
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      "></div>
    `;

    document.body.appendChild(aiWindow);

    const headerIconContainer = aiWindow.querySelector(".ai-header-icon");
    dc.preact.render(
      <dc.Icon icon="sparkles" style={{ fontSize: "16px" }} />,
      headerIconContainer
    );

    let startX, startY, startTop, startRight;
    let isDragging = false;

    const onWindowDragMove = (e) => {
      if (!isDragging) {
        const newRight = startRight - (e.clientX - startX);
        const newTop = startTop + (e.clientY - startY);
        aiWindow.style.right = `${Math.max(
          0,
          Math.min(window.innerWidth - aiWidth, newRight)
        )}px`;
        aiWindow.style.top = `${Math.max(
          0,
          Math.min(window.innerHeight - aiHeight, newTop)
        )}px`;
        aiWindow.style.bottom = "auto";
      }
    };

    const onWindowDragEnd = () => {
      isDragging = false;
      aiWindow.style.cursor = "grab";
      aiWindow.querySelector(".ai-window-header").style.cursor = "grab";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onWindowDragMove);
      window.removeEventListener("mouseup", onWindowDragEnd);
    };

    const onWindowDragStart = (e) => {
      if (
        !e.target.closest(".ai-window-header") ||
        e.target.closest(".ai-close-btn")
      )
        return;
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const computed = getComputedStyle(aiWindow);
      startTop = parseInt(computed.top, 10) || 0;
      startRight = parseInt(computed.right, 10) || 0;
      aiWindow.style.cursor = "grabbing";
      aiWindow.querySelector(".ai-window-header").style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onWindowDragMove);
      window.addEventListener("mouseup", onWindowDragEnd);
    };

    aiWindow.addEventListener("mousedown", onWindowDragStart);
    aiWindow
      .querySelector(".ai-close-btn")
      .addEventListener("click", handleCloseAI);

    const contentArea = aiWindow.querySelector(".ai-window-content");
    dc.preact.render(
      <AIQueryAssistant
        currentQuery={""}
        onQueryGenerated={handleQueryGenerated}
        onClose={handleCloseAI}
        isDrawerMode={true}
      />,
      contentArea
    );

    return () => {
      aiWindow.removeEventListener("mousedown", onWindowDragStart);
      if (aiWindow.parentNode) {
        aiWindow.parentNode.removeChild(aiWindow);
      }
    };
  }, [isAIWindowOpen]);

  const renderMainButton = () => {
    if (isAIWindowOpen) return null;

    return (
      <button
        className="ai-launcher-main-btn"
        onClick={handleOpenAI}
        style={{
          position: "fixed",
          bottom: `${mainButtonOffsetFromEdge}px`,
          right: `${mainButtonOffsetFromEdge}px`,
          width: `${mainButtonSize}px`,
          height: `${mainButtonSize}px`,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #9b87f5, #7a6bc7)",
          border: "2px solid #9b87f5",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(155, 135, 245, 0.5)",
          transition: "all 0.3s ease",
          zIndex: 10001,
          pointerEvents: "auto",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow =
            "0 6px 30px rgba(155, 135, 245, 0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 4px 20px rgba(155, 135, 245, 0.5)";
        }}
      >
        <dc.Icon icon="sparkles" style={{ fontSize: "28px" }} />
      </button>
    );
  };

  const renderNotification = () => {
    if (!notification) return null;

    return (
      <div
        style={{
          position: "fixed",
          bottom: "100px",
          right: "20px",
          background: "#9b87f5",
          color: "#000",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(155, 135, 245, 0.6)",
          zIndex: 10002,
          pointerEvents: "auto",
          fontSize: "14px",
          fontWeight: "bold",
          animation: "slideIn 0.3s ease-out",
        }}
      >
        {notification}
      </div>
    );
  };

  useEffect(() => {
    if (!portalContainerRef.current) return;

    const PortalContent = () => (
      <>
        {renderMainButton()}
        {renderNotification()}
      </>
    );

    dc.preact.render(<PortalContent />, portalContainerRef.current);

    return () => {
      if (portalContainerRef.current) {
        dc.preact.render(null, portalContainerRef.current);
      }
    };
  }, [isAIWindowOpen, notification]);

  return (
    <style>{`
      @keyframes ai-pulse {
        0%, 100% {
          box-shadow: 0 4px 20px rgba(155, 135, 245, 0.5);
        }
        50% {
          box-shadow: 0 4px 30px rgba(155, 135, 245, 0.8);
        }
      }
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .ai-launcher-main-btn {
        animation: ai-pulse 2s infinite ease-in-out;
      }
    `}</style>
  );
}

function DatacoreQueryBuilder({ mode = "default" }) {
  if (mode === "ai-launcher") {
    return <AIQueryLauncher />;
  }
  return <DatacoreQueryExplorer />;
}

return { App: DatacoreQueryBuilder };
