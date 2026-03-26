# SCH_PrimitivePin.create

## 这个 API 是干什么的

创建引脚

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
  const fixtureName = '__codex_example___SCH_PrimitivePin_create_' + Date.now();
  const fixtureSlug = fixtureName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const created = await eda.sch_PrimitivePin.create(120, 80, 'pinNumber', undefined, 0, undefined, undefined, undefined, undefined);
  const primitiveId = created?.getState_PrimitiveId?.() ?? created?.primitiveId ?? created?.id;
  if (primitiveId) {
    await eda.sch_PrimitivePin.delete([primitiveId]);
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

- `x`：坐标 X
- `y`：坐标 Y
- `pinNumber`：引脚编号
- `pinName`：_（可选）_ 引脚名称
- `rotation`：_（可选）_ 旋转角度，可选 `0` `90` `180` `270`
- `pinLength`：_（可选）_ 引脚长度
- `pinColor`：_（可选）_ 引脚颜色，`null` 表示默认
- `pinShape`：_（可选）_ 引脚形状
- `pinType`：_（可选）_ 引脚类型

- 返回值：Promise<[ISCH\_PrimitivePin](./ISCH_PrimitivePin.md) \| undefined>

引脚图元对象 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，请先切到原理图图页。
- 原理图坐标单位是 0.01inch，不是 PCB 的 1mil。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个参数是枚举类型 ESCH_PrimitivePinShape，生成器先给出最保守的占位值，使用前建议结合对应枚举文档细化。
- 这个参数是枚举类型 ESCH_PrimitivePinType，生成器先给出最保守的占位值，使用前建议结合对应枚举文档细化。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SCH_PrimitivePin.create`。
