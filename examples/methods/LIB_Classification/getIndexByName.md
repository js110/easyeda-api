# LIB_Classification.getIndexByName

## 这个 API 是干什么的

获取指定名称的分类的分类索引

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getIndexByName 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Classification_getIndexByName_' + Date.now();
  const libraries = await eda.lib_LibrariesList.getAllLibrariesList();
  const libraryUuid = libraries?.[0]?.uuid;
  const result = await eda.lib_Classification.getIndexByName(libraryUuid, undefined, 'primaryClassificationName', undefined);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `libraryUuid`：库 UUID
- `libraryType`：库类型
- `primaryClassificationName`：一级分类名称
- `secondaryClassificationName`：_（可选）_ 二级分类名称

- 返回值：Promise<[ILIB\_ClassificationIndex](../interfaces/ILIB_ClassificationIndex.md) \| undefined>

分类索引 

## 常见错误与排查


## 生成器补充说明

- 这个参数是枚举类型 ELIB_LibraryType，生成器先给出最保守的占位值，使用前建议结合对应枚举文档细化。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Classification.getIndexByName`。
