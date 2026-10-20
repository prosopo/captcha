// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

mod logger_unit {
    // Ported from src/tests/logger.unit.test.ts

    use crate::test_support::{harness, Harness};
    use crate::{
        get_logger_with_runtime, parse_directives, parse_log_level, resolve_level,
        set_global_directives, ConsoleMethod, ErrorObject, LogLevel, LogObject, LogRecord,
        LogRuntime,
    };
    use serde_json::{json, Map, Value};
    use std::sync::Arc;

    fn last_record(h: &Harness, method: ConsoleMethod) -> Map<String, Value> {
        let lines = h.sink.lines_for(method);
        let raw = lines.last().cloned().unwrap_or_default();
        serde_json::from_str(&raw).expect("record is JSON")
    }

    fn err_data(h: &Harness) -> Map<String, Value> {
        last_record(h, ConsoleMethod::Error)["errData"]
            .as_object()
            .cloned()
            .expect("errData is an object")
    }

    fn obj(value: Value) -> LogObject {
        value.as_object().cloned().expect("object literal")
    }

    #[test]
    fn unpack_error_captures_name_from_error_prototype_chain() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Error, "test", h.runtime.clone());
        let err = ErrorObject::new("TypeError", "bad input");
        logger.error(|| LogRecord::default().with_err(err));
        assert_eq!(err_data(&h)["name"], json!("TypeError"));
    }

    #[test]
    fn unpack_error_captures_message_field() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Error, "test", h.runtime.clone());
        let err = ErrorObject::new("Error", "something went wrong");
        logger.error(|| LogRecord::default().with_err(err));
        assert_eq!(err_data(&h)["message"], json!("something went wrong"));
    }

    #[test]
    fn unpack_error_captures_custom_own_properties_from_subclass_errors() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Error, "test", h.runtime.clone());
        let err = ErrorObject::new("Error", "custom").with_prop("statusCode", json!(404));
        logger.error(|| LogRecord::default().with_err(err));
        assert_eq!(err_data(&h)["statusCode"], json!(404));
    }

    #[test]
    fn unpack_error_recursively_unpacks_cause() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Error, "test", h.runtime.clone());
        let cause = ErrorObject::new("Error", "root cause");
        let err = ErrorObject::new("Error", "outer").with_prop("cause", cause);
        logger.error(|| LogRecord::default().with_err(err));
        assert!(err_data(&h)["cause"].is_object());
    }

    #[test]
    fn unpack_error_suppresses_stack_when_print_stack_is_false() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Error, "test", h.runtime.clone());
        let err = ErrorObject::new("Error", "test").with_stack("Error: test\n    at <anonymous>");
        logger.error(|| LogRecord::default().with_err(err));
        assert!(!err_data(&h).contains_key("stack"));
    }

    // BigInt does not exist in Rust; callers pass the decimal string, which is what the TS
    // logger emits after stringifyBigInts. These check that such values come out unchanged.
    #[test]
    fn stringify_big_ints_should_stringify_big_int() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "s", h.runtime.clone());
        let big = 12345678901234567890u128.to_string();
        logger.info(|| LogRecord::default().with_data(json!({ "v": big })));
        assert_eq!(
            last_record(&h, ConsoleMethod::Info)["data"]["v"],
            json!("12345678901234567890")
        );
    }

    #[test]
    fn stringify_big_ints_should_stringify_big_int_in_object_properties() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "s", h.runtime.clone());
        let data = json!({
            "first": 12345678901234567890u128.to_string(),
            "second": { "inner": { "field": 23456789012345678901u128.to_string() } },
            "third": "third",
        });
        logger.info(|| LogRecord::default().with_data(data));
        assert_eq!(
            last_record(&h, ConsoleMethod::Info)["data"],
            json!({
                "first": "12345678901234567890",
                "second": { "inner": { "field": "23456789012345678901" } },
                "third": "third",
            })
        );
    }

    #[test]
    fn stringify_big_ints_should_stringify_big_int_inside_array() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "s", h.runtime.clone());
        let data = json!({ "list": [
            12345678901234567890u128.to_string(),
            ["inner", 23456789012345678901u128.to_string()],
            { "name": "object", "value": 34567890123456789012u128.to_string() },
            "third",
        ]});
        logger.info(|| LogRecord::default().with_data(data));
        assert_eq!(
            last_record(&h, ConsoleMethod::Info)["data"]["list"],
            json!([
                "12345678901234567890",
                ["inner", "23456789012345678901"],
                { "name": "object", "value": "34567890123456789012" },
                "third",
            ])
        );
    }

    #[test]
    fn parse_log_level_parses_a_bare_level() {
        assert_eq!(
            parse_log_level(Some("warn"), LogLevel::Info),
            LogLevel::Warn
        );
    }

    #[test]
    fn parse_log_level_extracts_the_global_level_from_a_directive_string() {
        assert_eq!(
            parse_log_level(Some("warn,database=trace"), LogLevel::Info),
            LogLevel::Warn
        );
    }

    #[test]
    fn parse_log_level_returns_the_fallback_for_a_directives_only_string() {
        assert_eq!(
            parse_log_level(Some("database=trace"), LogLevel::Info),
            LogLevel::Info
        );
    }

    #[test]
    fn parse_log_level_returns_the_fallback_for_undefined() {
        assert_eq!(parse_log_level(None, LogLevel::Info), LogLevel::Info);
    }

    #[test]
    fn parse_directives_parses_a_bare_level_as_the_global_default() {
        assert_eq!(parse_directives("debug").get(""), Some(&LogLevel::Debug));
    }

    #[test]
    fn parse_directives_parses_scope_level_pairs() {
        let d = parse_directives("provider:db=debug,provider:api=trace");
        assert_eq!(d.get("provider:db"), Some(&LogLevel::Debug));
        assert_eq!(d.get("provider:api"), Some(&LogLevel::Trace));
    }

    #[test]
    fn parse_directives_ignores_empty_and_invalid_entries() {
        let d = parse_directives(" , provider:db=debug , bogus=nope ");
        assert_eq!(d.get("provider:db"), Some(&LogLevel::Debug));
        assert!(!d.contains_key("bogus"));
    }

    #[test]
    fn parse_directives_ignores_an_empty_scope_entry() {
        assert!(!parse_directives("=debug").contains_key(""));
    }

    #[test]
    fn parse_directives_does_not_let_an_empty_scope_entry_override_a_real_scope() {
        let d = parse_directives("=debug,provider:db=warn");
        assert!(!d.contains_key(""));
        assert_eq!(d.get("provider:db"), Some(&LogLevel::Warn));
    }

    #[test]
    fn parse_directives_parses_per_scope_overrides() {
        let d = parse_directives("warn,database=trace");
        assert_eq!(d.get(""), Some(&LogLevel::Warn));
        assert_eq!(d.get("database"), Some(&LogLevel::Trace));
    }

    #[test]
    fn parse_directives_parses_directives_only() {
        let d = parse_directives("database=trace");
        assert!(!d.contains_key(""));
        assert_eq!(d.get("database"), Some(&LogLevel::Trace));
    }

    #[test]
    fn resolve_level_returns_an_exact_scope_match() {
        let d = parse_directives("provider:db=debug");
        assert_eq!(
            resolve_level("provider:db", &d, LogLevel::Info),
            LogLevel::Debug
        );
    }

    #[test]
    fn resolve_level_returns_the_most_specific_matching_prefix() {
        let d = parse_directives("provider=warn,provider:db=debug");
        assert_eq!(
            resolve_level("provider:db:query", &d, LogLevel::Info),
            LogLevel::Debug
        );
    }

    #[test]
    fn resolve_level_falls_back_to_the_global_default_when_no_scope_matches() {
        let d = parse_directives("other=trace,error");
        assert_eq!(
            resolve_level("provider:db", &d, LogLevel::Info),
            LogLevel::Error
        );
    }

    #[test]
    fn resolve_level_falls_back_to_the_supplied_fallback_when_nothing_matches() {
        let d = parse_directives("other=trace");
        assert_eq!(
            resolve_level("provider:db", &d, LogLevel::Info),
            LogLevel::Info
        );
    }

    #[test]
    fn resolve_level_matches_the_exact_scope() {
        let d = parse_directives("warn,database:mongo=trace");
        assert_eq!(
            resolve_level("database:mongo", &d, LogLevel::Info),
            LogLevel::Trace
        );
    }

    #[test]
    fn resolve_level_matches_a_prefix_when_exact_scope_has_no_entry() {
        let d = parse_directives("warn,database=debug");
        assert_eq!(
            resolve_level("database:mongo:queries", &d, LogLevel::Info),
            LogLevel::Debug
        );
    }

    #[test]
    fn resolve_level_falls_back_to_global_default_when_no_scope_matches() {
        let d = parse_directives("warn,database=debug");
        assert_eq!(
            resolve_level("provider:request", &d, LogLevel::Info),
            LogLevel::Warn
        );
    }

    #[test]
    fn resolve_level_returns_fallback_when_directives_are_empty() {
        let d = parse_directives("");
        assert_eq!(
            resolve_level("any:scope", &d, LogLevel::Info),
            LogLevel::Info
        );
    }

    #[test]
    fn with_subscope_directives_concatenates_parent_scope_with_subscope() {
        let h = harness();
        h.directives.set("parent:child=debug");
        let child = get_logger_with_runtime(LogLevel::Info, "parent", h.runtime.clone())
            .with(&LogObject::new(), Some("child"));
        child.debug(|| LogRecord::msg("hello"));
        assert_eq!(h.sink.count(), 1);
    }

    #[test]
    fn with_subscope_directives_uses_the_subscope_directly_when_the_parent_scope_is_empty() {
        let h = harness();
        h.directives.set("admin=debug");
        let child = get_logger_with_runtime(LogLevel::Info, "", h.runtime.clone())
            .with(&LogObject::new(), Some("admin"));
        child.debug(|| LogRecord::msg("hello"));
        assert_eq!(h.sink.count(), 1);
    }

    #[test]
    fn with_subscope_directives_re_resolves_directives_at_print_time() {
        let h = harness();
        h.directives.set("admin=debug");
        let child = get_logger_with_runtime(LogLevel::Info, "", h.runtime.clone())
            .with(&LogObject::new(), Some("admin"));
        h.directives.set("");
        child.debug(|| LogRecord::msg("should be suppressed"));
        assert_eq!(h.sink.count(), 0);
        child.info(|| LogRecord::msg("visible"));
        assert_eq!(h.sink.count(), 1);
    }

    // The only test that touches the process-wide store; every other test uses its own.
    #[test]
    fn set_global_directives_affects_an_existing_loggers_filtering_at_emit_time() {
        let h = harness();
        let runtime = LogRuntime {
            directives: crate::global_directives(),
            ..h.runtime.clone()
        };
        let logger = get_logger_with_runtime(LogLevel::Info, "test-scope", runtime);
        set_global_directives("warn");
        logger.debug(|| LogRecord::msg("hidden"));
        assert_eq!(h.sink.lines_for(ConsoleMethod::Debug).len(), 0);
        set_global_directives("warn,test-scope=trace");
        logger.debug(|| LogRecord::msg("shown"));
        assert_eq!(h.sink.lines_for(ConsoleMethod::Debug).len(), 1);
        set_global_directives(&std::env::var("PROSOPO_LOG_LEVEL").unwrap_or_default());
    }

    #[test]
    fn emitted_record_uses_the_message_level_rather_than_the_configured_level() {
        let h = harness();
        h.directives.set("trace");
        let logger = get_logger_with_runtime(LogLevel::Info, "record-scope", h.runtime.clone());
        logger.error(|| LogRecord::msg("boom"));
        assert_eq!(h.sink.lines_for(ConsoleMethod::Error).len(), 1);
        let record = last_record(&h, ConsoleMethod::Error);
        assert_eq!(record["level"], json!("error"));
        assert_eq!(record["scope"], json!("record-scope"));
        assert_eq!(record["msg"], json!("boom"));
    }

    #[test]
    fn with_subscope_appends_subscope_to_parent_scope() {
        let h = harness();
        let child = get_logger_with_runtime(LogLevel::Info, "provider", h.runtime)
            .with(&LogObject::new(), Some("request"));
        assert_eq!(child.get_scope(), "provider:request");
    }

    #[test]
    fn with_subscope_does_not_produce_a_leading_colon_when_parent_scope_is_empty() {
        let h = harness();
        let child = get_logger_with_runtime(LogLevel::Info, "", h.runtime)
            .with(&LogObject::new(), Some("request"));
        assert_eq!(child.get_scope(), "request");
    }

    #[test]
    fn with_subscope_trims_surrounding_whitespace_from_the_subscope() {
        let h = harness();
        let child = get_logger_with_runtime(LogLevel::Info, "provider", h.runtime)
            .with(&LogObject::new(), Some("  request  "));
        assert_eq!(child.get_scope(), "provider:request");
    }

    #[test]
    fn with_subscope_treats_a_whitespace_only_subscope_as_absent() {
        let h = harness();
        let child = get_logger_with_runtime(LogLevel::Info, "provider", h.runtime)
            .with(&LogObject::new(), Some("   "));
        assert_eq!(child.get_scope(), "provider");
    }

    #[test]
    fn with_subscope_merges_parent_and_child_default_data_into_emitted_records() {
        let h = harness();
        h.directives.set("trace");
        let parent = get_logger_with_runtime(LogLevel::Info, "test", h.runtime.clone())
            .with(&obj(json!({ "requestId": "abc" })), None);
        let child = parent.with(&obj(json!({ "extra": 1 })), None);
        child.info(|| LogRecord::default().with_data(json!({ "perCall": true })));
        assert_eq!(h.sink.lines_for(ConsoleMethod::Info).len(), 1);
        let record = last_record(&h, ConsoleMethod::Info);
        assert_eq!(record["scope"], json!("test"));
        let data = &record["data"];
        assert_eq!(data["requestId"], json!("abc"));
        assert_eq!(data["extra"], json!(1));
        assert_eq!(data["perCall"], json!(true));
    }

    #[test]
    fn with_subscope_promotes_request_id_from_default_data_to_top_level_req_id() {
        let h = harness();
        h.directives.set("trace");
        let logger = get_logger_with_runtime(LogLevel::Info, "test", h.runtime.clone())
            .with(&obj(json!({ "requestId": "abc-123" })), None);
        logger.info(|| LogRecord::msg("hello"));
        assert_eq!(h.sink.lines_for(ConsoleMethod::Info).len(), 1);
        let record = last_record(&h, ConsoleMethod::Info);
        assert_eq!(record["req_id"], json!("abc-123"));
        assert_eq!(record["data"]["requestId"], json!("abc-123"));
    }

    #[test]
    fn with_subscope_omits_req_id_when_the_log_record_has_no_request_id() {
        let h = harness();
        h.directives.set("trace");
        let logger = get_logger_with_runtime(LogLevel::Info, "test", h.runtime.clone());
        logger.info(|| LogRecord::msg("hello").with_data(json!({ "foo": "bar" })));
        assert_eq!(h.sink.lines_for(ConsoleMethod::Info).len(), 1);
        let record = last_record(&h, ConsoleMethod::Info);
        assert!(!record.contains_key("req_id"));
        assert_eq!(record["data"], json!({ "foo": "bar" }));
    }

    #[test]
    fn loggers_are_send_sync_and_clones_share_settings() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<crate::Logger>();
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "s", h.runtime);
        let clone = logger.clone();
        clone.set_log_level(LogLevel::Error);
        assert_eq!(logger.get_log_level(), LogLevel::Error);
        let _: Arc<crate::DirectiveStore> = h.directives;
    }
}

