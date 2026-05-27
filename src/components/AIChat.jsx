const activeFile = dc.resolvePath("DATACORE QUERY BUILDER") || "_RESOURCES/DATACORE/_DONE/DATACORE QUERY BUILDER/DATACORE QUERY BUILDER";
const folderPath = activeFile.substring(0, activeFile.lastIndexOf('/'));

const { useState, useEffect, useRef, useMemo } = dc;
const { AISettingsModal } = await dc.require(folderPath + "/src/components/AISettingsModal.jsx");
const { TagHelper, FolderHelper, FileHelper, GenericPropertyHelper, MainSelectorHelper, PropertyOperatorHelper } = await dc.require(folderPath + "/src/components/Helpers.jsx");

const getCachedData = (key, fetchFn, ttlMs = 30000) => {
  window._dqb_cache = window._dqb_cache || {};
  const cached = window._dqb_cache[key];
  const now = Date.now();
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }
  const freshData = fetchFn();
  window._dqb_cache[key] = {
    timestamp: now,
    data: freshData
  };
  return freshData;
};

function FieldValueHelper({ searchTerm, onValueSelect, fieldName, operator }) {
  const [allValues, setAllValues] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");
  useEffect(() => {
    try {
      let extractedField = fieldName;
      if (fieldName.startsWith('row["')) {
        const match = fieldName.match(/row\["([^"]+)"\]/);
        extractedField = match?.[1] || fieldName;
      }

      const valuesArray = getCachedData("values_" + extractedField, () => {
        const allItems = dc.api.query("@page OR @task OR @section OR @block");
        const valueSet = new Set();
        const lookupFields = [fieldName];
        if (!fieldName.startsWith("$")) lookupFields.push("$" + fieldName);
        if (!fieldName.startsWith('row["'))
          lookupFields.push(`row["${fieldName}"]`);

        for (const item of allItems) {
          let value = null;
          try {
            for (const lookup of lookupFields) {
              if (lookup.startsWith('row["')) {
                const match = lookup.match(/row\["([^"]+)"\]/);
                const prop = match?.[1] || lookup;
                value = item[prop];
              } else if (lookup.startsWith("$")) {
                value = item[lookup];
              } else {
                value = item[lookup];
              }
              if (value !== null && value !== undefined) {
                break;
              }
            }
            
            if (value === null || value === undefined) {
              if (item.$frontmatter) {
                value = item.$frontmatter[extractedField] || item.$frontmatter[extractedField.toLowerCase()];
              }
              if ((value === null || value === undefined) && item.frontmatter) {
                value = item.frontmatter[extractedField] || item.frontmatter[extractedField.toLowerCase()];
              }
            }

            if (value && typeof value === "object" && value !== null) {
              if ("value" in value && "key" in value) {
                value = value.value;
              }
            }

            if (value !== null && value !== undefined) {
              if (Array.isArray(value)) {
                value.forEach((v) => {
                  let strVal = String(v).replace(/^#/, "");
                  if (typeof v === "object" && v.$path) strVal = v.$path;
                  else if (v instanceof Date) strVal = v.toISOString();
                  if (strVal && strVal !== "[object Object]")
                    valueSet.add(strVal);
                });
              } else if (typeof value === "string") {
                const cleaned = value.replace(/^#/, "");
                if (cleaned) valueSet.add(cleaned);
              } else if (
                typeof value === "number" ||
                typeof value === "boolean"
              ) {
                valueSet.add(String(value));
              } else if (value instanceof Date) {
                valueSet.add(value.toISOString());
              } else if (value && typeof value === "object") {
                if (value.$path) valueSet.add(value.$path);
                else if (value.toISOString) valueSet.add(value.toISOString());
                else if (value.toString && value.toString() !== "[object Object]")
                  valueSet.add(value.toString());
              }
            }
          } catch (itemErr) {
            // Silent catch
          }
        }
        return Array.from(valueSet).sort().slice(0, 100);
      });

      const isDateField = ["$ctime", "$mtime", "ctime", "mtime"].includes(
        extractedField
      );
      const dateHint = isDateField
        ? " [WARNING] Dates: use >, <, == not .contains()"
        : "";
      setDebugInfo(
        `Field: ${extractedField} | Values: ${valuesArray.length}${dateHint}`
      );
      setAllValues(valuesArray);
    } catch (e) {
      console.error("[FieldValueHelper] Failed to fetch field values:", e);
      setDebugInfo(`Error: ${e.message}`);
      setAllValues([]);
    }
  }, [fieldName]);
  const filteredValues = useMemo(() => {
    if (allValues === null) return null;
    if (!searchTerm) return allValues;
    return allValues.filter((val) =>
      val.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allValues, searchTerm]);
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
      fontSize: "11px",
    },
    hover: { backgroundColor: "#1a1a1a", color: "#9b87f5" },
    message: {
      color: "#9b87f5",
      fontSize: "12px",
      textAlign: "center",
      margin: "5px 0",
    },
    header: {
      color: "#9b87f5",
      fontSize: "11px",
      marginBottom: "6px",
      fontFamily: "monospace",
    },
  };
  return (
    <div style={styles.container}>
      {debugInfo && (
        <div
          style={{
            color: "#9b87f5",
            fontSize: "10px",
            marginBottom: "4px",
            padding: "4px",
            backgroundColor: "#1a1a1a",
            borderRadius: "3px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <dc.Icon icon="search" style={{ fontSize: "10px" }} /> {debugInfo}
        </div>
      )}{" "}
      <div style={styles.header}>
        Available values for <strong>{fieldName}</strong>:
      </div>{" "}
      <div style={styles.list}>
        {searchTerm && (
          <button
            style={{ ...styles.button, color: "#9b87f5", borderBottom: "1px dashed rgba(155,135,245,0.2)", marginBottom: "6px", paddingBottom: "6px" }}
            onClick={() => onValueSelect(searchTerm)}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = styles.hover.backgroundColor;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <dc.Icon icon="plus-circle" style={{ fontSize: "10px" }} />
            Use custom: "{searchTerm}"
          </button>
        )}
        {filteredValues === null ? (
          <p style={styles.message}>Loading values...</p>
        ) : filteredValues.length > 0 ? (
          filteredValues.map((val) => (
            <button
              key={val}
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
              onClick={() => onValueSelect(val)}
            >
              <dc.Icon icon="corner-down-right" style={{ fontSize: "10px" }} />
              {val}
            </button>
          ))
        ) : (
          <p style={styles.message}>
            {searchTerm ? "No values match." : "No values found."}
          </p>
        )}{" "}
      </div>{" "}
    </div>
  );
}

function AIQueryAssistant({
  onQueryGenerated,
  onClose,
  currentQuery,
  isDrawerMode = false,
}) {
  const [userInput, setUserInput] = useState("");
  const [helperState, setHelperState] = useState({
    type: null,
    searchTerm: "",
    startIndex: -1,
  });

  const detectTrigger = (text, cursorIndex) => {
    if (helperState.type === "property_op") {
      return;
    }
    if (helperState.type === "property_value") {
      const propName = helperState.propertyName;
      const op = helperState.operator;
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
          setHelperState((prev) => ({
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
          setHelperState((prev) => {
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
    setHelperState({ type: null, searchTerm: "", startIndex: -1 });
  };

  const handleSelectCategory = (categoryId) => {
    setHelperState((prev) => ({
      ...prev,
      type: categoryId,
      searchTerm: "",
    }));
    setTimeout(() => {
      const textareas = document.querySelectorAll(".dqb-ai-textarea");
      textareas.forEach((ta) => {
        if (ta.placeholder.includes("Ask") || document.activeElement === ta) {
          ta.focus();
        }
      });
    }, 50);
  };

  const handleSelectSuggestion = (selectedValue) => {
    if (helperState.type === "property") {
      const insertText = `@property:${selectedValue}`;
      const before = userInput.substring(0, helperState.startIndex);
      const after = userInput.substring(helperState.startIndex + helperState.searchTerm.length + 1);
      const newVal = before + insertText + " " + after;
      setUserInput(newVal);

      setHelperState((prev) => ({
        ...prev,
        type: "property_op",
        propertyName: selectedValue,
        searchTerm: "",
      }));
      return;
    }

    let insertText = selectedValue;
    if (helperState.type === "tag") {
      insertText = `@tag:${selectedValue}`;
    } else if (helperState.type === "folder") {
      insertText = `@path:"${selectedValue}"`;
    } else if (helperState.type === "file") {
      insertText = `@file:"${selectedValue}"`;
    }

    const before = userInput.substring(0, helperState.startIndex);
    const after = userInput.substring(helperState.startIndex + helperState.searchTerm.length + 1);
    const newVal = before + insertText + " " + after;
    setUserInput(newVal);
    setHelperState({ type: null, searchTerm: "", startIndex: -1 });

    setTimeout(() => {
      const textareas = document.querySelectorAll(".dqb-ai-textarea");
      textareas.forEach((ta) => {
        if (document.activeElement === ta || ta.placeholder.includes("Ask")) {
          ta.focus();
          const cursorLoc = helperState.startIndex + insertText.length + 1;
          ta.setSelectionRange(cursorLoc, cursorLoc);
        }
      });
    }, 50);
  };

  const handleSelectPropertyOperator = (opId) => {
    const propName = helperState.propertyName;
    if (opId === "any") {
      setHelperState({ type: null, searchTerm: "", startIndex: -1 });
      return;
    }

    let opTemplate = ` == ""`;
    if (opId === "contains") opTemplate = `.contains("")`;
    else if (opId === "gt") opTemplate = ` > `;
    else if (opId === "lt") opTemplate = ` < `;

    const before = userInput.substring(0, helperState.startIndex);
    const newVal = before + `@property:${propName}${opTemplate}`;
    setUserInput(newVal);

    setHelperState((prev) => ({
      ...prev,
      type: "property_value",
      operator: opId,
      searchTerm: "",
    }));

    setTimeout(() => {
      const textareas = document.querySelectorAll(".dqb-ai-textarea");
      textareas.forEach((ta) => {
        if (document.activeElement === ta || ta.placeholder.includes("Ask")) {
          ta.focus();
          let cursorLoc = before.length + `@property:${propName}`.length + 5;
          if (opId === "contains") {
            cursorLoc = before.length + `@property:${propName}`.length + 11;
          } else if (opId === "gt" || opId === "lt") {
            cursorLoc = before.length + `@property:${propName}`.length + 4;
          }
          ta.setSelectionRange(cursorLoc, cursorLoc);
        }
      });
    }, 50);
  };

  const handleSelectPropertyValue = (selectedValue) => {
    const propName = helperState.propertyName;
    const op = helperState.operator;
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

    const before = userInput.substring(0, helperState.startIndex);
    const newVal = before + insertText + " ";
    setUserInput(newVal);
    setHelperState({ type: null, searchTerm: "", startIndex: -1 });

    setTimeout(() => {
      const textareas = document.querySelectorAll(".dqb-ai-textarea");
      textareas.forEach((ta) => {
        if (document.activeElement === ta || ta.placeholder.includes("Ask")) {
          ta.focus();
          const cursorLoc = before.length + insertText.length + 1;
          ta.setSelectionRange(cursorLoc, cursorLoc);
        }
      });
    }, 50);
  };

  const [aiConsentGranted, setAiConsentGranted] = useState(() => {
    return localStorage.getItem("datacore-ai-consent") === "true";
  });
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-1.5-flash-latest");
  const [apiKey, setApiKey] = useState(null);
  const [learnings, setLearnings] = useState([]);
  const [systemPromptAdditions, setSystemPromptAdditions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const chatContainerRef = useRef(null);
  const PROVIDER_MODELS = {
    gemini: [
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro-latest",
      "gemini-2.0-flash-exp",
    ],
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    anthropic: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    groq: [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
  };
  const currentPath = dc.useCurrentPath();
  const getHelperDir = () => {
    if (!currentPath) return null;
    const dirPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
    return `${dirPath}/_resources/prompt_helper`;
  };
  const SECRET_DIR = ".datacore/chatllm/.secret/";
  const PROVIDER_SETTINGS_FILE =
    ".datacore/datacorequery/provider_settings.json";
  const getLearningsFile = () => {
    const helperDir = getHelperDir();
    return helperDir
      ? `${helperDir}/query_learnings.json`
      : ".datacore/datacorequery/query_learnings.json";
  };
  const getSystemAdditionsFile = () => {
    const helperDir = getHelperDir();
    return helperDir
      ? `${helperDir}/datacore_query_knowledge.md`
      : ".datacore/datacorequery/system_prompt_additions.json";
  };
  useEffect(() => {
    const loadProviderAndKey = async () => {
      try {
        if (await app.vault.adapter.exists(PROVIDER_SETTINGS_FILE)) {
          const settings = JSON.parse(
            await app.vault.adapter.read(PROVIDER_SETTINGS_FILE)
          );
          const savedProvider = settings.provider || "gemini";
          const savedModel =
            settings.model ||
            (PROVIDER_MODELS[savedProvider]
              ? PROVIDER_MODELS[savedProvider][0]
              : "gemini-1.5-flash-latest");
          setProvider(savedProvider);
          setModel(savedModel);
          const keyPath = SECRET_DIR + `${savedProvider}_api_key.txt`;
          if (await app.vault.adapter.exists(keyPath)) {
            const key = (await app.vault.adapter.read(keyPath)).trim();
            setApiKey(key);
            console.log(
              "Loaded API key for provider:",
              savedProvider,
              "Key length:",
              key.length
            );
          } else {
            console.log("No API key found at:", keyPath);
            setShowSettings(true);
          }
        } else {
          console.log("No provider settings file found");
          setShowSettings(true);
        }
      } catch (e) {
        console.error("Failed to load provider settings:", e);
        setShowSettings(true);
      }
    };
    loadProviderAndKey();
    const loadLearnings = async () => {
      const learningsFile = getLearningsFile();
      if (!learningsFile) return;
      if (await app.vault.adapter.exists(learningsFile)) {
        try {
          setLearnings(JSON.parse(await app.vault.adapter.read(learningsFile)));
        } catch (e) {
          console.error("Failed to load learnings:", e);
        }
      }
    };
    const loadSystemAdditions = async () => {
      const additionsFile = getSystemAdditionsFile();
      if (!additionsFile) return;
      if (await app.vault.adapter.exists(additionsFile)) {
        try {
          const content = await app.vault.adapter.read(additionsFile);
          const lines = content
            .split("\n")
            .filter((line) => line.trim() && !line.startsWith("#"));
          const additions = lines.map((line) => {
            const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
            if (match) {
              return {
                content: match[2].trim(),
                category: match[1].toLowerCase(),
                timestamp: Date.now(),
              };
            }
            return {
              content: line,
              category: "general",
              timestamp: Date.now(),
            };
          });
          setSystemPromptAdditions(additions);
        } catch (e) {
          console.error("Failed to load system additions:", e);
        }
      }
    };
    loadProviderAndKey();
    loadLearnings();
    loadSystemAdditions();
  }, [currentPath]);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showModelSelector && !e.target.closest("[data-model-selector]")) {
        setShowModelSelector(false);
      }
    };
    if (showModelSelector) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showModelSelector]);
  const saveLearning = async (userQuery, generatedQuery, feedback) => {
    const newLearning = {
      timestamp: Date.now(),
      userQuery,
      generatedQuery,
      feedback,
      success: feedback === "positive",
    };
    const updatedLearnings = [...learnings, newLearning];
    try {
      const learningsFile = getLearningsFile();
      if (!learningsFile) return;
      const helperDir = getHelperDir();
      if (helperDir && !(await app.vault.adapter.exists(helperDir))) {
        await app.vault.adapter.mkdir(helperDir);
      }
      await app.vault.adapter.write(
        learningsFile,
        JSON.stringify(updatedLearnings, null, 2)
      );
      setLearnings(updatedLearnings);
    } catch (e) {
      console.error("Failed to save learning:", e);
    }
  };
  const saveSystemAddition = async (addition) => {
    const newAddition = {
      timestamp: Date.now(),
      content: addition,
      category: detectCategory(addition),
    };
    const updatedAdditions = [...systemPromptAdditions, newAddition];
    try {
      const additionsFile = getSystemAdditionsFile();
      if (!additionsFile) return;
      const helperDir = getHelperDir();
      if (helperDir && !(await app.vault.adapter.exists(helperDir))) {
        await app.vault.adapter.mkdir(helperDir);
      }
      const lines = updatedAdditions.map(
        (add) => `[${add.category.toUpperCase()}] ${add.content}`
      );
      const content = `# Datacore Query Knowledge Base\n\n` + lines.join("\n");
      await app.vault.adapter.write(additionsFile, content);
      setSystemPromptAdditions(updatedAdditions);
    } catch (e) {
      console.error("Failed to save system addition:", e);
    }
  };
  const detectCategory = (text) => {
    const lower = text.toLowerCase();
    if (
      lower.includes("cannot") ||
      lower.includes("not support") ||
      lower.includes("limitation")
    )
      return "limitations";
    if (lower.includes("error") || lower.includes("issue")) return "errors";
    if (
      lower.includes("should") ||
      lower.includes("must") ||
      lower.includes("rule")
    )
      return "rules";
    return "general";
  };
  const extractAndSaveKnowledge = async (aiText) => {
    const limitationRegex = /\[LIMITATION:([^\]]+)\]/g;
    const ruleRegex = /\[RULE:([^\]]+)\]/g;
    const errorRegex = /\[ERROR:([^\]]+)\]/g;
    let match;
    while ((match = limitationRegex.exec(aiText)) !== null) {
      await saveSystemAddition(match[1].trim());
    }
    while ((match = ruleRegex.exec(aiText)) !== null) {
      await saveSystemAddition(match[1].trim());
    }
    while ((match = errorRegex.exec(aiText)) !== null) {
      await saveSystemAddition(match[1].trim());
    }
  };
  const buildSystemPrompt = () => {
    const basePrompt = `You are an expert Datacore query language assistant in a CONTINUOUS CONVERSATION. Remember the full context of our discussion.

RESPONSE MODES:
1. When user asks for a query directly: Respond conversationally AND provide the query in a code block
2. When discussing/explaining: Respond naturally and mark learnings:
   - [LIMITATION: text] for things Datacore cannot do
   - [RULE: text] for important rules discovered
   - [ERROR: text] for common mistakes identified

These markers are extracted and saved to improve future help. You are an expert Datacore query language assistant. Help users build queries for their Obsidian vault.

DATACORE QUERY LANGUAGE REFERENCE:

**Base Types:**
- @page - markdown pages
- @task - task items  
- @file - all files
- @section - sections
- @block - blocks
- @block-list - list blocks
- @codeblock - code blocks
- @datablock - YAML datablocks
- @list-item - list items

**Operators:**
- AND, OR, !not (NOT operator)
- ==, !=, >, >=, <, <= (comparison)
- .contains() - for arrays/strings

**Intrinsic Fields (use $ prefix):**
$path, $ctime, $mtime, $name, $tags, $title, $type, $completed, $status, $size, $extension, $links, $sections

**Functions:**
- path("folder/path") - items in folder
- exists(field) - items where field exists
- connected([[link]]) - connected items
- linkedto([[link]]) - items linking to
- linkedfrom([[link]]) - items linked from
- parentof(query) - parents of results
- childof(query) - children of results
- subtree(query) - item and descendants
- supertree(query) - item and ancestors

**Important Rules:**
1. Array fields ($tags, $links, $sections, etc.) MUST use .contains() not ==
2. Date fields ($ctime, $mtime) use comparison operators, NOT .contains()
3. String fields can use .contains() or ==
4. Combine with AND/OR, use !not for negation
5. For custom frontmatter fields without spaces, use field name directly
6. For fields with spaces, use row["field name"] syntax

**Examples:**
- Find pages with tag: @page AND $tags.contains("project")
- Recent incomplete tasks: @task AND $completed = false AND $ctime > date("2024-01-01")
- Pages in folder: @page AND path("Projects/Active")
- Items with rating: @page AND exists(rating) AND rating >= 7
- Connected items: @page AND connected([[My Note]])`;

    let additions = "";
    if (systemPromptAdditions.length > 0) {
      const byCategory = {};
      systemPromptAdditions.forEach((add) => {
        if (!byCategory[add.category]) byCategory[add.category] = [];
        byCategory[add.category].push(add.content);
      });
      additions = "\n\n**LEARNED KNOWLEDGE:**\n";
      for (const [cat, items] of Object.entries(byCategory)) {
        additions +=
          `\n*${cat.toUpperCase()}:*\n` +
          items.map((i) => `- ${i}`).join("\n") +
          "\n";
      }
    }
    const successfulExamples = learnings.filter((l) => l.success).slice(-5);
    if (successfulExamples.length > 0) {
      return (
        basePrompt +
        additions +
        `\n\n**LEARNED FROM USER (Recent Successful Queries):**\n` +
        successfulExamples
          .map((l) => `User: "${l.userQuery}"\nQuery: ${l.generatedQuery}`)
          .join("\n\n")
      );
    }
    return basePrompt + additions;
  };
  const saveProviderConfig = async (newProvider, newApiKey) => {
    try {
      if (!(await app.vault.adapter.exists(SECRET_DIR))) {
        await app.vault.adapter.mkdir(SECRET_DIR);
      }
      const keyPath = SECRET_DIR + `${newProvider}_api_key.txt`;
      await app.vault.adapter.write(keyPath, newApiKey);
      const datacoreDir = ".datacore/datacorequery";
      if (!(await app.vault.adapter.exists(datacoreDir))) {
        await app.vault.adapter.mkdir(datacoreDir);
      }
      const defaultModel = PROVIDER_MODELS[newProvider]
        ? PROVIDER_MODELS[newProvider][0]
        : "gemini-1.5-flash-latest";
      const providerSettings = {
        provider: newProvider,
        model: defaultModel,
        updated: Date.now(),
      };
      await app.vault.adapter.write(
        PROVIDER_SETTINGS_FILE,
        JSON.stringify(providerSettings, null, 2)
      );
      setProvider(newProvider);
      setModel(defaultModel);
      setApiKey(newApiKey);
      setShowSettings(false);
      console.log(
        "Saved provider config:",
        newProvider,
        "Model:",
        defaultModel,
        "Key length:",
        newApiKey.length
      );
    } catch (e) {
      console.error("Failed to save provider config:", e);
    }
  };
  const saveModelChange = async (newModel) => {
    try {
      const datacoreDir = ".datacore/datacorequery";
      if (!(await app.vault.adapter.exists(datacoreDir))) {
        await app.vault.adapter.mkdir(datacoreDir);
      }
      if (await app.vault.adapter.exists(PROVIDER_SETTINGS_FILE)) {
        const settings = JSON.parse(
          await app.vault.adapter.read(PROVIDER_SETTINGS_FILE)
        );
        settings.model = newModel;
        settings.updated = Date.now();
        await app.vault.adapter.write(
          PROVIDER_SETTINGS_FILE,
          JSON.stringify(settings, null, 2)
        );
      }
      setModel(newModel);
      setShowModelSelector(false);
      console.log("Saved model change:", newModel);
    } catch (e) {
      console.error("Failed to save model change:", e);
    }
  };
  useEffect(() => {
    if (currentQuery && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `I see you're working on this query:\n\n\`\`\`\n${currentQuery}\n\`\`\`\n\nHow can I help you improve or modify it?`,
        },
      ]);
    }
  }, [currentQuery]);
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;
    if (!apiKey) {
      setError(
        "No API key configured. Click the settings button to set up your AI provider."
      );
      setShowSettings(true);
      return;
    }
    const userMessage = { role: "user", content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);
    setError(null);
    try {
      const systemPrompt = buildSystemPrompt();
      let url, body, headers, responseData;
      if (provider === "gemini") {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const conversationHistory = messages.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));
        conversationHistory.push({
          role: "user",
          parts: [{ text: userInput }],
        });
        body = {
          contents: conversationHistory,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7 },
        };
        headers = { "Content-Type": "application/json" };
      } else if (provider === "openai" || provider === "groq") {
        url =
          provider === "openai"
            ? "https://api.openai.com/v1/chat/completions"
            : "https://api.groq.com/openai/v1/chat/completions";
        const conversationHistory = [{ role: "system", content: systemPrompt }];
        messages.forEach((msg) =>
          conversationHistory.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          })
        );
        conversationHistory.push({ role: "user", content: userInput });
        body = {
          model: model,
          messages: conversationHistory,
          temperature: 0.7,
        };
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
      } else if (provider === "anthropic") {
        url = "https://api.anthropic.com/v1/messages";
        const conversationHistory = [];
        messages.forEach((msg) =>
          conversationHistory.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          })
        );
        conversationHistory.push({ role: "user", content: userInput });
        body = {
          model: model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: conversationHistory,
          temperature: 0.7,
        };
        headers = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };
      }
      if (window.app && window.app.requestUrl) {
        const response = await window.app.requestUrl({
          url,
          method: "POST",
          headers,
          body: JSON.stringify(body),
          throw: false,
        });
        responseData = response.json;
        if (response.status >= 400)
          throw new Error(
            responseData?.error?.message || `API Error (${response.status})`
          );
      } else {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        responseData = await response.json();
        if (!response.ok)
          throw new Error(responseData?.error?.message || "API call failed");
      }
      let aiText;
      if (provider === "gemini") {
        aiText = responseData.candidates[0].content.parts[0].text.trim();
      } else if (provider === "openai" || provider === "groq") {
        aiText = responseData.choices[0].message.content.trim();
      } else if (provider === "anthropic") {
        aiText = responseData.content[0].text.trim();
      }
      const aiMessage = { role: "assistant", content: aiText };
      setMessages((prev) => [...prev, aiMessage]);
      await extractAndSaveKnowledge(aiText);
    } catch (err) {
      console.error("AI Error:", err);
      setError(err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };
  const extractQuery = (text) => {
    const codeBlockMatch = text.match(/```(?:datacore)?\n?(.*?)\n?```/s);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("@")) return line.trim();
    }
    return null;
  };
  const handleUseQuery = (queryText) => {
    const extractedQuery = extractQuery(queryText);
    if (extractedQuery) {
      onQueryGenerated(extractedQuery);
      const lastUserMsg = messages.filter((m) => m.role === "user").pop();
      if (lastUserMsg) {
        saveLearning(lastUserMsg.content, extractedQuery, "positive");
      }
    }
  };
  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    modal: {
      backgroundColor: "#0a0a0a",
      border: "2px solid #9b87f5",
      borderRadius: "8px",
      padding: 0,
      maxWidth: "700px",
      width: "90%",
      maxHeight: "85vh",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 20px",
      borderBottom: "2px solid #9b87f5",
      flexShrink: 0,
    },
    title: {
      margin: 0,
      color: "#ffffff",
      fontSize: "18px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    headerButtons: { display: "flex", gap: "8px" },
    button: {
      padding: "8px 16px",
      backgroundColor: "#9b87f5",
      border: "none",
      borderRadius: "4px",
      color: "#000000",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all 0.2s",
      fontSize: "12px",
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "#9b87f5",
      fontSize: "24px",
      cursor: "pointer",
      padding: "4px 8px",
    },
    chatContainer: {
      flex: 1,
      overflowY: "auto",
      padding: "20px",
      minHeight: 0,
    },
    message: {
      marginBottom: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    userMessage: {
      alignSelf: "flex-end",
      maxWidth: "80%",
      backgroundColor: "#9b87f5",
      color: "#000000",
      padding: "10px 14px",
      borderRadius: "12px 12px 2px 12px",
      fontSize: "14px",
    },
    assistantMessage: {
      alignSelf: "flex-start",
      maxWidth: "85%",
      backgroundColor: "#1a1a1a",
      color: "#ffffff",
      padding: "12px 16px",
      borderRadius: "12px 12px 12px 2px",
      fontSize: "14px",
      lineHeight: "1.6",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
    queryBlock: {
      backgroundColor: "#000000",
      border: "1px solid #9b87f5",
      borderRadius: "4px",
      padding: "10px",
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#9b87f5",
      margin: "8px 0",
      wordBreak: "break-all",
    },
    useQueryBtn: {
      padding: "6px 12px",
      backgroundColor: "#9b87f5",
      border: "none",
      borderRadius: "4px",
      color: "#000000",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "11px",
      marginTop: "8px",
    },
    inputArea: {
      borderTop: "1px solid #9b87f5",
      padding: "16px",
      display: "flex",
      gap: "10px",
      flexShrink: 0,
    },
    textarea: {
      flex: 1,
      padding: "10px",
      backgroundColor: "#1a1a1a",
      border: "1px solid #9b87f5",
      borderRadius: "4px",
      color: "#ffffff",
      fontFamily: "inherit",
      fontSize: "14px",
      resize: "none",
      minHeight: "40px",
      maxHeight: "100px",
    },
    error: {
      color: "#ff6b6b",
      padding: "12px",
      textAlign: "center",
      fontSize: "13px",
    },
    info: {
      padding: "8px 20px",
      color: "#9b87f5",
      fontSize: "11px",
      borderTop: "1px solid #9b87f5",
      textAlign: "center",
      flexShrink: 0,
    },
    emptyState: {
      textAlign: "center",
      color: "#666",
      padding: "40px 20px",
      fontSize: "14px",
    },
    loading: {
      textAlign: "center",
      color: "#9b87f5",
      padding: "12px",
      fontSize: "14px",
      fontStyle: "italic",
    },
  };

  const handleGrantConsent = () => {
    localStorage.setItem("datacore-ai-consent", "true");
    setAiConsentGranted(true);
  };

  if (!aiConsentGranted) {
    const handleCancel = () => {
      if (onClose) onClose();
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "#050508",
          color: "#fff",
          padding: "24px 16px",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "var(--font-interface, sans-serif)",
          position: "relative",
          textAlign: "center"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "16px"
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              fontSize: "20px",
              cursor: "pointer",
              transition: "color 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.color = "#fff"}
            onMouseOut={e => e.currentTarget.style.color = "#666"}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <dc.Icon icon="sparkles" style={{ fontSize: "42px", color: "#9b87f5" }} />
        </div>

        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "750", color: "#fff", letterSpacing: "-0.01em" }}>
          Enable Vault AI Assistant
        </h3>
        
        <p style={{ margin: "0 0 20px 0", fontSize: "11px", color: "#9090b0", lineHeight: "1.5", maxWidth: "280px" }}>
          To build customized, context-aware queries tailored specifically for your files, tags, and properties, the Copilot needs access to your vault's structural index.
        </p>

        <div
          style={{
            background: "rgba(155,135,245,0.04)",
            border: "1px solid rgba(155,135,245,0.12)",
            borderRadius: "6px",
            padding: "12px 14px",
            textAlign: "left",
            width: "100%",
            maxWidth: "280px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "24px"
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <dc.Icon icon="shield" style={{ fontSize: "12px", color: "#9b87f5", marginTop: "2px", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "10.5px", fontWeight: "bold", color: "#fff" }}>Privacy First</div>
              <div style={{ fontSize: "9.5px", color: "#7a7a9a", marginTop: "2px" }}>The assistant only indexes metadata names (tags list, folders, field keys). It **never** reads, uploads, or sends actual note content or private text.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <dc.Icon icon="database" style={{ fontSize: "12px", color: "#9b87f5", marginTop: "2px", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "10.5px", fontWeight: "bold", color: "#fff" }}>Context Aware Querying</div>
              <div style={{ fontSize: "9.5px", color: "#7a7a9a", marginTop: "2px" }}>Indexes custom tags, folder hierarchies, and properties so they appear instantly in autocomplete selectors and AI prompts.</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "280px" }}>
          <button
            onClick={handleGrantConsent}
            style={{
              padding: "10px 16px",
              backgroundColor: "#9b87f5",
              color: "#050508",
              border: "none",
              borderRadius: "6px",
              fontWeight: "750",
              fontSize: "11px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(155,135,245,0.2)"
            }}
            onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseOut={e => e.currentTarget.style.transform = "none"}
          >
            Allow Access & Enable AI
          </button>
          
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              backgroundColor: "transparent",
              color: "#666680",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "10px",
              cursor: "pointer",
              transition: "color 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.color = "#999"}
            onMouseOut={e => e.currentTarget.style.color = "#666680"}
          >
            Not Now
          </button>
        </div>
      </div>
    );
  }

  // When in drawer mode, render without overlay
  if (isDrawerMode) {

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "#0a0a0a",
          position: "relative",
        }}
      >
        {showSettings && (
          <AISettingsModal
            onClose={() => setShowSettings(false)}
            onSave={saveProviderConfig}
            currentProvider={provider}
            currentApiKey={apiKey}
            isInline={true}
          />
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #9b87f5",
            flexShrink: 0,
          }}
        >
          {" "}
          <h3
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <dc.Icon icon="sparkles" style={{ fontSize: "16px" }} />
            AI Query Assistant
          </h3> <div style={{ display: "flex", gap: "8px" }}>
            {" "}
            {messages.length > 0 && (
              <button
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#1a1a1a",
                  color: "#9b87f5",
                  border: "1px solid #9b87f5",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
                onClick={handleClearChat}
              >
                Clear Chat
              </button>
            )} <button
              style={{
                padding: "6px 12px",
                backgroundColor: "#1a1a1a",
                color: "#9b87f5",
                border: "1px solid #9b87f5",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onClick={() => setShowSettings(true)}
            >
              <dc.Icon icon="settings" style={{ fontSize: "12px" }} />
              Settings
            </button>{" "}
          </div>{" "}
        </div> <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid #2d2d2d",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#0f0f0f",
            position: "relative",
          }}
        >
          {" "}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "#9b87f5",
            }}
            data-model-selector
          >
            {" "}
            <dc.Icon
              icon={
                provider === "gemini"
                  ? "sparkles"
                  : provider === "openai"
                  ? "bot"
                  : provider === "anthropic"
                  ? "brain"
                  : "zap"
              }
              style={{ fontSize: "14px" }}
            /> <span
              style={{ fontWeight: "bold", textTransform: "capitalize" }}
            >
              {provider}
            </span> <span style={{ color: "#666" }}>•</span> <button
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "3px",
                transition: "all 0.2s",
              }}
              onClick={() => setShowModelSelector(!showModelSelector)}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#1a1a1a")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              {" "}
              {model} <dc.Icon
                icon={showModelSelector ? "chevron-up" : "chevron-down"}
                style={{ fontSize: "10px", marginLeft: "4px" }}
              />{" "}
            </button>{" "}
          </div> {apiKey && (
            <div style={{ fontSize: "10px", color: "#666", display: "flex", alignItems: "center", gap: "4px" }}>
              <dc.Icon icon="key" style={{ fontSize: "10px" }} /> API key configured
            </div>
          )} {showModelSelector && (
            <div
              data-model-selector
              style={{
                position: "absolute",
                top: "100%",
                right: "16px",
                backgroundColor: "#0a0a0a",
                border: "1px solid #9b87f5",
                borderRadius: "4px",
                padding: "8px",
                zIndex: 200,
                minWidth: "200px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {" "}
              {PROVIDER_MODELS[provider]?.map((m) => (
                <button
                  key={m}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    background: model === m ? "#9b87f5" : "none",
                    border: "none",
                    color: model === m ? "#000000" : "#ffffff",
                    cursor: "pointer",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                  onClick={() => saveModelChange(m)}
                  onMouseOver={(e) => {
                    if (model !== m)
                      e.currentTarget.style.backgroundColor = "#1a1a1a";
                  }}
                  onMouseOut={(e) => {
                    if (model !== m)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {" "}
                  {m} {model === m && " ✓"}{" "}
                </button>
              ))}{" "}
            </div>
          )}{" "}
        </div> <div
          ref={chatContainerRef}
          style={{ flex: 1, overflowY: "auto", padding: "16px", minHeight: 0 }}
        >
          {" "}
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                padding: "20px 16px",
                fontSize: "13px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {" "}
              <div>
                <dc.Icon icon="message-square" style={{ fontSize: "24px", color: "#9b87f5" }} />
              </div>
              Ask me anything about building Datacore queries!
              <br />
              I can help you understand syntax, fix errors, and build complex
              queries.
              <br />I learn from our conversation to provide better help.{" "}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {" "}
                {msg.role === "user" ? (
                  <div
                    style={{
                      alignSelf: "flex-end",
                      maxWidth: "80%",
                      backgroundColor: "#9b87f5",
                      color: "#000000",
                      padding: "8px 12px",
                      borderRadius: "12px 12px 2px 12px",
                      fontSize: "13px",
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div>
                    {" "}
                    <div
                      style={{
                        alignSelf: "flex-start",
                        maxWidth: "85%",
                        backgroundColor: "#1a1a1a",
                        color: "#ffffff",
                        padding: "10px 14px",
                        borderRadius: "12px 12px 12px 2px",
                        fontSize: "13px",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content.replace(
                        /\[LIMITATION:[^\]]+\]|\[RULE:[^\]]+\]|\[ERROR:[^\]]+\]/g,
                        ""
                      )}
                    </div> {extractQuery(msg.content) && (
                      <button
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#9b87f5",
                          border: "none",
                          borderRadius: "4px",
                          color: "#000000",
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: "11px",
                          marginTop: "6px",
                        }}
                        onClick={() => handleUseQuery(msg.content)}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.opacity = "0.8")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.opacity = "1")
                        }
                      >
                        {" "}
                        ✓ Use This Query{" "}
                      </button>
                    )}{" "}
                  </div>
                )}{" "}
              </div>
            ))
          )} {isLoading && (
            <div
              style={{
                textAlign: "center",
                color: "#9b87f5",
                padding: "10px",
                fontSize: "13px",
                fontStyle: "italic",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <dc.Icon icon="loader" style={{ fontSize: "14px" }} /> Thinking...
            </div>
          )} {error && (
            <div
              style={{
                color: "#ff6b6b",
                padding: "10px",
                textAlign: "center",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <dc.Icon icon="alert-triangle" style={{ fontSize: "12px" }} /> {error}
            </div>
          )}{" "}
        </div> <div
          style={{
            borderTop: "1px solid #9b87f5",
            padding: "12px 16px",
            display: "flex",
            gap: "8px",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {helperState.type && (
            <div
              className="dqb-helper-popup"
              style={{
                position: "absolute",
                bottom: "100%",
                left: "16px",
                right: "16px",
                backgroundColor: "#0a0a0a",
                border: "1px solid #9b87f5",
                borderRadius: "4px",
                zIndex: 999,
                marginBottom: "4px",
                boxShadow: "0 -4px 12px rgba(0,0,0,0.5)",
              }}
            >
              {helperState.type === "main" && (
                <MainSelectorHelper
                  onSelectCategory={handleSelectCategory}
                />
              )}
              {helperState.type === "tag" && (
                <TagHelper
                  searchTerm={helperState.searchTerm}
                  onTagSelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "folder" && (
                <FolderHelper
                  searchTerm={helperState.searchTerm}
                  onFolderSelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "file" && (
                <FileHelper
                  searchTerm={helperState.searchTerm}
                  onFileSelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "property" && (
                <GenericPropertyHelper
                  searchTerm={helperState.searchTerm}
                  onPropertySelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "property_op" && (
                <PropertyOperatorHelper
                  fieldName={helperState.propertyName}
                  onOperatorSelect={handleSelectPropertyOperator}
                />
              )}
              {helperState.type === "property_value" && (
                <FieldValueHelper
                  fieldName={helperState.propertyName}
                  searchTerm={helperState.searchTerm}
                  operator={helperState.operator}
                  onValueSelect={handleSelectPropertyValue}
                />
              )}
            </div>
          )}
          <textarea
            className="dqb-ai-textarea"
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "#1a1a1a",
              border: "1px solid #9b87f5",
              borderRadius: "4px",
              color: "#ffffff",
              fontFamily: "inherit",
              fontSize: "13px",
              resize: "none",
              minHeight: "36px",
              maxHeight: "80px",
            }}
            value={userInput}
            onChange={(e) => {
              const val = e.target.value;
              setUserInput(val);
              detectTrigger(val, e.target.selectionStart);
            }}
            onKeyUp={(e) => {
              if (e.key === "Tab") return;
              detectTrigger(e.target.value, e.target.selectionStart);
            }}
            onSelect={(e) => {
              detectTrigger(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab" && helperState.type) {
                e.preventDefault();
                const parent = e.currentTarget.parentElement;
                const popup = parent ? parent.querySelector(".dqb-helper-popup") : null;
                const firstButton = popup ? popup.querySelector("button") : null;
                if (firstButton) {
                  setTimeout(() => {
                    firstButton.click();
                  }, 0);
                }
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask a question or describe what you want to query..."
            disabled={isLoading}
          /> <button
            style={{
              padding: "8px 16px",
              backgroundColor: "#9b87f5",
              border: "none",
              borderRadius: "4px",
              color: "#000000",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "12px",
            }}
            onClick={handleSendMessage}
            disabled={isLoading || !userInput.trim()}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {" "}
            Send{" "}
          </button>{" "}
        </div> <div
          style={{
            padding: "8px 16px",
            color: "#9b87f5",
            fontSize: "10px",
            borderTop: "1px solid #9b87f5",
            textAlign: "center",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          {" "}
          <dc.Icon icon="info" style={{ fontSize: "10px" }} />
          {systemPromptAdditions.length > 0 &&
            `Learned ${systemPromptAdditions.length} rules | `} {
            learnings.filter((l) => l.success).length
          } successful queries learned{" "}
        </div>{" "}
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <dc.Icon icon="sparkles" style={{ fontSize: "18px" }} />
            AI Query Assistant
          </h3>{" "}
          <div style={styles.headerButtons}>
            {messages.length > 0 && (
              <button
                style={{
                  ...styles.button,
                  backgroundColor: "#1a1a1a",
                  color: "#9b87f5",
                  border: "1px solid #9b87f5",
                }}
                onClick={handleClearChat}
              >
                Clear Chat
              </button>
            )}{" "}
            <button style={styles.closeBtn} onClick={onClose}>
              ×
            </button>
          </div>
        </div>{" "}
        <div ref={chatContainerRef} style={styles.chatContainer}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ marginBottom: "8px" }}>
                <dc.Icon icon="message-square" style={{ fontSize: "28px", color: "#9b87f5" }} />
              </div>
              Ask me anything about building Datacore queries!
              <br />
              <br /> I can help you understand syntax, fix errors, and build complex
              queries.
              <br />I learn from our conversation to provide better help.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={styles.message}>
                {msg.role === "user" ? (
                  <div style={styles.userMessage}>{msg.content}</div>
                ) : (
                  <div>
                    <div style={styles.assistantMessage}>
                      {msg.content.replace(
                        /\[LIMITATION:[^\]]+\]|\[RULE:[^\]]+\]|\[ERROR:[^\]]+\]/g,
                        ""
                      )}
                    </div>{" "}
                    {extractQuery(msg.content) && (
                      <button
                        style={styles.useQueryBtn}
                        onClick={() => handleUseQuery(msg.content)}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.opacity = "0.8")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.opacity = "1")
                        }
                      >
                        ✓ Use This Query
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}{" "}
          {isLoading && (
            <div style={{ ...styles.loading, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <dc.Icon icon="loader" style={{ fontSize: "14px" }} /> Thinking...
            </div>
          )}{" "}
          {error && (
            <div style={{ ...styles.error, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <dc.Icon icon="alert-triangle" style={{ fontSize: "12px" }} /> {error}
            </div>
          )}
        </div>{" "}
        <div style={{ ...styles.inputArea, position: "relative" }}>
          {helperState.type && (
            <div
              className="dqb-helper-popup"
              style={{
                position: "absolute",
                bottom: "100%",
                left: "16px",
                right: "16px",
                backgroundColor: "#0a0a0a",
                border: "1px solid #9b87f5",
                borderRadius: "4px",
                zIndex: 999,
                marginBottom: "4px",
                boxShadow: "0 -4px 12px rgba(0,0,0,0.5)",
              }}
            >
              {helperState.type === "main" && (
                <MainSelectorHelper
                  onSelectCategory={handleSelectCategory}
                />
              )}
              {helperState.type === "tag" && (
                <TagHelper
                  searchTerm={helperState.searchTerm}
                  onTagSelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "folder" && (
                <FolderHelper
                  searchTerm={helperState.searchTerm}
                  onFolderSelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "file" && (
                <FileHelper
                  searchTerm={helperState.searchTerm}
                  onFileSelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "property" && (
                <GenericPropertyHelper
                  searchTerm={helperState.searchTerm}
                  onPropertySelect={handleSelectSuggestion}
                />
              )}
              {helperState.type === "property_op" && (
                <PropertyOperatorHelper
                  fieldName={helperState.propertyName}
                  onOperatorSelect={handleSelectPropertyOperator}
                />
              )}
              {helperState.type === "property_value" && (
                <FieldValueHelper
                  fieldName={helperState.propertyName}
                  searchTerm={helperState.searchTerm}
                  operator={helperState.operator}
                  onValueSelect={handleSelectPropertyValue}
                />
              )}
            </div>
          )}
          <textarea
            className="dqb-ai-textarea"
            style={styles.textarea}
            value={userInput}
            onChange={(e) => {
              const val = e.target.value;
              setUserInput(val);
              detectTrigger(val, e.target.selectionStart);
            }}
            onKeyUp={(e) => {
              if (e.key === "Tab") return;
              detectTrigger(e.target.value, e.target.selectionStart);
            }}
            onSelect={(e) => {
              detectTrigger(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab" && helperState.type) {
                e.preventDefault();
                const parent = e.currentTarget.parentElement;
                const popup = parent ? parent.querySelector(".dqb-helper-popup") : null;
                const firstButton = popup ? popup.querySelector("button") : null;
                if (firstButton) {
                  setTimeout(() => {
                    firstButton.click();
                  }, 0);
                }
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask a question or describe what you want to query..."
            disabled={isLoading}
          />{" "}
          <button
            style={{ ...styles.button, padding: "10px 16px" }}
            onClick={handleSendMessage}
            disabled={isLoading || !userInput.trim()}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Send
          </button>
        </div>{" "}
        <div style={{ ...styles.info, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
          <dc.Icon icon="info" style={{ fontSize: "10px" }} />
          {systemPromptAdditions.length > 0 &&
            `Learned ${systemPromptAdditions.length} rules | `}{" "}
          {learnings.filter((l) => l.success).length} successful queries learned
        </div>
      </div>
    </div>
  );
}

return { AIQueryAssistant, FieldValueHelper };
