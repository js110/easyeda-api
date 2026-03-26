# SYS_Dialog.showSelectDialog

## 这个 API 是干什么的

弹出选择窗口

## 什么时候该用它

当你希望给扩展加提示、窗口交互或即时反馈时，这个案例可以直接复用。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SYS_Dialog_showSelectDialog_' + Date.now();
  const result = await eda.sys_Dialog.showSelectDialog('options', undefined, undefined, undefined, undefined, undefined, async (shortcutKey) => { await eda.sys_Message.showToastMessage('Shortcut fired: ' + shortcutKey.join('+')); });
  return { fixtureName, result };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `options`：选项列表，可以为字符串数组或对象数组，在未指定 `defaultOption` 时，默认值为列表的第一项；

如若为字符串数组，则选项的值和选项的展示内容将保持一致；

如若为对象数组，则 `value` 表示选项的值，`displayContent` 表示选项的展示内容
- `beforeContent`：_（可选）_ 选择框上方文字
- `afterContent`：_（可选）_ 选择框下方文字
- `title`：_（可选）_ 选择框标题
- `defaultOption`：_（可选）_ 默认选项，以选项的值作为匹配参数，如若 `multiple` 参数为 `true` ，则此处需要传入字符串数组
- `multiple`：_（可选）_ 是否支持多选，默认为单选框
- `callbackFn`：_（可选）_ 回调函数

- 返回值：void

用户选择的值，对应传入的 `options` 中的 `value` 字段 

## 常见错误与排查


## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_Dialog.showSelectDialog`。
