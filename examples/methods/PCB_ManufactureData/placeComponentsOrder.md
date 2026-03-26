# PCB_ManufactureData.placeComponentsOrder

## 这个 API 是干什么的

元件下单

## 什么时候该用它

当你需要理解 PCB_ManufactureData.placeComponentsOrder 的调用方式、返回值和使用边界时，这个案例可以作为起点。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：PCB
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___PCB_ManufactureData_placeComponentsOrder_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先补齐环境再调试这个案例。'); }
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (!currentDocument) {
    throw new Error('当前没有活动文档，先打开一个可操作的文档页。');
  }
  if (currentDocument.documentType !== 3) {
    throw new Error('当前文档类型不是 PCB，请先切到 PCB 再运行这个案例。');
  }
  const result = await eda.pcb_ManufactureData.placeComponentsOrder(undefined, undefined);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `interactive`：_（可选）_ 是否启用交互式检查

如若启用，则会存在弹窗等待用户进行交互，且无法使用 `ignoreWarning` 参数忽略警告， 即 `ignoreWarning` 参数将被忽略；

如若禁用，则在调用后不会有任何 EDA 内部弹窗，程序执行静默检查， 如若达成下单条件，将返回 `true` 并在新标签页打开下单页面
- `ignoreWarning`：_（可选）_ 在非交互式检查时忽略警告

如果设置为 `true` ，将会忽略所有检查警告项并尽可能生成下单资料；

如果设置为 `false` ，存在任意警告将中断执行并返回 `false` 的结果

- 返回值：Promise<boolean>

是否通过下单检查 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，通常是当前停留在主页、原理图或 3D 预览，而不是 PCB。
- PCB 坐标单位是 1mil，写创建/修改案例时不要误用原理图的 0.01inch。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `PCB_ManufactureData.placeComponentsOrder`。
