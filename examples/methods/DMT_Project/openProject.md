# DMT_Project.openProject

## 这个 API 是干什么的

打开工程

## 什么时候该用它

当你希望给扩展加提示、窗口交互或即时反馈时，这个案例可以直接复用。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___DMT_Project_openProject_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  const projectUuid = currentProject?.uuid;
  const result = await eda.dmt_Project.openProject(projectUuid);
  return { fixtureName, result };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `projectUuid`：工程 UUID

- 返回值：Promise<boolean>

是否成功打开工程 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 案例优先使用当前打开工程的 UUID。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `DMT_Project.openProject`。
