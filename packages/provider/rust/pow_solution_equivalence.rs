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

//! The PoW solution checks against pow-solution-vectors.json, which
//! equivalence/generate-pow-solution.ts writes from the TS on Node 24.

use crate::device_platform::derive_platform;
use crate::mobile_signals::MobileSignals;
use crate::tasks::captcha_type_selection::coerce_to_enabled_captcha_type;
use crate::tasks::pow::{check_pow_signature, is_coords_all_zero, validate_solution, PowSignatureError};
use crate::tasks::puzzle::PuzzleDifficultySamplers;
use crate::tasks::puzzle::OsSamplerRandom;
use bson::Document;
use prosopo_captcha_severity::PUZZLE_DIFFICULTY_LEVELS;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::settings::AllowedTypes;
use serde_json::{json, Value};
use std::sync::{Arc, LazyLock};

static VECTORS: LazyLock<Value> = LazyLock::new(|| serde_json::from_str(include_str!("equivalence/pow-solution-vectors.json")).expect("pow-solution-vectors.json parses"));

fn cases(section: &str) -> &'static [Value] {
    let cases: &[Value] = VECTORS[section].as_array().expect("a section");
    assert!(!cases.is_empty(), "{section} has cases");
    cases
}

#[test]
fn equivalence_validate_solution() {
    for case in cases("solutions") {
        let actual: bool = validate_solution(case["nonce"].as_f64().expect("nonce"), case["challenge"].as_str().expect("challenge"), case["difficulty"].as_f64().expect("difficulty")).expect("checks");
        assert_eq!(Some(actual), case["result"]["ok"].as_bool(), "{case}");
    }
}

#[test]
fn equivalence_check_pow_signature() {
    for case in cases("signatures") {
        let text = |key: &str| case[key].as_str().expect("a string");
        let actual: Value = match check_pow_signature(text("message"), text("signature"), text("address"), case["signatureType"].as_str()) {
            Ok(()) => json!({}),
            Err(PowSignatureError::Invalid(error)) => json!({
                "key": error.translation_key(),
                "context": error.context().map(|context| context.to_json()),
            }),
            Err(PowSignatureError::Unreadable(message)) => json!({ "thrown": message }),
        };
        assert_eq!(actual, case["result"], "{case}");
    }
}

#[test]
fn equivalence_is_coords_all_zero() {
    for case in cases("coords") {
        let coords: Option<Vec<Vec<[f64; 2]>>> = serde_json::from_value(case["coords"].clone()).expect("coords");
        assert_eq!(Some(is_coords_all_zero(coords.as_deref())), case["result"].as_bool(), "{case}");
    }
}

#[test]
fn equivalence_derive_platform() {
    for case in cases("platforms") {
        let signals: &Value = &case["signals"];
        let headers: Option<Document> = signals.get("headers").map(|headers| bson::serialize_to_document(headers).expect("headers"));
        let platform = derive_platform(
            case["userAgent"].as_str().expect("user agent"),
            case["webView"].as_bool().expect("web view"),
            MobileSignals {
                headers: headers.as_ref(),
                carrier_network: signals.get("carrierNetwork").and_then(Value::as_bool),
                tcp_mss: signals.get("tcpMss").and_then(Value::as_f64),
                device_capability: signals.get("deviceCapability").and_then(Value::as_str),
                touch_event_count: signals.get("touchEventCount").and_then(Value::as_f64),
                ..MobileSignals::default()
            },
        );
        let actual: Value = json!({ "isApple": platform.is_apple, "isWebView": platform.is_web_view, "isMobile": platform.is_mobile });
        assert_eq!(actual, case["result"], "{case}");
    }
}

#[test]
fn equivalence_coerce_to_enabled_captcha_type() {
    for case in cases("coercions") {
        let requested: CaptchaType = serde_json::from_value(case["requested"].clone()).expect("a type");
        let allowed: Option<AllowedTypes> = case["allowed"].as_object().map(|allowed| AllowedTypes {
            image: allowed["image"].as_bool().expect("image"),
            puzzle: allowed["puzzle"].as_bool().expect("puzzle"),
            icon_order: allowed["iconOrder"].as_bool().expect("iconOrder"),
        });
        assert_eq!(json!(coerce_to_enabled_captcha_type(requested, allowed, None).as_str()), case["result"], "{case}");
    }
}

#[test]
fn equivalence_sample_puzzle_difficulty() {
    let samplers: PuzzleDifficultySamplers = PuzzleDifficultySamplers::new(Arc::new(OsSamplerRandom));
    for case in cases("difficulties") {
        let level: f64 = match &case["level"] {
            Value::String(text) if text == "NaN" => f64::NAN,
            Value::String(text) if text == "Infinity" => f64::INFINITY,
            other => other.as_f64().expect("a level"),
        };
        let hole_darken: f64 = case["holeDarken"].as_f64().expect("hole darken");
        let sampled = samplers.sample(level, hole_darken, case["maxLevel"].as_f64());
        let expected: &Value = &case["result"];
        assert_eq!(Some(sampled.level), expected["level"].as_f64(), "{case}");
        assert_eq!((Some(sampled.piece_scale.min), Some(sampled.piece_scale.max)), (expected["pieceScale"]["min"].as_f64(), expected["pieceScale"]["max"].as_f64()), "{case}");
        if let Some(floor) = expected["decoyHoleDarken"].as_f64() {
            assert_eq!(sampled.decoy_hole_darken, floor, "{case}");
        }
        let band = &PUZZLE_DIFFICULTY_LEVELS[sampled.level as usize];
        assert!((band.tolerance.min..=band.tolerance.max).contains(&sampled.tolerance), "{case}");
        assert!((band.decoy_count.min..=band.decoy_count.max).contains(&sampled.decoy_count), "{case}");
        assert!((band.decoy_edge_darkness.min..=band.decoy_edge_darkness.max).contains(&sampled.decoy_edge_darkness), "{case}");
        assert_eq!(sampled.tolerance.fract(), 0.0);
    }
}
