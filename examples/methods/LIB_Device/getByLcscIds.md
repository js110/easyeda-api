# LIB_Device.getByLcscIds

## 这个 API 是干什么的

使用立创 C 编号获取器件

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getByLcscIds 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Device_getByLcscIds_' + Date.now();
  const result = await eda.lib_Device.getByLcscIds(['C5290014'], undefined, false);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `lcscIds`：立创 C 编号
- `libraryUuid`：_（可选）_ 库 UUID，默认为系统库，可以使用 LIB\_LibrariesList 内的接口获取
- `allowMultiMatch`：_（可选）_ 是否允许单个立创 C 编号匹配多个结果

- 返回值：Promise<T extends true ? [ILIB\_DeviceSearchItem](../interfaces/ILIB_DeviceSearchItem.md) \| undefined : Array<[ILIB\_DeviceSearchItem](../interfaces/ILIB_DeviceSearchItem.md) >>

搜索到的器件属性 

## 常见错误与排查


## 生成器补充说明

- LCSC 编号案例默认使用一个真实编号样本，便于你直接替换成自己的料号。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Device.getByLcscIds`。
