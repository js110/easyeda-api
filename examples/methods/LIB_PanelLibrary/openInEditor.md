# LIB_PanelLibrary.openInEditor

## 这个 API 是干什么的

在编辑器打开文档

## 什么时候该用它

当你希望给扩展加提示、窗口交互或即时反馈时，这个案例可以直接复用。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_PanelLibrary_openInEditor_' + Date.now();
  const panelLibraryCandidates = await eda.lib_PanelLibrary.search('A4');
  const panelLibraryItem = panelLibraryCandidates?.[0];
  const panelLibraryUuid = panelLibraryItem?.uuid;
  const panelLibraryLibraryUuid = panelLibraryItem?.libraryUuid;
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  const splitScreenId = currentDocument?.tabId ? await eda.dmt_EditorControl.getSplitScreenIdByTabId(currentDocument.tabId) : undefined;
  const result = await eda.lib_PanelLibrary.openInEditor(panelLibraryUuid, panelLibraryLibraryUuid, splitScreenId);
  return { fixtureName, result };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `panelLibraryUuid`：面板库 UUID
- `libraryUuid`：库 UUID，可以使用 LIB\_LibrariesList 内的接口获取
- `splitScreenId`：_（可选）_ 分屏 ID，不填写则默认在最后输入焦点的分屏内打开，可以使用 DMT\_EditorControl 内的接口获取

- 返回值：Promise<string \| undefined>

标签页 ID，对应 [IDMT\_EditorTabItem.tabId](../interfaces/IDMT_EditorTabItem.md) ，可使用 [DMT\_EditorControl.getSplitScreenIdByTabId()](./DMT_EditorControl.md) 获取到分屏 ID 

## 常见错误与排查


## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_PanelLibrary.openInEditor`。
