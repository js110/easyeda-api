# LIB_Cbb.copy

## 这个 API 是干什么的

复制复用模块

## 什么时候该用它

当你想把 copy 放进自动化脚本、批处理或测试脚本时，可以先照着这个案例跑一遍，确认创建后的返回值和清理方式。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Cbb_copy_' + Date.now();
  const fixtureSlug = fixtureName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const libraries = await eda.lib_LibrariesList.getAllLibrariesList();
  const libraryUuid = libraries?.[0]?.uuid;
  const created = await eda.lib_Cbb.copy('cbbUuid', libraryUuid, 'targetLibraryUuid', undefined, undefined);
  const primitiveId = created?.getState_PrimitiveId?.() ?? created?.primitiveId ?? created?.id;
  if (primitiveId) {
    await eda.lib_Cbb.delete([primitiveId]);
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

- `cbbUuid`：复用模块 UUID
- `libraryUuid`：库 UUID，可以使用 LIB\_LibrariesList 内的接口获取
- `targetLibraryUuid`：目标库 UUID
- `targetClassification`：_（可选）_ 目标库内的分类
- `newCbbName`：_（可选）_ 新复用模块名称，如若目标库内存在重名复用模块将导致复制失败

- 返回值：Promise<string \| undefined>

目标库内新复用模块的 UUID 

## 常见错误与排查

- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 当前工作区不一定能搜索到可用的复用模块样本，运行前请先替换成真实 cbbUuid。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Cbb.copy`。
