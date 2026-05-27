// index.jsx
async function View({ folderPath, dc }) {
  const { useState, useEffect } = dc;
  const { App } = await dc.require(folderPath + "/src/App.jsx");

  function RootView() {
    const [stamp, setStamp] = useState(0);

    useEffect(() => {
      // Polling watch daemon for HMR
      const interval = setInterval(async () => {
        try {
          const cmdFile = folderPath + "/data/mcp_commands.json";
          const stat = await dc.app.vault.adapter.stat(cmdFile);
          if (stat && stat.mtime > stamp) {
            setStamp(stat.mtime);
          }
        } catch (e) {
          // Ignore file not found
        }
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }, [stamp]);

    return <App key={stamp} />;
  }

  return <RootView />;
}

return { View };