mod logger_levels {
    // Ported from src/tests/loggerLevels.unit.test.ts

    use crate::test_support::{harness, Harness};
    use crate::{
        get_logger_with_runtime, ConsoleMethod, ErrorObject, Format, LogLevel, LogObject,
        LogRecord, Logger, UnknownLogLevel,
    };
    use serde_json::{json, Map, Value};

    fn parse_last(h: &Harness, method: ConsoleMethod) -> Map<String, Value> {
        let lines = h.sink.lines_for(method);
        serde_json::from_str(lines.last().expect("a line was emitted")).expect("JSON")
    }

    fn assert_matches(record: &Map<String, Value>, expected: Value) {
        for (key, value) in expected.as_object().expect("object literal") {
            match (record.get(key), value) {
                (Some(Value::Object(actual)), Value::Object(_)) => {
                    assert_matches(actual, value.clone())
                }
                (actual, _) => assert_eq!(actual, Some(value), "field {key}"),
            }
        }
    }

    #[test]
    fn format_accepts_the_json_format_and_reports_it_back() {
        let h = harness();
        let logger = Logger::with_runtime("scope", h.runtime);
        assert_eq!(logger.set_format(Format::Json), Ok(()));
        assert_eq!(logger.get_format(), Format::Json);
    }

    #[test]
    fn format_rejects_the_plain_format_which_is_not_implemented() {
        let h = harness();
        let logger = Logger::with_runtime("scope", h.runtime);
        let err = logger
            .set_format(Format::Plain)
            .expect_err("plain is rejected");
        assert_eq!(err.to_string(), "Only JSON format implemented for now");
    }

