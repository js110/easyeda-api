# API 案例系统架构文档

这份文档面向后续维护本仓库的开发者，说明当前“扩展 API 案例生成与验证系统”的设计目标、目录职责、生成链路、验证链路，以及后续扩展时的约束。

## 1. 设计目标

当前方案解决的是两个问题：

1. 让仓库内的每个 EasyEDA 扩展 API 都有一份可以直接阅读的案例；
2. 让其中一部分案例可以通过 bridge 在真实 EasyEDA 环境中自动执行，避免案例只“看起来合理”但实际上跑不通。

因此，这套系统不是单纯的文档生成器，而是一个由以下几个环节组成的流水线：

- 文档发现：从 `references/` 中提取全部 API 元数据；
- 案例合成：将 API 签名、类域、参数、备注映射成开发者友好的案例；
- 案例发布：写入 `examples/` 目录，并更新统一索引；
- 案例验证：通过 bridge 把案例代码送入 EasyEDA 真机执行；
- 报告沉淀：保存验证结果，为后续恢复上下文和回归排查提供依据。

## 2. 核心原则

维护这套系统时，请始终遵守以下原则：

### 2.1 文档驱动

案例的来源是 `references/`，不是人工维护的名单。新增 API 后，应当通过重新解析文档自动发现缺口，而不是手工补录。

### 2.2 一方法一案例

当前粒度固定为“每个方法一个案例文件”，便于：

- 通过 `className + methodName` 精确定位；
- 按方法级别增量重生成；
- 按方法级别验证和回归；
- 给 Agent 和开发者提供稳定链接。

### 2.3 案例优先可理解，不优先最短

案例不是“最少几行能调通”就算完成。优先级应当是：

1. 开发者能看懂它解决什么问题；
2. 开发者知道在什么上下文调用；
3. 代码尽量可以直接运行；
4. 能自动验证的尽量自动验证。

### 2.4 自动验证要诚实

不要把不稳定、高副作用、慢导出、依赖复杂外部状态的接口硬塞进自动批次。无法稳定自动跑的接口，应该明确标记为 `manual`，而不是伪装成“已覆盖”。

## 3. 目录结构

当前与案例系统直接相关的目录如下：

```text
examples/
  catalog.json
  fixtures/
    defaults.json
  generated/
    <ClassName>/<method>.json
  methods/
    <ClassName>/<method>.md
  reports/
    *.json

scripts/
  generate-examples.mjs
  verify-examples.mjs
  lib/
    reference-parser.mjs
    example-system.mjs
    verification-context.mjs
    bridge-client.mjs

tests/
  example-system.test.mjs
  reference-parser.test.mjs
  verification-context.test.mjs
```

### 3.1 `examples/catalog.json`

这是整个案例系统的主索引，也是 Agent 和脚本都应该优先读取的入口。每条记录对应一个 API 方法，包含以下关键字段：

- `className`
- `methodName`
- `slug`
- `docPath`
- `examplePath`
- `generatedPath`
- `kind`
- `domain`
- `requiresDocumentType`
- `requiresProject`
- `cleanupStrategy`
- `validationMode`
- `status`
- `templateName`

### 3.2 `examples/methods/`

面向开发者阅读的 Markdown 案例文档。每个文件必须保持统一结构：

- 这个 API 是干什么的
- 什么时候该用它
- 运行前需要什么上下文
- 完整可运行代码
- 运行后预期结果
- 参数与返回值怎么理解
- 常见错误与排查
- 验证记录入口

### 3.3 `examples/generated/`

机器生成的中间产物。这里保存：

- 解析到的签名
- 参数摘要
- 返回值摘要
- 备注
- 模板选择结果
- 最终生成的可执行代码

这层的存在是为了：

- 增量重生成时不必重新组织 Markdown 逻辑；
- 验证器直接读取可执行代码；
- 排查“案例文档正常但代码不对”时有明确中间层。

### 3.4 `examples/fixtures/defaults.json`

保存默认夹具配置，例如：

