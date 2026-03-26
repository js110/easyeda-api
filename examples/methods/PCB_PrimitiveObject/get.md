# PCB_PrimitiveObject.get

## 这个 API 是干什么的

获取二进制内嵌对象

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 get 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：PCB
- 自动验证模式：safe
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___PCB_PrimitiveObject_get_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先打开一个工程再运行这个案例。'); }
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (!currentDocument) {
    throw new Error('当前没有活动文档，先打开一个可操作的文档页。');
  }
  if (currentDocument.documentType !== 3) {
    throw new Error('当前文档类型不是 PCB，请先切到 PCB 再运行这个案例。');
  }
  const fixtureBinaryData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pF7sAAAAASUVORK5CYII=';
  const createdPrimitive = await eda.pcb_PrimitiveObject.create(
    3,
    1200,
    1200,
    fixtureBinaryData,
    100,
    100,
    0,
    false,
    'codex-dot.png',
    false,
  );
  const primitiveId = createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id;
  if (!primitiveId) { throw new Error('没有创建出可用于查询的测试图元。'); }
  try {
    const result = await eda.pcb_PrimitiveObject.get(primitiveId);
    return {
      fixtureName,
      currentProject: currentProject?.friendlyName ?? currentProject?.name ?? currentProject?.uuid ?? null,
      currentDocumentType: currentDocument?.documentType ?? null,
      result,
      cleanupStrategy: 'auto',
    };
  } finally {
    if (primitiveId) { await eda.pcb_PrimitiveObject.delete([primitiveId]); }
  }
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `primitiveIds`：二进制内嵌对象的图元 ID，可以为字符串或字符串数组，如若为数组，则返回的也是数组

- 返回值：Promise<[IPCB\_PrimitiveObject](./IPCB_PrimitiveObject.md) \| undefined>

二进制内嵌对象图元对象，`undefined` 表示获取失败 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，通常是当前停留在主页、原理图或 3D 预览，而不是 PCB。
- PCB 坐标单位是 1mil，写创建/修改案例时不要误用原理图的 0.01inch。

## 生成器补充说明

- 这个查询案例会先临时创建一个图元夹具，读取完成后再自动清理，避免依赖当前工程里预先存在的对象。
- 案例会先从当前文档里取一个真实图元 ID，再调用目标接口，方便你理解这类读取 API 的入参来源。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `PCB_PrimitiveObject.get`。
