# LIB_Classification.deleteByIndex

## 这个 API 是干什么的

删除指定索引的分类

## 什么时候该用它

当你准备把 deleteByIndex 用在批量改图、重命名或清理脚本里时，先用这个案例确认前置条件和失败信号会更稳。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：manual

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Classification_deleteByIndex_' + Date.now();
  const footprintCandidates = await eda.lib_Footprint.search('STM32');
  const footprintItem = footprintCandidates?.[0];
  const footprintUuid = footprintItem?.uuid;
  const footprintLibraryUuid = footprintItem?.libraryUuid;
  const classificationIndex = footprintItem?.classification;
  const result = await eda.lib_Classification.deleteByIndex(classificationIndex);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `classificationIndex`：分类索引

- 返回值：Promise<boolean>

操作是否成功 

## 常见错误与排查

- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。
- 分类索引案例会先从一个真实搜索结果里提取 classification 字段，再调用目标 API。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Classification.deleteByIndex`。
