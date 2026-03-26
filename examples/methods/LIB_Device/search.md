# LIB_Device.search

## 这个 API 是干什么的

搜索器件

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 search 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Device_search_' + Date.now();
  const deviceCandidates = await eda.lib_Device.search('STM32');
  const deviceItem = deviceCandidates?.[0];
  const deviceUuid = deviceItem?.uuid;
  const deviceLibraryUuid = deviceItem?.libraryUuid;
  const result = await eda.lib_Device.search('key', deviceLibraryUuid, undefined, undefined, undefined, undefined);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `key`：搜索关键字
- `libraryUuid`：_（可选）_ 库 UUID，默认为系统库，可以使用 LIB\_LibrariesList 内的接口获取
- `classification`：_（可选）_ 分类，默认为全部
- `symbolType`：_（可选）_ 符号类型，默认为全部
- `itemsOfPage`：_（可选）_ 一页搜索结果的数量
- `page`：_（可选）_ 页数

- 返回值：Promise<Array<[ILIB\_DeviceSearchItem](../interfaces/ILIB_DeviceSearchItem.md) >>

搜索到的器件属性的列表 

## 常见错误与排查


## 生成器补充说明

- 这个参数是枚举类型 ELIB_SymbolType，生成器先给出最保守的占位值，使用前建议结合对应枚举文档细化。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Device.search`。
