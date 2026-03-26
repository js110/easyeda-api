# SYS_FileSystem.getDocumentsPath

## 这个 API 是干什么的

获取文档目录路径

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getDocumentsPath 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SYS_FileSystem_getDocumentsPath_' + Date.now();
  const result = await eda.sys_FileSystem.getDocumentsPath();
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- 无参数。

- 返回值：Promise<string>

文档目录路径 

## 常见错误与排查

- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_FileSystem.getDocumentsPath`。
