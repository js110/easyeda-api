# DMT_EditorControl.openLibraryDocument

## 这个 API 是干什么的

打开库符号、封装文档

## 什么时候该用它

当你希望给扩展加提示、窗口交互或即时反馈时，这个案例可以直接复用。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_EditorControl_openLibraryDocument_' + Date.now();
  const symbolCandidates = await eda.lib_Symbol.search('STM32');
  const symbolItem = symbolCandidates?.[0];
  const symbolUuid = symbolItem?.uuid;
  const symbolLibraryUuid = symbolItem?.libraryUuid;
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  const splitScreenId = currentDocument?.tabId ? await eda.dmt_EditorControl.getSplitScreenIdByTabId(currentDocument.tabId) : undefined;
  const result = await eda.dmt_EditorControl.openLibraryDocument(symbolLibraryUuid, '2', symbolUuid, splitScreenId);
  return { fixtureName, result };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `libraryUuid`：库 UUID，可以使用 LIB\_LibrariesList 内的接口获取
- `libraryType`：库类型，支持符号和封装
- `uuid`：符号、封装 UUID
- `splitScreenId`：_（可选）_ 分屏 ID，即 DMT\_EditorControl.getSplitScreenTree() 方法获取到的 IDMT\_EditorSplitScreenItem.id

- 返回值：Promise<string \| undefined>

标签页 ID，如若为 `undefined` ，则打开文档失败 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。

## 生成器补充说明

- 打开库文档案例默认用符号搜索结果作为可运行样本。
- 这里直接使用库类型字符串值 `"2"`，对应 `ELIB_LibraryType.SYMBOL`，避免依赖运行时未暴露的枚举对象。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_EditorControl.openLibraryDocument`。
