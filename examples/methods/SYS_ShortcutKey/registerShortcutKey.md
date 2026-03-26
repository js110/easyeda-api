# SYS_ShortcutKey.registerShortcutKey

## 这个 API 是干什么的

注册快捷键

## 什么时候该用它

当你希望给扩展加提示、窗口交互或即时反馈时，这个案例可以直接复用。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：manual
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SYS_ShortcutKey_registerShortcutKey_' + Date.now();
  const result = await eda.sys_ShortcutKey.registerShortcutKey(['CONTROL', 'SHIFT', 'G'], 'title', async (shortcutKey) => { await eda.sys_Message.showToastMessage('Shortcut fired: ' + shortcutKey.join('+')); }, [ESYS_ShortcutKeyEffectiveEditorDocumentType.PCB], [ESYS_ShortcutKeyEffectiveEditorScene.SELECT_CANVAS]);
  return { fixtureName, result };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `shortcutKey`：快捷键，数组中包含多个元素则解析为组合快捷键，将按规则排序后存入缓存
- `title`：快捷键标题，快捷键的友好名称
- `callbackFn`：回调函数
- `documentType`：_(Optional)_
- `scene`：_(Optional)_

- 返回值：Promise<boolean>

注册操作是否成功 

## 常见错误与排查

- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 生成器补充说明

- 快捷键案例默认使用 Ctrl+Shift+G 这一组按键，便于开发者直接替换成自己的组合。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_ShortcutKey.registerShortcutKey`。
