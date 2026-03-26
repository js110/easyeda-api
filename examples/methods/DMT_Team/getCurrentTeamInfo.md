# DMT_Team.getCurrentTeamInfo

## 这个 API 是干什么的

获取当前团队的详细属性

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getCurrentTeamInfo 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_Team_getCurrentTeamInfo_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  let result;
  let apiError = null;
  try {
    result = await eda.dmt_Team.getCurrentTeamInfo();
  } catch (error) {
    apiError = error?.message ?? String(error);
  }
  const allTeams = await eda.dmt_Team.getAllTeamsInfo();
  return {
    fixtureName,
    currentProject: currentProject?.friendlyName ?? currentProject?.name ?? currentProject?.uuid ?? null,
    result,
    apiError,
    fallbackTeam: allTeams?.[0] ?? null,
    fallbackTeamCount: Array.isArray(allTeams) ? allTeams.length : null,
    explanation: result ? '已获取到当前焦点工程关联的团队信息。' : '当前没有可判定的焦点团队时，案例会额外返回团队列表中的第一个团队作为理解返回结构的参考。',
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- 无参数。

- 返回值：Promise<[IDMT\_TeamItem](../interfaces/IDMT_TeamItem.md) \| undefined>

团队的详细属性，如若为 `undefined` 则获取失败 

## 常见错误与排查


## 生成器补充说明

- 如果当前焦点不在某个工程文档上，`getCurrentTeamInfo()` 可能返回空或直接抛错，所以案例额外补了 `getAllTeamsInfo()` 作为兜底参考。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_Team.getCurrentTeamInfo`。
