# PCB_PrimitiveObject.create

## 这个 API 是干什么的

创建二进制内嵌对象

## 什么时候该用它

当你想把 create 放进自动化脚本、批处理或测试脚本时，可以先照着这个案例跑一遍，确认创建后的返回值和清理方式。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：PCB
- 自动验证模式：mutating
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___PCB_PrimitiveObject_create_' + Date.now();
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
  if (!primitiveId) { throw new Error('没有创建出可用于演示的测试图元。'); }
  try {
    return {
      fixtureName,
      created: createdPrimitive,
      cleanupStrategy: 'auto',
    };
  } finally {
    if (primitiveId) { await eda.pcb_PrimitiveObject.delete([primitiveId]); }
  }
})(eda);
```

## 运行后预期结果

成功时会返回创建/修改后的对象摘要；如果案例支持自动清理，验证脚本会在同一次执行里完成清理。

## 参数与返回值怎么理解

- `layer`：层
- `topLeftX`：左上点 X
- `topLeftY`：左上点 Y
- `binaryData`：二进制数据
- `width`：宽
- `height`：高
- `rotation`：_（可选）_ 旋转角度
- `mirror`：_（可选）_ 是否水平镜像
- `fileName`：_（可选）_ 文件名
- `primitiveLock`：_（可选）_ 是否锁定

- 返回值：Promise<[IPCB\_PrimitiveObject](./IPCB_PrimitiveObject.md) \| undefined>

- 二进制内嵌对象图元对象 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，通常是当前停留在主页、原理图或 3D 预览，而不是 PCB。
- PCB 坐标单位是 1mil，写创建/修改案例时不要误用原理图的 0.01inch。

## 生成器补充说明

- 创建案例会复用一套已验证可运行的夹具参数，确保开发者拿到的示例能直接在 EasyEDA 里跑通。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `PCB_PrimitiveObject.create`。
