	

```datacorejsx
const activeFile = dc.resolvePath("DATACORE QUERY BUILDER") || "_RESOURCES/DATACORE/_DONE/DATACORE QUERY BUILDER/DATACORE QUERY BUILDER";
const folderPath = activeFile.substring(0, activeFile.lastIndexOf('/'));
const { View } = await dc.require(folderPath + "/src/index.jsx");
return await View({ folderPath, dc });
```
