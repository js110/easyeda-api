# LIB_PanelLibrary.copy

## 这个 API 是干什么的

复制面板库

## 什么时候该用它

当你想把 copy 放进自动化脚本、批处理或测试脚本时，可以先照着这个案例跑一遍，确认创建后的返回值和清理方式。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：mutating
- 清理策略：auto

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___LIB_PanelLibrary_copy_' + Date.now();
  const fixtureSlug = fixtureName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const panelLibraryCandidates = await eda.lib_PanelLibrary.search('A4');
  const panelLibraryItem = panelLibraryCandidates?.[0];
  const panelLibraryUuid = panelLibraryItem?.uuid;
  const panelLibraryLibraryUuid = panelLibraryItem?.libraryUuid;
  const created = await eda.lib_PanelLibrary.copy(panelLibraryUuid, panelLibraryLibraryUuid, 'targetLibraryUuid', undefined, undefined);
  const primitiveId = created?.getState_PrimitiveId?.() ?? created?.primitiveId ?? created?.id;
  if (primitiveId) {
    await eda.lib_PanelLibrary.delete([primitiveId]);
  }
  return {
    fixtureName,
    created,
    cleanupStrategy: 'auto',
  };
})(eda);
```

## 运行后预期结果

成功时会返回创建/修改后的对象摘要；如果案例支持自动清理，验证脚本会在同一次执行里完成清理。

## 参数与返回值怎么理解

- `panelLibraryUuid`：面板库 UUID
- `libraryUuid`：库 UUID，可以使用 LIB\_LibrariesList 内的接口获取
- `targetLibraryUuid`：目标库 UUID
- `targetClassification`：_（可选）_ 目标库内的分类
- `newPanelLibraryName`：_（可选）_ 新面板库名称，如若目标库内存在重名面板库将导致复制失败

- 返回值：Promise<string \| undefined>

目标库内新面板库的 UUID 

## 常见错误与排查


## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `LIB_PanelLibrary.copy`。
