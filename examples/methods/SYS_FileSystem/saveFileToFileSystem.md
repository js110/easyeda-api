# SYS_FileSystem.saveFileToFileSystem

## 这个 API 是干什么的

向文件系统写入文件

## 什么时候该用它

当你需要理解 SYS_FileSystem.saveFileToFileSystem 的调用方式、返回值和使用边界时，这个案例可以作为起点。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SYS_FileSystem_saveFileToFileSystem_' + Date.now();
  const result = await eda.sys_FileSystem.saveFileToFileSystem('uri', undefined, undefined, undefined);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `uri`：文件资源定位符

如若结尾为斜杠 `/` （Windows 为反斜杠 `\` ），则识别为文件夹；

如若结尾非斜杠，则识别为完整文件名，此时 `fileName` 参数将被忽略
- `fileData`：文件数据
- `fileName`：_（可选）_ 文件名称
- `force`：_（可选）_ 强制写入（文件存在则覆盖文件）

- 返回值：Promise<boolean>

写入操作是否成功，如若不允许覆盖但文件已存在将返回 `false` 的结果 

## 常见错误与排查

- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_FileSystem.saveFileToFileSystem`。
