# IPCB_PrimitiveString.isAsync

## 这个 API 是干什么的

查询图元是否为异步图元

## 什么时候该用它

当你需要理解 IPCB_PrimitiveString.isAsync 的调用方式、返回值和使用边界时，这个案例可以作为起点。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：PCB
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___IPCB_PrimitiveString_isAsync_' + Date.now();
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (!currentDocument) {
    throw new Error('当前没有活动文档，先打开一个可操作的文档页。');
  }
  if (currentDocument.documentType !== 3) {
    throw new Error('当前文档类型不是 PCB，请先切到 PCB 再运行这个案例。');
  }
  const selectedPrimitiveIds = eda.pcb_SelectControl.getAllSelectedPrimitives_PrimitiveId();
  const primitiveId = Array.isArray(selectedPrimitiveIds) ? selectedPrimitiveIds[0] : undefined;
  if (!primitiveId) {
    throw new Error('请先在PCB画布上选中一个与 IPCB_PrimitiveString 匹配的图元，再运行这个案例。');
  }
  const fetched = await eda.pcb_PrimitiveString.get([primitiveId]);
  const primitive = Array.isArray(fetched) ? fetched[0] : fetched;
  if (!primitive) { throw new Error('没有取到目标图元对象。'); }
  const result = await primitive.isAsync();
  return { fixtureName, primitiveId, result };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- 无参数。

- 返回值：boolean

是否为异步图元 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，通常是当前停留在主页、原理图或 3D 预览，而不是 PCB。
- PCB 坐标单位是 1mil，写创建/修改案例时不要误用原理图的 0.01inch。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这类接口实例通常来自当前选中的图元对象，因此自动验证默认走 manual 模式。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `IPCB_PrimitiveString.isAsync`。
