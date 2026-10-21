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

//! Replays rust/equivalence/wire-vectors.json, written by generate-wire.ts from the TS:
//! every enum, constant, counter key, blocking decision and schema result must match.

use crate::decision_machine::{
    counter_spec_schema, decision_machine_captcha_type_schema, decision_machine_config_schema,
    decision_machine_output_schema, encode_counter_key, CounterCaptchaType, CounterDimension,
    CounterKind, CounterSpec, CounterWindow, DecisionMachineDecision, DecisionMachineKind,
    DecisionMachineLanguage, DecisionMachineRuntime, DecisionMachineScope, COUNTER_CAPTCHA_ANY,
};
use crate::timeouts::TIMEOUTS;
use crate::*;
use prosopo_api_route::schema::{number, object, Data, Schema};
use serde::Deserialize;
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::str::FromStr;

const VECTORS: &str = include_str!("equivalence/wire-vectors.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Vectors {
    enums: BTreeMap<String, Vec<(String, String)>>,
    api_params: Vec<(String, String)>,
    input_limits: Vec<(String, usize)>,
    timeouts: Vec<(String, u64)>,
    pow_separator: String,
    no_measurement_reasons: Vec<String>,
    counter_window_seconds: Vec<(String, u64)>,
    counter_captcha_any: String,
    test_site_keys: TestSiteKeys,
    counter_keys: Vec<CounterKeyVector>,
    blocking: Vec<BlockingVector>,
    schemas: Vec<String>,
    schema_vectors: Vec<SchemaVector>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct TestSiteKeys {
    pass: String,
    fail: String,
    modes: Vec<SiteKeyMode>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SiteKeyMode {
    site_key: String,
    mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SpecVector {
    kind: String,
    dimension: String,
    window: String,
    captcha_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct CounterKeyVector {
    dapp: String,
    spec: SpecVector,
    value: String,
    key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct BlockingVector {
    captcha_type: String,
    status: String,
    reason: Option<String>,
    blocked: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Repeat {
    unit: String,
    count: usize,
    tail: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    #[serde(default, deserialize_with = "present")]
    value: Option<Value>,
    repeat: Option<Repeat>,
}

fn present<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<Value>, D::Error> {
    Value::deserialize(deserializer).map(Some)
}

impl Input {
    fn data(&self) -> Data {
        match &self.repeat {
            Some(repeat) => Some(Value::from(format!(
                "{}{}",
                repeat.unit.repeat(repeat.count),
                repeat.tail
            ))),
            None => self.value.clone(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum Expected {
    Ok {
        ok: Value,
    },
    OkEcho {
        #[serde(rename = "okEcho")]
        _ok_echo: bool,
    },
    OkUndefined {
        #[serde(rename = "okUndefined")]
        _ok_undefined: bool,
    },
    Issues {
        issues: Value,
    },
    /// The TS threw out of `safeParse`; only `PowChallengeIdSchema` does (see its docs).
    Throws {
        #[serde(rename = "throws")]
        _throws: String,
    },
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SchemaVector {
    schema: String,
    input: Input,
    result: Expected,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("wire-vectors.json parses")
}

fn entries<const N: usize>(
    keys: [&'static str; N],
    values: [&'static str; N],
) -> Vec<(String, String)> {
    keys.iter()
        .zip(values.iter())
        .map(|(key, value)| (key.to_string(), value.to_string()))
        .collect()
}

macro_rules! enum_entries {
    ($name:ty) => {
        entries(<$name>::TS_KEYS, <$name>::ALL.map(<$name>::as_str))
    };
}

#[test]
fn enums_match_the_ts() {
    let vectors: Vectors = vectors();
    let rust: BTreeMap<&str, Vec<(String, String)>> = BTreeMap::from([
        (
            "CaptchaType",
            entries(
                CaptchaType::TS_KEYS,
                CaptchaType::ALL.map(CaptchaType::as_str),
            ),
        ),
        ("Tier", enum_entries!(Tier)),
        ("ModeEnum", enum_entries!(ModeEnum)),
        ("ScheduledTaskNames", enum_entries!(ScheduledTaskNames)),
        ("ScheduledTaskStatus", enum_entries!(ScheduledTaskStatus)),
        ("TestSiteKeyMode", enum_entries!(TestSiteKeyMode)),
        ("BlockRuleType", enum_entries!(BlockRuleType)),
        ("CaptchaTypes", enum_entries!(CaptchaTypes)),
        ("CaptchaItemTypes", enum_entries!(CaptchaItemTypes)),
        ("CaptchaStates", enum_entries!(CaptchaStates)),
        ("InputMethod", enum_entries!(InputMethod)),
        ("CaptchaStatus", enum_entries!(CaptchaStatus)),
        ("StoredStatusNames", enum_entries!(StoredStatusNames)),
        ("GovernanceStatus", enum_entries!(GovernanceStatus)),
        ("DappPayee", enum_entries!(DappPayee)),
        ("FrictionlessReason", enum_entries!(FrictionlessReason)),
        ("ResultReason", enum_entries!(ResultReason)),
        (
            "DecisionMachineRuntime",
            enum_entries!(DecisionMachineRuntime),
        ),
        ("DecisionMachineKind", enum_entries!(DecisionMachineKind)),
        ("DecisionMachineScope", enum_entries!(DecisionMachineScope)),
        (
            "DecisionMachineLanguage",
            enum_entries!(DecisionMachineLanguage),
        ),
        (
            "DecisionMachineDecision",
            enum_entries!(DecisionMachineDecision),
        ),
    ]);
    let recorded: Vec<&str> = vectors.enums.keys().map(String::as_str).collect();
    assert_eq!(recorded, rust.keys().copied().collect::<Vec<&str>>());
    for (name, ts) in &vectors.enums {
        assert_eq!(&rust[name.as_str()], ts, "{name}");
    }
}

#[test]
fn constants_match_the_ts() {
    let vectors: Vectors = vectors();
    let api_params: Vec<(String, String)> = ApiParams::ENTRIES
        .iter()
        .map(|(key, value)| (key.to_string(), value.to_string()))
        .collect();
    assert_eq!(api_params, vectors.api_params);
    let limits: Vec<(String, usize)> = InputLimits::ENTRIES
        .iter()
        .map(|(key, value)| (key.to_string(), *value))
        .collect();
    assert_eq!(limits, vectors.input_limits);
    let mut timeouts: Vec<(String, u64)> = TIMEOUTS
        .iter()
        .map(|(key, value)| (key.to_string(), *value))
        .collect();
    let mut recorded_timeouts: Vec<(String, u64)> = vectors.timeouts.clone();
    timeouts.sort();
    recorded_timeouts.sort();
    assert_eq!(timeouts, recorded_timeouts);
    assert_eq!(POW_SEPARATOR, vectors.pow_separator);
    assert_eq!(
        NO_MEASUREMENT_REASONS
            .map(FrictionlessReason::as_str)
            .to_vec(),
        vectors.no_measurement_reasons
    );
    let windows: Vec<(String, u64)> = CounterWindow::ALL
        .iter()
        .map(|window| (window.as_str().to_string(), window.seconds()))
        .collect();
    assert_eq!(windows, vectors.counter_window_seconds);
    assert_eq!(COUNTER_CAPTCHA_ANY, vectors.counter_captcha_any);
    assert_eq!(ALWAYS_PASS_SITE_KEY, vectors.test_site_keys.pass);
    assert_eq!(ALWAYS_FAIL_SITE_KEY, vectors.test_site_keys.fail);
    for case in &vectors.test_site_keys.modes {
        assert_eq!(
            get_test_site_key_mode(&case.site_key).map(TestSiteKeyMode::as_str),
            case.mode.as_deref(),
            "{}",
            case.site_key
        );
    }
}

fn counter_spec(spec: &SpecVector) -> CounterSpec {
    CounterSpec {
        kind: CounterKind::from_str(&spec.kind).expect("kind"),
        dimension: CounterDimension::from_str(&spec.dimension).expect("dimension"),
        window: CounterWindow::from_str(&spec.window).expect("window"),
        captcha_type: match spec.captcha_type.as_str() {
            COUNTER_CAPTCHA_ANY => CounterCaptchaType::Any,
            other => CounterCaptchaType::Type(CaptchaType::from_str(other).expect("captcha type")),
        },
    }
}

#[test]
fn counter_keys_are_byte_identical() {
    let vectors: Vectors = vectors();
    assert!(vectors.counter_keys.len() > 100);
    for case in &vectors.counter_keys {
        assert_eq!(
            encode_counter_key(&case.dapp, &counter_spec(&case.spec), &case.value),
            case.key
        );
    }
}

#[test]
fn blocking_decisions_match_the_ts() {
    let vectors: Vectors = vectors();
    assert!(vectors.blocking.len() > 600);
    for case in &vectors.blocking {
        let result: CaptchaResult = CaptchaResult {
            status: CaptchaStatus::from_str(&case.status).expect("status"),
            reason: case
                .reason
                .as_deref()
                .map(|reason| ResultReason::from_str(reason).expect("reason")),
        };
        let captcha_type: CaptchaType = CaptchaType::from_str(&case.captcha_type).expect("type");
        assert_eq!(
            is_blocking_captcha_result(captcha_type, result),
            case.blocked,
            "{case:?}"
        );
    }
}

fn schemas() -> BTreeMap<&'static str, Schema> {
    BTreeMap::from([
        ("boundedString4", bounded_string(4)),
        ("boundedStringId", bounded_string(InputLimits::ID)),
        ("boundedStringToken", bounded_string(InputLimits::TOKEN)),
        ("boundedStringDefault", bounded_string(InputLimits::TEXT)),
        ("safeText3", safe_text(3)),
        ("safeTextLong", safe_text(InputLimits::LONG_TEXT)),
        ("safeLine", safe_line(InputLimits::NAME)),
        ("safeLine5", safe_line(5)),
        ("boundedArrayNumbers", bounded_array(number(), 3)),
        (
            "boundedArrayObjects",
            bounded_array(object(vec![("x", number()), ("y", number())]), 2),
        ),
        ("captchaType", captcha_type_schema()),
        ("selectableCaptchaType", selectable_captcha_type_schema()),
        (
            "decisionMachineCaptchaType",
            decision_machine_captcha_type_schema(),
        ),
        ("tier", Tier::schema()),
        ("mode", mode_schema()),
        ("inputMethod", InputMethod::schema()),
        ("powChallengeId", pow_challenge_id_schema()),
        ("counterSpec", counter_spec_schema()),
        ("decisionMachineOutput", decision_machine_output_schema()),
        ("decisionMachineConfig", decision_machine_config_schema()),
    ])
}

/// JSON equality with key order checked and numbers compared by value.
fn same_json(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same_json(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .zip(b.iter())
                    .all(|((ka, va), (kb, vb))| ka == kb && same_json(va, vb))
        }
        (a, b) => a == b,
    }
}

#[test]
fn schemas_match_the_ts() {
    let vectors: Vectors = vectors();
    let schemas: BTreeMap<&'static str, Schema> = schemas();
    let mut recorded: Vec<&str> = vectors.schemas.iter().map(String::as_str).collect();
    recorded.sort_unstable();
    assert_eq!(recorded, schemas.keys().copied().collect::<Vec<&str>>());
    let mut failures: Vec<String> = Vec::new();
    for vector in &vectors.schema_vectors {
        let input: Data = vector.input.data();
        let actual: Result<Data, Vec<Map<String, Value>>> =
            schemas[vector.schema.as_str()].safe_parse(input.as_ref());
        let matches: bool = match (&actual, &vector.result) {
            (Ok(Some(value)), Expected::Ok { ok }) => same_json(value, ok),
            (Ok(Some(value)), Expected::OkEcho { .. }) => Some(value) == input.as_ref(),
            (Ok(None), Expected::OkUndefined { .. }) => true,
            (Err(issues), Expected::Issues { issues: expected }) => same_json(
                &Value::Array(issues.iter().cloned().map(Value::Object).collect()),
                expected,
            ),
            (Err(_), Expected::Throws { .. }) => vector.schema == "powChallengeId",
            _ => false,
        };
        if !matches {
            failures.push(format!(
                "{} {:?}: got {:?}, TS gave {:?}",
                vector.schema,
                input.map(|value| value.to_string().chars().take(80).collect::<String>()),
                actual.map_err(|issues| serde_json::to_string(&issues).unwrap_or_default()),
                vector.result
            ));
        }
    }
    assert!(
        failures.is_empty(),
        "{} differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
}
