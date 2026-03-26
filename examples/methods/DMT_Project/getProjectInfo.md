# DMT_Project.getProjectInfo

## 这个 API 是干什么的

获取工程属性

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getProjectInfo 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_Project_getProjectInfo_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  const projectUuid = currentProject?.uuid;
  const result = await eda.dmt_Project.getProjectInfo(projectUuid);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `projectUuid`：工程 UUID

- 返回值：Promise<[IDMT\_BriefProjectItem](../interfaces/IDMT_BriefProjectItem.md) \| undefined>

简略的工程属性，如若为 `undefined` 则获取失败 

## 常见错误与排查


## 生成器补充说明

- 案例优先使用当前打开工程的 UUID。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_Project.getProjectInfo`。
