# DMT_EditorControl.zoomTo

## 这个 API 是干什么的

缩放到坐标

## 什么时候该用它

当你准备把 zoomTo 用在批量改图、重命名或清理脚本里时，先用这个案例确认前置条件和失败信号会更稳。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：manual

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_EditorControl_zoomTo_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先补齐环境再调试这个案例。'); }
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  const tabId = currentDocument?.tabId;
  const result = await eda.dmt_EditorControl.zoomTo(1200, 1200, undefined, tabId);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `x`：_（可选）_ 中心坐标 X，如若不传入则不改变当前 X 坐标
- `y`：_（可选）_ 中心坐标 Y，如若不传入则不改变当前 Y 坐标
- `scaleRatio`：_（可选）_ 缩放比，如若不传入则不改变当前缩放比，单位跨度为 `1/100` ，如若传入 `200` ，则表示缩放比为 `200%`
- `tabId`：_（可选）_ 标签页 ID，如若未传入，则为最后输入焦点的画布

- 返回值：Promise<{ left: number; right: number; top: number; bottom: number; } \| false>

缩放到的区域数据，`false` 表示画布不支持该缩放操作或 `tabId` 不存在 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。
- 案例会优先使用当前活动标签页。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_EditorControl.zoomTo`。
