/**
 * Loads a script from CDN or local vault path with caching and global deduplication.
 */
async function loadScript(dc, src, options = {}) {
  const {
    type = 'script',
    globalName = null,
    cache = true,
    onload = null,
    onerror = null
  } = options;

  if (!dc || !dc.app || !dc.app.vault || !dc.app.vault.adapter) {
    const error = new Error("Datacore context 'dc' with vault adapter is required.");
    if (onerror) onerror(error);
    throw error;
  }

  const adapter = dc.app.vault.adapter;
  const cacheDir = ".datacore/script_cache";
  const isUrl = /^https?:\/\//.test(src);

  // Global deduplication check
  if (globalName && window[globalName]) {
    return type === 'module' ? window[globalName] : Promise.resolve();
  }

  // Global promise tracking
  window.__scriptPromises = window.__scriptPromises || {};
  const promiseKey = `${type}:${src}`;
  
  if (window.__scriptPromises[promiseKey]) {
    return window.__scriptPromises[promiseKey];
  }

  const loadPromise = (async () => {
    try {
      let scriptContent = null;

      if (isUrl) {
        const safeFilename = src
          .replace(/^https?:\/\//, '')
          .replace(/[\/\\?%*:|"<>]/g, '_') + '.js';
        const cachePath = `${cacheDir}/${safeFilename}`;

        // Check cache first
        if (cache && await adapter.exists(cachePath)) {
          try {
            scriptContent = await adapter.read(cachePath);
          } catch (readError) {
            console.warn(`[LoadScript] ⚠️ Cache read failed, refetching:`, readError);
          }
        }

        // Fetch from network if not cached
        if (scriptContent === null) {
          const response = await fetch(src);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          scriptContent = await response.text();
          
          // Cache for future use
          if (cache) {
            try {
              if (!(await adapter.exists(cacheDir))) {
                await adapter.mkdir(cacheDir);
              }
              await adapter.write(cachePath, scriptContent);
            } catch (writeError) {
              console.warn(`[LoadScript] ⚠️ Cache write failed:`, writeError);
            }
          }
        }
      } else {
        // Clean leading slash if any
        const cleanSrc = src.replace(/^\//, '');
        if (!(await adapter.exists(cleanSrc))) {
          throw new Error(`Local file not found: ${cleanSrc}`);
        }
        scriptContent = await adapter.read(cleanSrc);
      }

      // Execute based on type
      let result;

      if (type === 'module') {
        const blob = new Blob([scriptContent], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        
        try {
          const moduleExports = await import(blobUrl);
          URL.revokeObjectURL(blobUrl);
          
          if (globalName) {
            window[globalName] = moduleExports;
          }
          
          result = moduleExports;
        } catch (importError) {
          URL.revokeObjectURL(blobUrl);
          throw new Error(`Module import failed: ${importError.message}`);
        }
      } else {
        // For inline scripts, we need to execute and then poll for the global
        const scriptElement = document.createElement('script');
        scriptElement.textContent = scriptContent;
        document.body.appendChild(scriptElement);
        
        // Now wait for the global variable if specified
        if (globalName) {
          const maxWaitTime = 5000; // 5 seconds
          const checkInterval = 50; // Check every 50ms
          const startTime = Date.now();
          
          while (!window[globalName] && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(r => setTimeout(r, checkInterval));
          }
          
          if (window[globalName]) {
            result = window[globalName];
          } else {
            throw new Error(`Timeout waiting for ${globalName} to be available`);
          }
        } else {
          result = scriptElement;
        }
      }

      if (onload) onload(result);
      return result;

    } catch (error) {
      if (onerror) onerror(error);
      throw error;
    } finally {
      delete window.__scriptPromises[promiseKey];
    }
  })();

  window.__scriptPromises[promiseKey] = loadPromise;
  return loadPromise;
}

return { loadScript };
