# DMT_EditorControl.createSplitScreen

## 这个 API 是干什么的

创建分屏

## 什么时候该用它

当你想把 createSplitScreen 放进自动化脚本、批处理或测试脚本时，可以先照着这个案例跑一遍，确认创建后的返回值和清理方式。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：manual

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_EditorControl_createSplitScreen_' + Date.now();
  const fixtureSlug = fixtureName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  const tabId = currentDocument?.tabId;
  const created = await eda.dmt_EditorControl.createSplitScreen(undefined, tabId);
  const primitiveId = created?.getState_PrimitiveId?.() ?? created?.primitiveId ?? created?.id;
  if (primitiveId) {
    await eda.dmt_EditorControl.delete([primitiveId]);
  }
  return {
    fixtureName,
    created,
    cleanupStrategy: 'auto',
  };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `splitScreenType`：分屏类型，`horizontal` 水平、`vertical` 垂直
- `tabId`：标签页 ID，该标签页将会被移入新的分屏中

- 返回值：Promise<{ sourceSplitScreenId: string; newSplitScreenId: string; } \| undefined>

分屏 ID，`sourceSplitScreenId` 代表源分屏，`newSplitScreenId` 代表新分屏 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个参数是枚举类型 EDMT_EditorSplitScreenDirection，生成器先给出最保守的占位值，使用前建议结合对应枚举文档细化。
- 案例会优先使用当前活动标签页。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_EditorControl.createSplitScreen`。
