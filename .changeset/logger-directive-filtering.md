---
"@prosopo/logger": minor
---

Add directive-based scope filtering via PROSOPO_LOG_LEVEL and subscope support to with(). PROSOPO_LOG_LEVEL now accepts comma-separated directives like "warn,database=trace" to set per-scope log levels. Directives are resolved at print time, so child loggers created via with() pick up directive changes made after construction (e.g. via setGlobalDirectives) instead of having the level resolved at with() time baked in.
