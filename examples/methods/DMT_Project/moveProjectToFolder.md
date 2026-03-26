# DMT_Project.moveProjectToFolder

## 这个 API 是干什么的

移动工程到文件夹

## 什么时候该用它

当你准备把 moveProjectToFolder 用在批量改图、重命名或清理脚本里时，先用这个案例确认前置条件和失败信号会更稳。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：manual

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_Project_moveProjectToFolder_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先补齐环境再调试这个案例。'); }
  const projectUuid = currentProject?.uuid;
  const teams = await eda.dmt_Team.getAllTeamsInfo();
  const teamUuid = teams?.[0]?.uuid;
  if (!teamUuid) { throw new Error('当前账号下没有可用团队，无法解析 folderUuid。'); }
  const folderCandidates = await eda.dmt_Folder.getAllFoldersUuid(teamUuid);
  const folderUuid = folderCandidates?.[0];
  const result = await eda.dmt_Project.moveProjectToFolder(projectUuid, folderUuid);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `projectUuid`：工程 UUID
- `folderUuid`：_（可选）_ 文件夹 UUID，只能为当前工程所在团队或个人下的文件夹，如若为 `undefined` 则移动到当前团队的根文件夹

- 返回值：Promise<boolean>

是否移动成功 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。
- 案例优先使用当前打开工程的 UUID。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_Project.moveProjectToFolder`。
