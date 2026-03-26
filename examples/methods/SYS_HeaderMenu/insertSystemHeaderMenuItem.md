# SYS_HeaderMenu.insertSystemHeaderMenuItem

## 这个 API 是干什么的

在指定位置插入系统顶部菜单项

## 什么时候该用它

当你需要理解 SYS_HeaderMenu.insertSystemHeaderMenuItem 的调用方式、返回值和使用边界时，这个案例可以作为起点。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SYS_HeaderMenu_insertSystemHeaderMenuItem_' + Date.now();
  const result = await eda.sys_HeaderMenu.insertSystemHeaderMenuItem(undefined, 'id', false);
  return { fixtureName, result, needsReview: true };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `env`：环境
- `id`：菜单项 ID 树，将会按照数组顺序按层级匹配菜单项，并将数组最后一位作为插入的菜单项的 ID
- `props`：其它参数

- 返回值：Promise<string \| undefined>

顶部菜单项的 ID 数组，分隔线是否插入并不会影响操作结果的返回值 

## 常见错误与排查

- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。
- 这个参数是枚举类型 ESYS_HeaderMenuEnvironment，生成器先给出最保守的占位值，使用前建议结合对应枚举文档细化。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_HeaderMenu.insertSystemHeaderMenuItem`。
