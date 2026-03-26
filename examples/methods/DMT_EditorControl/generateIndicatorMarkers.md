# DMT_EditorControl.generateIndicatorMarkers

## 这个 API 是干什么的

生成指示标记

## 什么时候该用它

当你需要理解 DMT_EditorControl.generateIndicatorMarkers 的调用方式、返回值和使用边界时，这个案例可以作为起点。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_EditorControl_generateIndicatorMarkers_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先补齐环境再调试这个案例。'); }
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  const tabId = currentDocument?.tabId;
  const result = await eda.dmt_EditorControl.generateIndicatorMarkers([], undefined, 10, true, tabId);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `markers`：指示标记外形对象数组
- `color`：_（可选）_ 指示标记颜色
- `lineWidth`：_（可选）_ 线宽
- `zoom`：_（可选）_ 是否定位并缩放
- `tabId`：_（可选）_ 标签页 ID，如若未传入，则为最后输入焦点的画布

- 返回值：Promise<boolean>

指示标记生成是否成功，`false` 表示画布不支持该操作或 `tabId` 不存在 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。
- 案例会优先使用当前活动标签页。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_EditorControl.generateIndicatorMarkers`。
