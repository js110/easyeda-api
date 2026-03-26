# DMT_Project.getAllProjectsUuid

## 这个 API 是干什么的

获取所有工程的 UUID

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getAllProjectsUuid 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_Project_getAllProjectsUuid_' + Date.now();
  const teams = await eda.dmt_Team.getAllTeamsInfo();
  const teamUuid = teams?.[0]?.uuid;
  if (!teamUuid) { throw new Error('当前账号下没有可用团队，无法解析 folderUuid。'); }
  const folderCandidates = await eda.dmt_Folder.getAllFoldersUuid(teamUuid);
  const folderUuid = folderCandidates?.[0];
  const workspaces = await eda.dmt_Workspace.getAllWorkspacesInfo();
  const workspaceUuid = workspaces?.[0]?.uuid;
  const result = await eda.dmt_Project.getAllProjectsUuid(teamUuid, folderUuid, workspaceUuid);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `teamUuid`：_（可选）_ 团队 UUID
- `folderUuid`：_（可选）_ 文件夹 UUID，如若不指定，则默认为团队的根文件夹
- `workspaceUuid`：_（可选）_ 工作区 UUID

- 返回值：Promise<Array<string>>

工程 UUID 数组 

## 常见错误与排查


## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_Project.getAllProjectsUuid`。
