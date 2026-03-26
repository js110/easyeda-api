# SYS_FileManager.getDeviceFileByDeviceUuid

## 这个 API 是干什么的

使用器件 UUID 获取器件文件

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getDeviceFileByDeviceUuid 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：不强制
- 是否需要活动文档：不强制
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___SYS_FileManager_getDeviceFileByDeviceUuid_' + Date.now();
  const deviceCandidates = await eda.lib_Device.search('STM32');
  const deviceItem = deviceCandidates?.[0];
  const deviceUuid = deviceItem?.uuid;
  const deviceLibraryUuid = deviceItem?.libraryUuid;
  const libraries = await eda.lib_LibrariesList.getAllLibrariesList();
  const libraryUuid = libraries?.[0]?.uuid;
  const result = await eda.sys_FileManager.getDeviceFileByDeviceUuid(deviceUuid, libraryUuid, undefined);
  return {
    fixtureName,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `deviceUuid`：器件 UUID 或器件 UUID 列表
- `libraryUuid`：_（可选）_ 库 UUID，可以使用 LIB\_LibrariesList 内的接口获取，如若不传入，则为系统库
- `fileType`：_(Optional)_

- 返回值：Promise<File \| undefined>

器件文件数据，`undefined` 表示数据获取失败 

## 常见错误与排查


## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `SYS_FileManager.getDeviceFileByDeviceUuid`。
