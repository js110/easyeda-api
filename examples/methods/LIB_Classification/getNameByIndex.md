# LIB_Classification.getNameByIndex

## 这个 API 是干什么的

获取指定索引的分类的名称

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getNameByIndex 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Classification_getNameByIndex_' + Date.now();
  const footprintCandidates = await eda.lib_Footprint.search('STM32');
  const footprintItem = footprintCandidates?.[0];
  const footprintUuid = footprintItem?.uuid;
  const footprintLibraryUuid = footprintItem?.libraryUuid;
  const classificationIndex = footprintItem?.classification;
  const result = await eda.lib_Classification.getNameByIndex(classificationIndex);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `classificationIndex`：分类索引

- 返回值：Promise<{ primaryClassificationName: string; secondaryClassificationName?: string \| undefined; } \| undefined>

两级分类的名称 

## 常见错误与排查


## 生成器补充说明

- 分类索引案例会先从一个真实搜索结果里提取 classification 字段，再调用目标 API。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Classification.getNameByIndex`。
