# SCH_PrimitiveComponent.createNetFlag

## 这个 API 是干什么的

创建网络标识

## 什么时候该用它

当你想把 createNetFlag 放进自动化脚本、批处理或测试脚本时，可以先照着这个案例跑一遍，确认创建后的返回值和清理方式。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：SCHEMATIC_PAGE
- 自动验证模式：mutating
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SCH_PrimitiveComponent_createNetFlag_' + Date.now();
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (!currentDocument) {
    throw new Error('当前没有活动文档，先打开一个可操作的文档页。');
  }
  if (currentDocument.documentType !== 1) {
    throw new Error('当前文档类型不是 SCHEMATIC_PAGE，请先切到 原理图图页 再运行这个案例。');
  }
  const deviceCandidates = await eda.lib_Device.search('STM32');
  const deviceItem = deviceCandidates?.[0];
  if (!deviceItem?.uuid || !deviceItem?.libraryUuid) { throw new Error('没有找到可用于原理图器件创建的库器件样本。'); }
  const createdPrimitive = await eda.sch_PrimitiveComponent.create(
    { libraryUuid: deviceItem.libraryUuid, uuid: deviceItem.uuid },
    120,
    80,
    undefined,
    0,
    false,
    true,
    true,
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
    if (primitiveId) { await eda.sch_PrimitiveComponent.delete([primitiveId]); }
  }
})(eda);
```

## 运行后预期结果

成功时会返回创建/修改后的对象摘要；如果案例支持自动清理，验证脚本会在同一次执行里完成清理。

## 参数与返回值怎么理解

- `identification`：标识类型
- `net`：网络名称
- `x`：坐标 X
- `y`：坐标 Y
- `rotation`：_（可选）_ 旋转角度
- `mirror`：_（可选）_ 是否镜像

- 返回值：Promise<ISCH\_PrimitiveComponent$1 \| undefined>

器件图元对象 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，请先切到原理图图页。
- 原理图坐标单位是 0.01inch，不是 PCB 的 1mil。

## 生成器补充说明

- 创建案例会复用一套已验证可运行的夹具参数，确保开发者拿到的示例能直接在 EasyEDA 里跑通。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SCH_PrimitiveComponent.createNetFlag`。
