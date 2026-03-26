# SCH_PrimitivePolygon.modify

## 这个 API 是干什么的

修改多边形

## 什么时候该用它

当你准备把 modify 用在批量改图、重命名或清理脚本里时，先用这个案例确认前置条件和失败信号会更稳。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：SCHEMATIC_PAGE
- 自动验证模式：mutating
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SCH_PrimitivePolygon_modify_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先补齐环境再调试这个案例。'); }
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (!currentDocument) {
    throw new Error('当前没有活动文档，先打开一个可操作的文档页。');
  }
  if (currentDocument.documentType !== 1) {
    throw new Error('当前文档类型不是 SCHEMATIC_PAGE，请先切到 原理图图页 再运行这个案例。');
  }
  const createdPrimitive = await eda.sch_PrimitivePolygon.create(
    [120, 80, 200, 80, 200, 80],
  );
  const primitiveId = createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id;
  if (!primitiveId) { throw new Error('没有创建出可用于修改的测试图元。'); }
  const property = {
    line: [120, 80, 200, 110, 240, 120],
  };
  try {
    const before = await eda.sch_PrimitivePolygon.get(primitiveId);
    const result = await eda.sch_PrimitivePolygon.modify(primitiveId, property);
    const after = await eda.sch_PrimitivePolygon.get(primitiveId);
    return {
      fixtureName,
      primitiveId,
      property,
      before,
      result,
      after,
      cleanupStrategy: 'auto',
    };
  } finally {
    if (primitiveId) { await eda.sch_PrimitivePolygon.delete([primitiveId]); }
  }
})(eda);
```

## 运行后预期结果

成功时会返回创建/修改后的对象摘要；如果案例支持自动清理，验证脚本会在同一次执行里完成清理。

## 参数与返回值怎么理解

- `primitiveId`：图元 ID
- `property`：修改参数

- 返回值：Promise<[ISCH\_PrimitivePolygon](./ISCH_PrimitivePolygon.md) \| undefined>

多边形图元对象 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，请先切到原理图图页。
- 原理图坐标单位是 0.01inch，不是 PCB 的 1mil。

## 生成器补充说明

- 修改案例会先创建一个临时图元，再构造一个最小但真实的 property 对象执行 modify，最后自动清理。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SCH_PrimitivePolygon.modify`。
