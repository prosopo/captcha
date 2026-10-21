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

//! The TypeScript `@prosopo/types` takes from the Rust, which is the source of truth for what
//! goes over the wire: src/generated/wire.ts. A test fails when the committed file is not what
//! this writes (see `generated_typescript_is_current`).

use crate::api_params::ApiParams;
use crate::captcha_type::CaptchaType;
use crate::client::{BlockRuleType, ModeEnum, ScheduledTaskNames, ScheduledTaskStatus, TestSiteKeyMode, Tier};
use crate::datasets::{
    CaptchaItemTypes, CaptchaStates, CaptchaStatus, CaptchaTypes, DappPayee, GovernanceStatus, InputMethod, StoredStatusNames,
};
use crate::decision_machine::{
    DecisionMachineDecision, DecisionMachineKind, DecisionMachineLanguage, DecisionMachineRuntime, DecisionMachineScope,
};
use crate::provider_api::{AdminApiPaths, ClientApiPaths, PublicApiPaths};
use crate::reasons::{FrictionlessReason, ResultReason};
use crate::sanitise::InputLimits;
use crate::settings::{ContextType, DeviceType, EncodingType, IPValidationAction, TrafficFilterAction};
use crate::stored::{CaptchaLabel, IpAddressType, SimdReadingsStage};
use crate::timeouts::{TIMEOUTS, TIMEOUT_DOCS};

/// A TS string enum: its name, doc comment and members, `(key, value, doc)` in declaration
/// order.
struct TsEnum {
    name: &'static str,
    doc: &'static str,
    members: Vec<(&'static str, &'static str, &'static str)>,
}

macro_rules! ts_enum {
    ($name:ident) => {
        TsEnum {
            name: stringify!($name),
            doc: $name::TS_DOC,
            members: $name::TS_KEYS
                .iter()
                .zip($name::ALL.iter())
                .zip($name::TS_DOCS.iter())
                .map(|((key, member), doc)| (*key, member.as_str(), *doc))
                .collect(),
        }
    };
}

/// Every enum the TS spells `export enum`, grouped by the TS module that declared it.
fn enums() -> Vec<TsEnum> {
    vec![
        TsEnum {
            name: "ApiParams",
            doc: "",
            members: ApiParams::ENTRIES.iter().zip(ApiParams::TS_DOCS).map(|((key, value), doc)| (*key, *value, doc)).collect(),
        },
        ts_enum!(CaptchaType),
        ts_enum!(ContextType),
        ts_enum!(DeviceType),
        ts_enum!(EncodingType),
        ts_enum!(IPValidationAction),
        ts_enum!(TrafficFilterAction),
        ts_enum!(TestSiteKeyMode),
        ts_enum!(Tier),
        ts_enum!(ModeEnum),
        ts_enum!(CaptchaTypes),
        ts_enum!(CaptchaItemTypes),
        ts_enum!(CaptchaStates),
        ts_enum!(InputMethod),
        ts_enum!(CaptchaStatus),
        ts_enum!(StoredStatusNames),
        ts_enum!(GovernanceStatus),
        ts_enum!(DappPayee),
        ts_enum!(DecisionMachineRuntime),
        ts_enum!(DecisionMachineKind),
        ts_enum!(DecisionMachineScope),
        ts_enum!(DecisionMachineLanguage),
        ts_enum!(DecisionMachineDecision),
        ts_enum!(ClientApiPaths),
        ts_enum!(PublicApiPaths),
        ts_enum!(AdminApiPaths),
        ts_enum!(BlockRuleType),
        ts_enum!(IpAddressType),
        ts_enum!(CaptchaLabel),
        ts_enum!(SimdReadingsStage),
        ts_enum!(FrictionlessReason),
        ts_enum!(ResultReason),
        ts_enum!(ScheduledTaskNames),
        ts_enum!(ScheduledTaskStatus),
    ]
}

/// A doc comment as JSDoc at `indent`. Each line of a Rust doc comment starts with the space
/// after `///`.
fn jsdoc(doc: &str, indent: &str) -> String {
    let lines: Vec<&str> = doc.lines().map(|line| line.strip_prefix(' ').unwrap_or(line)).collect();
    match lines.as_slice() {
        [] => String::new(),
        [line] => format!("{indent}/** {line} */\n"),
        lines => {
            let body: String = lines
                .iter()
                .map(|line| if line.is_empty() { format!("{indent} *\n") } else { format!("{indent} * {line}\n") })
                .collect();
            format!("{indent}/**\n{body}{indent} */\n")
        }
    }
}

/// A string as a TS double-quoted literal.
fn quoted(text: &str) -> String {
    serde_json::to_string(text).expect("a string serialises")
}

/// A member name as TS writes it: bare when it is an identifier, quoted otherwise.
fn key(name: &str) -> String {
    let mut chars = name.chars();
    let identifier: bool = chars.next().is_some_and(|first| first.is_ascii_alphabetic() || first == '_' || first == '$')
        && chars.all(|rest| rest.is_ascii_alphanumeric() || rest == '_' || rest == '$');
    if identifier {
        name.to_string()
    } else {
        quoted(name)
    }
}

const LICENSE: &str = "// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
";

/// src/generated/wire.ts.
pub fn wire_module() -> String {
    let mut out: String = String::from(LICENSE);
    out.push_str(
        "\n// Generated from the Rust in packages/types/rust by `PROSOPO_WRITE_TS=1 cargo test -p prosopo-types\n\
         // generated_typescript_is_current`. Do not edit: change the Rust and generate it again.\n",
    );
    for ts_enum in enums() {
        out.push('\n');
        out.push_str(&jsdoc(ts_enum.doc, ""));
        out.push_str(&format!("export enum {} {{\n", ts_enum.name));
        for (name, value, doc) in &ts_enum.members {
            out.push_str(&jsdoc(doc, "\t"));
            out.push_str(&format!("\t{} = {},\n", key(name), quoted(value)));
        }
        out.push_str("}\n");
    }
    out.push_str("\nexport const INPUT_LIMITS = {\n");
    for ((name, limit), doc) in InputLimits::ENTRIES.iter().zip(InputLimits::DOCS) {
        out.push_str(&format!("\t/** {doc} */\n\t{name}: {limit},\n"));
    }
    out.push_str("} as const;\n\n");
    for (name, milliseconds) in TIMEOUTS {
        let doc: &str = TIMEOUT_DOCS.iter().find(|(documented, _)| *documented == name).map(|(_, doc)| *doc).unwrap_or_default();
        out.push_str(&jsdoc(doc, ""));
        out.push_str(&format!("export const {name} = {milliseconds};\n"));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::wire_module;

    const WIRE_TS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/src/generated/wire.ts");

    /// Run with `PROSOPO_WRITE_TS=1` to write the file instead.
    #[test]
    fn generated_typescript_is_current() {
        let generated: String = wire_module();
        if std::env::var("PROSOPO_WRITE_TS").is_ok() {
            std::fs::write(WIRE_TS, &generated).expect("writes src/generated/wire.ts");
            return;
        }
        let committed: String = std::fs::read_to_string(WIRE_TS).unwrap_or_default();
        assert!(
            committed == generated,
            "src/generated/wire.ts is not what the Rust generates; run PROSOPO_WRITE_TS=1 cargo test -p prosopo-types generated_typescript_is_current"
        );
    }
}