- 命名前缀
- 库搜索关键词
- LCSC 物料号样本
- UI 文案
- PCB/SCH 的默认坐标和图元构造参数

这里的目标是把“可能经常调”的运行时种子参数集中管理，而不是散落在模板字符串里。

### 3.5 `examples/reports/`

保存验证报告。除了人工查看失败外，这里还有一个额外职责：给验证器提供最近一次可恢复的工程锚点。

## 4. 脚本职责划分

### 4.1 `scripts/generate-examples.mjs`

生成器 CLI 入口。负责：

- 解析命令行参数；
- 加载 API 注册表；
- 调用案例构建逻辑；
- 将产物写回 `examples/`。

支持的典型用法：

```bash
npm run generate-examples -- --all
npm run generate-examples -- --class DMT_Project
npm run generate-examples -- --method PCB_PrimitiveLine.create
npm run generate-examples -- --missing-only
```

### 4.2 `scripts/lib/reference-parser.mjs`

负责把 `references/` 中的 API 文档抽取成统一注册表。当前流程是：

1. 从 `references/_quick-reference.md` 提取类和方法签名；
2. 回读对应 `references/classes/*.md`；
3. 提取：
   - 描述
   - 备注
   - 参数表
   - 返回值
   - BETA / 弃用提示
4. 生成后续模板系统可消费的元数据。

### 4.3 `scripts/lib/example-system.mjs`

这是案例系统的核心。它承担四类职责：

1. 判断一个 API 属于什么能力类型；
2. 推断需要什么上下文；
3. 选择哪个案例模板；
4. 生成 catalog 项、generated JSON、Markdown 文档。

这里包含了大量启发式规则，例如：

- `get*` 更偏查询；
- `create*`、`copy*` 倾向创建；
- `modify*`、`set*` 倾向更新；
- `delete*` 倾向删除；
- `IPCB_*` / `ISCH_*` 一般是实例接口，更容易依赖真实图元；
- `PCB_` / `SCH_` 图元接口通常需要文档类型守卫；
- 某些库接口、导出接口、文件系统接口会被下调为 `manual`。

### 4.4 `scripts/verify-examples.mjs`

验证 CLI 入口。负责：

- 过滤出要跑的案例；
- 发现 bridge；
- 探测当前 EasyEDA 上下文；
- 必要时恢复工程/图页上下文；
- 执行 generated code；
- 记录 `passed / blocked / failed / skipped`；
- 落盘到 `examples/reports/`。

支持的典型用法：

```bash
npm run verify-examples -- --mode safe
npm run verify-examples -- --mode mutating
npm run verify-examples -- --method SCH_PrimitiveComponent.create --mode mutating
```

### 4.5 `scripts/lib/verification-context.mjs`

负责验证期排序和上下文恢复策略，包括：

- 哪些案例先跑；
- 当前上下文是否需要恢复；
- 恢复时优先切到哪个文档 UUID。

### 4.6 `scripts/lib/bridge-client.mjs`

负责和 bridge 通信，包含：

- 发现 bridge；
- 列出连接中的 EasyEDA 窗口；
- 发送代码执行请求。

这里已经补了空响应重试保护，避免桥接偶发空体时整轮验证直接崩溃。

## 5. 数据流

完整数据流如下：

```text
references/_quick-reference.md
  + references/classes/*.md
        ↓
reference-parser.mjs
        ↓
API registry
        ↓
example-system.mjs
        ↓
catalog entry + generated json + markdown
        ↓
examples/catalog.json
examples/generated/**.json
examples/methods/**.md
        ↓
verify-examples.mjs
        ↓
examples/reports/*.json
```

## 6. 案例生成策略

### 6.1 方法分类

当前案例生成首先依赖 `kind`：

- `query`
- `create`
- `update`
- `delete`
- `ui`

虽然 catalog 只保留这些高层字段，但模板选择实际上更细，会区分：

