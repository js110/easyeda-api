# DMT_EditorControl.getTabsBySplitScreenId

## 这个 API 是干什么的

获取指定分屏 ID 下的所有标签页

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getTabsBySplitScreenId 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_EditorControl_getTabsBySplitScreenId_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先打开一个工程再运行这个案例。'); }
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  const splitScreenId = currentDocument?.tabId ? await eda.dmt_EditorControl.getSplitScreenIdByTabId(currentDocument.tabId) : undefined;
  const result = await eda.dmt_EditorControl.getTabsBySplitScreenId(splitScreenId);
  return {
    fixtureName,
    currentProject: currentProject?.friendlyName ?? currentProject?.name ?? currentProject?.uuid ?? null,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `splitScreenId`：分屏 ID

- 返回值：Promise<Array<[IDMT\_EditorTabItem](../interfaces/IDMT_EditorTabItem.md) >>

标签页列表 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_EditorControl.getTabsBySplitScreenId`。
