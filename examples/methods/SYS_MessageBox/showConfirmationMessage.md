# SYS_MessageBox.showConfirmationMessage

## 这个 API 是干什么的

显示确认框

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
  const fixtureName = '__codex_example___SYS_MessageBox_showConfirmationMessage_' + Date.now();
  const result = await eda.sys_MessageBox.showConfirmationMessage('content', undefined, undefined, 'Codex example running inside EasyEDA', async (shortcutKey) => { await eda.sys_Message.showToastMessage('Shortcut fired: ' + shortcutKey.join('+')); });
  return { fixtureName, result };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `content`：消息文本，支持使用 `\n` 换行
- `title`：_（可选）_ 确认框标题
- `mainButtonTitle`：_（可选）_ 主要按钮标题
- `buttonTitle`：_（可选）_ 主要按钮标题
- `callbackFn`：_（可选）_ 回调函数，如需调用扩展内的函数，请在函数名前加上扩展的唯一 ID，以西文句号 `.` 分隔

- 返回值：void 

## 常见错误与排查


## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_MessageBox.showConfirmationMessage`。