- 上下文查询
- 文档控制
- 选择态读取
- 图元创建
- 图元修改
- 图元实例读取
- 库对象读取
- 库对象编辑
- 文件导出
- 系统消息 / 窗口 / UI

### 6.2 上下文推断

生成器会为每个方法推断这些约束：

- 是否必须有工程；
- 是否要求 PCB 文档；
- 是否要求原理图文档；
- 是否可能依赖选中图元；
- 是否需要运行时夹具。

这些约束会直接影响：

- 案例文案中的“运行前需要什么上下文”；
- 验证器是否能自动跑；
- 上下文恢复策略；
- 是否需要自动清理。

### 6.3 案例模板

当前模板不是单独拆成模板文件，而是主要收敛在 `example-system.mjs` 中的多个渲染函数里。这样做的原因是模板和规则高度耦合，需要共享很多逻辑。

主要模板族包括：

- 查询型模板：先获取上下文，再调用 API，再组织返回结果；
- 创建型模板：创建带 `fixtureName` 的对象，返回关键信息，并在可能时自动清理；
- 删除型模板：先创建夹具，再删除，再返回删除结果；
- 修改型模板：先创建夹具，读取 `before`，构造 `property`，执行 `modify`，再读取 `after`；
- 实例读取模板：若方法依赖真实 primitive，则优先自动创建最小夹具；
- 评审占位模板：对高风险或推断不足的方法，先生成 `needs-review` 占位案例。

## 7. 夹具策略

夹具系统是自动验证能跑通的关键。

### 7.1 夹具命名

创建型案例统一使用：

```text
__codex_example__<Class>_<method>_<timestamp>
```

这样可以：

- 明确区分测试对象和业务对象；
- 方便在图纸中人工清理；
- 让创建、修改、删除案例形成闭环。

### 7.2 夹具优先级

当前优先顺序是：

1. 使用真实可运行的最小图元夹具；
2. 如果图元夹具不可控，则退化为已有对象读取；
3. 如果副作用太高或上下文不稳定，则降级为 `manual`。

### 7.3 典型夹具案例

目前已经对以下情况做了专门夹具支持：

- `PCB_PrimitivePad.get`
- `PCB_PrimitiveObject.get`
- `SCH_PrimitivePin.get`
- `SCH_PrimitiveAttribute.get`
- 大量 `modify` 类 primitive API

这些夹具的目的是让“空白工程”里也能把 API 的主要能力跑出来，而不是要求验证前手工布好样本。

## 8. 验证模式

### 8.1 `safe`

适合默认自动批跑。通常包括：

- 只读查询；
- 文档/窗口/项目信息读取；
- 可稳定运行的低风险导出；
- 只创建临时夹具且能明确清理的读取闭环。

### 8.2 `mutating`

会修改 EasyEDA 当前工程，但要求可以自动清理。通常包括：

- 创建图元；
- 修改图元；
- 删除临时图元；
- 可回滚的部分库对象操作。

### 8.3 `manual`

不进入默认自动批次。常见原因：

- 接口已弃用；
- 行为不稳定；
- 副作用大；
- 导出耗时长；
- 强依赖外部环境；
- 很难自动回滚；
- 文档信息不足，只适合先留案例再人工补。

## 9. 上下文恢复策略

验证器运行时经常会遇到一个问题：EasyEDA 当前焦点未必停留在目标工程/图页。

为了解决这个问题，当前系统采用“当前探测 + 历史锚点合并”的策略：

1. 先探测当前是否有打开工程、当前活动文档类型和 UUID；
2. 再扫描历史报告，提取最近可用的工程锚点；
3. 将两者合并，尽量同时保留：
   - `schematicPageUuid`
   - `pcbUuid`
   - `activeProjectDocumentUuid`
4. 当案例要求特定文档类型时，通过：
   - `eda.dmt_Project.openProject(projectUuid)`
   - `eda.dmt_EditorControl.openDocument(documentUuid)`
   尝试恢复到目标页。

这个策略的意义是：

