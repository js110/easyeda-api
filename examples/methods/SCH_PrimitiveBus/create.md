# SCH_PrimitiveBus.create

## 这个 API 是干什么的

创建总线

## 什么时候该用它

当你想把 create 放进自动化脚本、批处理或测试脚本时，可以先照着这个案例跑一遍，确认创建后的返回值和清理方式。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：SCHEMATIC_PAGE
- 自动验证模式：manual
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SCH_PrimitiveBus_create_' + Date.now();
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (!currentDocument) {
    throw new Error('当前没有活动文档，先打开一个可操作的文档页。');
  }
  if (currentDocument.documentType !== 1) {
    throw new Error('当前文档类型不是 SCHEMATIC_PAGE，请先切到 原理图图页 再运行这个案例。');
  }
  const createdPrimitive = await eda.sch_PrimitiveBus.create(
    'BUS0',
    [120, 80, 200, 80, 200, 80],
  );
  const primitiveId = createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id;
  if (!primitiveId) { throw new Error('没有创建出可用于演示的测试图元。'); }
  try {
    return {
      fixtureName,
      created: createdPrimitive,
      cleanupStrategy: 'auto',
    };
  } finally {
    if (primitiveId) { await eda.sch_PrimitiveBus.delete([primitiveId]); }
  }
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `busName`：总线名称
- `line`：多段线坐标组，每段都是连续的一组 `[x1, y1, x2, y2, x3, y3]` 所描述的线，如若多段线彼此无任何连接则创建将会失败
- `color`：_（可选）_ 总线颜色，`null` 表示默认
- `lineWidth`：_（可选）_ 线宽，范围 `1-10` ，`null` 表示默认
- `lineType`：_（可选）_ 线型，`null` 表示默认

- 返回值：Promise<[ISCH\_PrimitiveBus](./ISCH_PrimitiveBus.md) \| undefined>

总线图元对象 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，请先切到原理图图页。
- 原理图坐标单位是 0.01inch，不是 PCB 的 1mil。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 创建案例会复用一套已验证可运行的夹具参数，确保开发者拿到的示例能直接在 EasyEDA 里跑通。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SCH_PrimitiveBus.create`。
