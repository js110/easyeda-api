# PCB_ManufactureData.getBomFile

## 这个 API 是干什么的

获取 BOM 文件

## 什么时候该用它

当你需要在写扩展前先摸清当前上下文，或者需要把 getBomFile 的返回值组织成后续逻辑时，这个案例最有参考价值。

## 运行前需要什么上下文

- 是否需要已打开工程：需要
- 是否需要活动文档：PCB
- 自动验证模式：safe
- 清理策略：none

## 完整可运行代码

```javascript
return await (async function(eda) {
  const fixtureName = '__codex_example___PCB_ManufactureData_getBomFile_' + Date.now();
  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();
  if (!currentProject) { throw new Error('当前没有打开工程，先打开一个工程再运行这个案例。'); }
  const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (!currentDocument) {
    throw new Error('当前没有活动文档，先打开一个可操作的文档页。');
  }
  if (currentDocument.documentType !== 3) {
    throw new Error('当前文档类型不是 PCB，请先切到 PCB 再运行这个案例。');
  }
  const result = await eda.pcb_ManufactureData.getBomFile(undefined, undefined, undefined, undefined, undefined, undefined, []);
  return {
    fixtureName,
    currentProject: currentProject?.friendlyName ?? currentProject?.name ?? currentProject?.uuid ?? null,
    currentDocumentType: currentDocument?.documentType ?? null,
    result,
  };
})(eda);
```

## 运行后预期结果

成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。

## 参数与返回值怎么理解

- `fileName`：_（可选）_ 文件名
- `fileType`：_（可选）_ 文件类型
- `template`：_（可选）_ 模板名称
- `filterOptions`：_（可选）_ 过滤规则，仅应包含需要启用的规则，`property` 为规则名称，`includeValue` 为匹配的值
- `statistics`：_（可选）_ 统计，包含所有需要启用的统计项的名称
- `property`：_（可选）_ 属性，包含所有需要启用的属性的名称
- `columns`：_（可选）_ 列的属性及排序，`title` 、`sort` 、`group` 、`orderWeight` 不传入则取默认值，`null` 代表 \*\*无\*\* 或 \*\*空\*\*

- 返回值：Promise<File \| undefined>

BOM 文件数据 

## 常见错误与排查

- 如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。
- 如果报文档类型错误，通常是当前停留在主页、原理图或 3D 预览，而不是 PCB。
- PCB 坐标单位是 1mil，写创建/修改案例时不要误用原理图的 0.01inch。

## 验证记录入口

默认验证记录会写到 `examples/reports/latest.json`，该案例的索引键是 `PCB_ManufactureData.getBomFile`。
