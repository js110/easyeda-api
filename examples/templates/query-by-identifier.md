# query-by-identifier

用于带 `uuid`、`tabId` 等标识参数的查询类 API。

- 生成器会优先从当前上下文或列表接口里解析一个可用标识
- 如果无法可靠推断，会把案例标成 `needs-review`
- 验证器只会在前置条件满足时实际执行