- 即使当前焦点在库页，也能借历史信息切回工程；
- 即使当前焦点是原理图，也能记住最近跑通过的 PCB 页；
- 单方法重跑不会因为“只记住当前页”而丢掉另一个文档的 UUID。

## 10. 报告格式与用途

每份报告都至少记录：

- `generatedAt`
- `requestedMode`
- `health`
- `windows`
- `contextSnapshot`
- `seededAnchorContext`
- `results`

每个结果项会记录：

- `slug`
- `status`
- `summary`
- `error` 或 `reason`
- `contextSnapshot`
- `restoreAttempt`

这些报告既用于人工排查，也用于：

- 恢复工程上下文；
- 找回最近一次能跑通的图页 UUID；
- 对失败项做精确补跑。

## 11. 测试策略

当前测试分三层：

### 11.1 解析测试

由 [reference-parser.test.mjs](../tests/reference-parser.test.mjs) 负责，保证 API 注册表的提取没有明显回归。

### 11.2 生成测试

由 [example-system.test.mjs](../tests/example-system.test.mjs) 负责，主要覆盖：

- 案例模板是否选对；
- 代码是否可编译；
- 某些关键夹具是否确实生成；
- 某些不稳定方法是否确实被降级为 `manual`。

### 11.3 验证辅助测试

由 [verification-context.test.mjs](../tests/verification-context.test.mjs) 负责，保证：

- 排序策略稳定；
- 上下文恢复选择稳定。

## 12. 维护者常见任务

### 12.1 新增 API 文档后，如何补案例

执行：

```bash
npm run generate-examples -- --missing-only
```

然后检查：

- `examples/catalog.json` 是否新增记录；
- `status` 是否为 `ready` 或 `needs-review`；
- 关键方法是否被错误分类为 `manual`。

### 12.2 定向调某个 API 的案例

执行：

```bash
npm run generate-examples -- --method SCH_PrimitiveComponent.create
npm run verify-examples -- --method SCH_PrimitiveComponent.create --mode mutating
```

### 12.3 调整某类 API 的默认策略

优先修改 [example-system.mjs](../scripts/lib/example-system.mjs) 中以下区域：

- 方法分类规则
- 文档类型推断
- 清理策略推断
- `determineValidationMode()`
- 夹具渲染函数

改完后必须补测试，不要只改生成逻辑。

### 12.4 处理验证失败

建议顺序：

1. 先看 `examples/reports/latest.json`；
2. 确认是：
   - 案例生成错误
   - 上下文恢复错误
   - bridge 错误
   - EasyEDA 本身环境限制
3. 若是生成器问题，优先修模板或夹具；
4. 若是环境限制且难以稳定自动化，则改为 `manual`。

## 13. 已知边界

当前系统仍有这些边界：

- `manual` 方法数量较多，说明“全自动覆盖”还不是目标状态；
- 某些库接口虽然能跑，但返回值高度依赖线上库数据；
- 慢导出接口和部分文件系统接口在 bridge 场景下仍不稳定；
- 案例模板主要收敛在一个文件里，维护成本较高，但目前换来的是规则统一和易于联调。

## 14. 后续可演进方向

如果后面要继续投入，建议优先做这几件事：

1. 把 `manual` 再细分为：
   - `manual-high-risk`
   - `manual-env-dependent`
   - `manual-needs-review`
2. 把模板系统进一步模块化，降低 `example-system.mjs` 的复杂度；
3. 引入更稳定的专用测试工程准备脚本；
4. 在报告里增加聚合统计字段，减少人工汇总；
5. 对“弃用 API”统一输出替代建议，而不是只下调模式。

## 15. 结论

当前实现方案的本质不是“写了很多 Markdown”，而是建立了一条可重复运行的生产链：

- 文档进入 `references/`
- 生成器发现并产出案例
- 验证器在真实 EasyEDA 中执行
- 报告回流到系统本身

只要后续维护者继续围绕这条链路工作，而不是回到手工零散维护案例的方式，这个仓库就能持续扩展。
