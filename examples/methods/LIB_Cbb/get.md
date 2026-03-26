# LIB_Cbb.get

## 这个 API 是干什么的

获取复用模块的所有属性

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 get 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Cbb_get_' + Date.now();
  const libraries = await eda.lib_LibrariesList.getAllLibrariesList();
  const libraryUuid = libraries?.[0]?.uuid;
  const result = await eda.lib_Cbb.get('cbbUuid', libraryUuid);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `cbbUuid`：复用模块 UUID
- `libraryUuid`：_（可选）_ 库 UUID，可以使用 LIB\_LibrariesList 内的接口获取

- 返回值：Promise<[ILIB\_CbbItem](../interfaces/ILIB_CbbItem.md) \| undefined>

复用模块属性 

## 常见错误与排查


## 生成器补充说明

- 当前工作区不一定能搜索到可用的复用模块样本，运行前请先替换成真实 cbbUuid。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Cbb.get`。
