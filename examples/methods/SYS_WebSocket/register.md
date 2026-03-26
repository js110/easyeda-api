# SYS_WebSocket.register

## 这个 API 是干什么的

注册 WebSocket 连接

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
  const fixtureName = '__codex_example___SYS_WebSocket_register_' + Date.now();
  const result = await eda.sys_WebSocket.register('id', 'serviceUri', undefined, undefined, undefined);
  return { fixtureName, result };
})(eda);
```

## 运行后预期结果

当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。

## 参数与返回值怎么理解

- `id`：自定义 WebSocket ID
- `serviceUri`：WebSocket 服务地址
- `receiveMessageCallFn`：_（可选）_ 接收到消息时的回调函数
- `connectedCallFn`：_（可选）_ 连接建立时的回调函数
- `protocols`：_（可选）_ 子协议

- 返回值：void 

## 常见错误与排查

- 这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_WebSocket.register`。
