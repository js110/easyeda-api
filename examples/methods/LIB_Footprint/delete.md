# LIB_Footprint.delete

## 这个 API 是干什么的

删除封装

## 什么时候该用它

当你准备把 delete 用在批量改图、重命名或清理脚本里时，先用这个案例确认前置条件和失败信号会更稳。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：mutating
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_Footprint_delete_' + Date.now();
  const footprintCandidates = await eda.lib_Footprint.search('STM32');
  const footprintItem = footprintCandidates?.[0];
  const footprintUuid = footprintItem?.uuid;
  const footprintLibraryUuid = footprintItem?.libraryUuid;
  const result = await eda.lib_Footprint.delete(footprintUuid, footprintLibraryUuid);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

成功时会返回创建/修改后的对象摘要；如果案例支持自动清理，验证脚本会在同一次执行里完成清理。

## 参数与返回值怎么理解

- `footprintUuid`：封装 UUID
- `libraryUuid`：库 UUID，可以使用 LIB\_LibrariesList 内的接口获取

- 返回值：Promise<boolean>

操作是否成功 

## 常见错误与排查


## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_Footprint.delete`。