    fn assert_routes(level: LogLevel, method: ConsoleMethod) {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Trace, "scope", h.runtime.clone());
        logger.log(level, || LogRecord::msg(format!("{level} message")));
        assert_eq!(
            parse_last(&h, method)["msg"],
            json!(format!("{level} message"))
        );
    }

    #[test]
    fn log_routes_trace_to_its_own_console_method() {
        assert_routes(LogLevel::Trace, ConsoleMethod::Trace);
    }

    #[test]
    fn log_routes_debug_to_its_own_console_method() {
        assert_routes(LogLevel::Debug, ConsoleMethod::Debug);
    }

    #[test]
    fn log_routes_info_to_its_own_console_method() {
        assert_routes(LogLevel::Info, ConsoleMethod::Info);
    }

    #[test]
    fn log_routes_warn_to_its_own_console_method() {
        assert_routes(LogLevel::Warn, ConsoleMethod::Warn);
    }

    #[test]
    fn log_routes_error_to_its_own_console_method() {
        assert_routes(LogLevel::Error, ConsoleMethod::Error);
    }

    #[test]
    fn log_routes_fatal_to_its_own_console_method() {
        assert_routes(LogLevel::Fatal, ConsoleMethod::Error);
    }

    // `log` takes the enum, so an unknown level can only arise when parsing a string.
    #[test]
    fn log_throws_on_an_unknown_log_level() {
        let err = "verbose".parse::<LogLevel>().expect_err("unknown level");
        assert_eq!(err, UnknownLogLevel("verbose".to_string()));
        assert_eq!(err.to_string(), "Unknown log level: verbose");
    }

    #[test]
    fn emits_trace_records_at_the_trace_threshold() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Trace, "scope", h.runtime.clone());
        logger.trace(|| LogRecord::msg("traced"));
        assert_matches(
            &parse_last(&h, ConsoleMethod::Trace),
            json!({ "msg": "traced", "level": "trace" }),
        );
    }

    #[test]
    fn emits_warn_records() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone());
        logger.warn(|| LogRecord::msg("warned"));
        assert_matches(
            &parse_last(&h, ConsoleMethod::Warn),
            json!({ "msg": "warned", "level": "warn" }),
        );
    }

    #[test]
    fn emits_fatal_records_via_console_error() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone());
        logger.fatal(|| LogRecord::msg("fatal"));
        assert_matches(
            &parse_last(&h, ConsoleMethod::Error),
            json!({ "msg": "fatal", "level": "fatal" }),
        );
    }

    #[test]
    fn suppresses_a_record_below_the_threshold() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Warn, "scope", h.runtime.clone());
        logger.debug(|| LogRecord::msg("hidden"));
        assert!(h.sink.lines_for(ConsoleMethod::Debug).is_empty());
    }

    #[test]
    fn passes_a_primitive_cause_through_unchanged() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone());
        let err = ErrorObject::new("Error", "boom").with_prop("cause", "a string cause");
        logger.error(|| LogRecord::default().with_err(err));
        assert_matches(
            parse_last(&h, ConsoleMethod::Error)["errData"]
                .as_object()
                .expect("errData"),
            json!({ "cause": "a string cause" }),
        );
    }

    #[test]
    fn keeps_a_null_cause_out_of_the_unpacked_object() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone());
        let err = ErrorObject::new("Error", "boom").with_prop("cause", Value::Null);
        logger.error(|| LogRecord::default().with_err(err));
        assert!(parse_last(&h, ConsoleMethod::Error)["errData"].is_object());
    }

    #[test]
    fn stringifies_a_primitive_err_field() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone());
        logger.error(|| LogRecord::default().with_err(json!(42)));
        assert_eq!(parse_last(&h, ConsoleMethod::Error)["err"], json!("42"));
    }

    #[test]
    fn stringifies_a_string_err_field() {
        let h = harness();
        let logger = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone());
        logger.error(|| LogRecord::default().with_err("plain failure"));
        assert_eq!(
            parse_last(&h, ConsoleMethod::Error)["err"],
            json!("plain failure")
        );
    }

    #[test]
    fn reuses_the_parent_default_data_when_the_child_adds_none() {
        let h = harness();
        let parent = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone()).with(
            json!({ "requestId": "r1" }).as_object().expect("object"),
            None,
        );
        let child = parent.with(&LogObject::new(), Some("sub"));
        child.info(|| LogRecord::msg("hello"));
        assert_matches(
            &parse_last(&h, ConsoleMethod::Info),
            json!({
                "msg": "hello",
                "req_id": "r1",
                "data": { "requestId": "r1" },
                "scope": "scope:sub",
            }),
        );
    }

    #[test]
    fn omits_default_data_entirely_when_neither_side_supplies_any() {
        let h = harness();
        let child = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone())
            .with(&LogObject::new(), Some("sub"));
        child.info(|| LogRecord::msg("hello"));
        assert_matches(
            &parse_last(&h, ConsoleMethod::Info),
            json!({ "msg": "hello", "scope": "scope:sub" }),
        );
    }

    #[test]
    fn merges_the_child_data_over_the_parent_data() {
        let h = harness();
        let parent = get_logger_with_runtime(LogLevel::Info, "scope", h.runtime.clone())
            .with(json!({ "a": 1, "b": 2 }).as_object().expect("object"), None);
        parent
            .with(json!({ "b": 3 }).as_object().expect("object"), None)
            .info(|| LogRecord::msg("hello"));
        assert_matches(
            &parse_last(&h, ConsoleMethod::Info),
            json!({ "data": { "a": 1, "b": 3 } }),
        );
    }
}
