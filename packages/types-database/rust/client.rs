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

//! The client schemas (src/types/client.ts): the site settings stored on a provider's client
//! record, and the portal's user and account documents a provider reads.

use crate::number::{js_number, json_to_bson};
use crate::schema::{
    array, boolean, date, document_array, field, map_of, mixed, nested, number, string, subdocument, Field, Kind,
    Schema,
};
use bson::Bson;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::settings::{
    frictionless_threshold_default, frictionless_types_default, TrafficFilterAction,
    ABUSE_SCORE_THRESHOLD_DEFAULT, ABUSE_SCORE_THRESHOLD_EXCEED_ACTION_DEFAULT, CAPTCHA_TYPE_DEFAULT,
    CITY_CHANGE_ACTION_DEFAULT, COUNTRY_CHANGE_ACTION_DEFAULT, DISTANCE_EXCEED_ACTION_DEFAULT,
    DISTANCE_THRESHOLD_KM_DEFAULT, HONEYPOT_ENCODING_TYPE_DEFAULT, IMAGE_MAX_ROUNDS_DEFAULT, IMAGE_MIN_ROUNDS_DEFAULT,
    IMAGE_THRESHOLD_DEFAULT, ISP_CHANGE_ACTION_DEFAULT, MAX_PAD_BYTES, POW_DIFFICULTY_DEFAULT,
    PUZZLE_MAX_DIFFICULTY_MAX, REQUIRE_ALL_CONDITIONS_DEFAULT, TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT,
};
use prosopo_types::timeouts::{DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT, DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT};
use std::sync::LazyLock;


fn country_override_actions() -> Vec<Field> {
    vec![
        field("countryChangeAction", mixed()),
        field("cityChangeAction", mixed()),
        field("ispChangeAction", mixed()),
        field("distanceExceedAction", mixed()),
        field("abuseScoreExceedAction", mixed()),
    ]
}

static COUNTRY_OVERRIDE: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        nested("actions", country_override_actions()),
        field("distanceThresholdKm", number().min(0.0)),
        field("abuseScoreThreshold", number().min(0.0)),
        field("requireAllConditions", boolean()),
    ])
});

/// `IPValidationRulesSchema`.
pub static IP_VALIDATION_RULES: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("enabled", boolean().default_value(|| Bson::Boolean(false)).required()),
        nested(
            "actions",
            vec![
                field(
                    "countryChangeAction",
                    mixed().default_fn(|_| Bson::from(COUNTRY_CHANGE_ACTION_DEFAULT.as_str())),
                ),
                field("cityChangeAction", mixed().default_fn(|_| Bson::from(CITY_CHANGE_ACTION_DEFAULT.as_str()))),
                field("ispChangeAction", mixed().default_fn(|_| Bson::from(ISP_CHANGE_ACTION_DEFAULT.as_str()))),
                field(
                    "distanceExceedAction",
                    mixed().default_fn(|_| Bson::from(DISTANCE_EXCEED_ACTION_DEFAULT.as_str())),
                ),
                field(
                    "abuseScoreExceedAction",
                    mixed().default_fn(|_| Bson::from(ABUSE_SCORE_THRESHOLD_EXCEED_ACTION_DEFAULT.as_str())),
                ),
            ],
        ),
        field(
            "distanceThresholdKm",
            number().min(0.0).default_value(|| js_number(DISTANCE_THRESHOLD_KM_DEFAULT)),
        ),
        field(
            "abuseScoreThreshold",
            number().min(0.0).default_value(|| js_number(ABUSE_SCORE_THRESHOLD_DEFAULT)),
        ),
        field(
            "requireAllConditions",
            boolean().default_value(|| Bson::Boolean(REQUIRE_ALL_CONDITIONS_DEFAULT)),
        ),
        field("forceConsistentIp", boolean().default_value(|| Bson::Boolean(false))),
        field("countryOverrides", map_of(&COUNTRY_OVERRIDE).default_undefined()),
    ])
});

static PIECE_SCALE: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("min", number().min(0.05).max(0.95)),
        field("max", number().min(0.05).max(0.95)),
    ])
    .without_id()
});

/// `PuzzleRenderSettingsSchema`.
pub static PUZZLE_RENDER_SETTINGS: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("decoyCount", number().min(0.0).max(200.0)),
        field("decoyEdgeDarkness", number().min(0.0).max(40.0)),
        field("decoyBodyBrightness", number().min(-20.0).max(20.0)),
        field("decoyHoleDarken", number().min(0.0).max(1.0)),
        field("holeDarken", number().min(0.0).max(1.0)),
        field("pieceScale", subdocument(&PIECE_SCALE)),
    ])
    .without_id()
});

/// `AudioRenderSettingsSchema`.
pub static AUDIO_RENDER_SETTINGS: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("digitCount", number().min(3.0).max(8.0)),
        field("noiseSnrDb", number().min(3.0).max(60.0)),
        field("babbleGain", number().min(0.0).max(0.6)),
        field("babbleVoices", number().min(0.0).max(4.0)),
        field("reverbMix", number().min(0.0).max(0.6)),
        field("gapMs", number().min(0.0).max(1500.0)),
    ])
    .without_id()
});

/// `SELECTABLE_CAPTCHA_TYPES`: every captcha type but audio.
fn selectable_captcha_types() -> Vec<&'static str> {
    CaptchaType::ALL
        .iter()
        .filter(|kind| **kind != CaptchaType::Audio)
        .map(|kind| kind.as_str())
        .collect()
}

/// `TrafficCategoryPolicySchema`.
pub static TRAFFIC_CATEGORY_POLICY: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field(
            "action",
            string().one_of(TrafficFilterAction::ALL.iter().map(|action| action.as_str())).required(),
        ),
        field("captchaType", string().one_of(selectable_captcha_types())),
        field("powDifficulty", number()),
        field("solvedImagesCount", number()),
        field("puzzleTolerance", number()),
        field("padBytes", number().min(0.0).max(MAX_PAD_BYTES)),
        field("iconOrderTolerance", number()),
        field("iconOrder", mixed()),
        field("puzzle", subdocument(&PUZZLE_RENDER_SETTINGS)),
        field("audio", subdocument(&AUDIO_RENDER_SETTINGS)),
    ])
    .without_id()
});

static FRICTIONLESS_TYPES: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("image", boolean().default_value(|| Bson::Boolean(true))),
        field("puzzle", boolean().default_value(|| Bson::Boolean(true))),
        field("iconOrder", boolean().default_value(|| Bson::Boolean(true))),
    ])
    .without_id()
});

static CAPTCHA_TYPE_FEATURE_FLAGS: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![field("puzzle", boolean()), field("iconOrder", boolean()), field("audio", boolean())]).without_id()
});

static WIDGET_FEATURE_FLAGS: LazyLock<Schema> =
    LazyLock::new(|| Schema::new(vec![field("puzzleImageSwitch", boolean())]).without_id());

fn traffic_category() -> crate::schema::Path {
    subdocument(&TRAFFIC_CATEGORY_POLICY)
}

/// `UserSettingsSchema`.
pub static USER_SETTINGS: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field(
            "captchaType",
            string()
                .one_of(selectable_captcha_types())
                .default_value(|| Bson::from(CAPTCHA_TYPE_DEFAULT.as_str())),
        ),
        field(
            "verifiedTimeout",
            number().default_value(|| js_number(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT as f64)),
        ),
        field(
            "solutionTimeout",
            number().default_value(|| js_number(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT as f64)),
        ),
        field(
            "frictionlessThreshold",
            mixed().default_fn(|_| json_to_bson(&frictionless_threshold_default())),
        ),
        field(
            "frictionlessTypes",
            subdocument(&FRICTIONLESS_TYPES).default_fn(|_| json_to_bson(&frictionless_types_default())),
        ),
        field("captchaTypeFeatureFlags", subdocument(&CAPTCHA_TYPE_FEATURE_FLAGS)),
        field("widgetFeatureFlags", subdocument(&WIDGET_FEATURE_FLAGS)),
        field("powDifficulty", number().default_value(|| js_number(POW_DIFFICULTY_DEFAULT))),
        field("imageThreshold", number().default_value(|| js_number(IMAGE_THRESHOLD_DEFAULT))),
        field("imageMaxRounds", number().default_value(|| js_number(IMAGE_MAX_ROUNDS_DEFAULT))),
        field("imageMinRounds", number().default_value(|| js_number(IMAGE_MIN_ROUNDS_DEFAULT))),
        field("puzzleTolerance", number()),
        field("iconOrderTolerance", number()),
        field("iconOrder", mixed()),
        field("puzzleMaxDifficulty", number().min(0.0).max(PUZZLE_MAX_DIFFICULTY_MAX)),
        field("puzzle", subdocument(&PUZZLE_RENDER_SETTINGS)),
        field("audio", subdocument(&AUDIO_RENDER_SETTINGS)),
        field("audioAccessibilityEnabled", boolean()),
        field("ipValidationRules", subdocument(&IP_VALIDATION_RULES)),
        field("domains", array(Kind::String).default_value(|| Bson::Array(Vec::new()))),
        field("disallowWebView", boolean().default_value(|| Bson::Boolean(false))),
        field("spamEmailDomainCheckEnabled", boolean().default_value(|| Bson::Boolean(false))),
        field("autoBanScoreThreshold", number().min(0.0)),
        nested(
            "spamFilter",
            vec![
                field("enabled", boolean().default_value(|| Bson::Boolean(false))),
                nested(
                    "emailRules",
                    vec![
                        field("enabled", boolean().default_value(|| Bson::Boolean(false))),
                        field("maxLocalPartDots", number()),
                        field("normaliseGmail", boolean().default_value(|| Bson::Boolean(false))),
                        field("useDefaultPatterns", boolean().default_value(|| Bson::Boolean(false))),
                        field("customRegexBlocklist", array(Kind::String).default_value(|| Bson::Array(Vec::new()))),
                        field("maxEmailSubmissionCount", number().min(1.0)),
                    ],
                ),
            ],
        ),
        nested(
            "trafficFilter",
            vec![
                field("vpn", traffic_category()),
                field("proxy", traffic_category()),
                field("tor", traffic_category()),
                field("abuser", traffic_category()),
                field(
                    "abuserScoreThreshold",
                    number()
                        .min(0.0)
                        .max(1.0)
                        .default_value(|| js_number(TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT)),
                ),
                field("datacenter", traffic_category()),
                field("datacenterNameAllowlist", array(Kind::String)),
                field("datacenterNameDenylist", array(Kind::String)),
                field("skipExtrasOnValidDnsPath", boolean().default_value(|| Bson::Boolean(true))),
                field("mobile", traffic_category()),
                field("satellite", traffic_category()),
                field("crawler", traffic_category()),
            ],
        ),
        field("storeMetadata", boolean().default_value(|| Bson::Boolean(false))),
        nested(
            "honeypot",
            vec![
                field("enabled", boolean().default_value(|| Bson::Boolean(false))),
                field("question", string()),
                field(
                    "encodingType",
                    string()
                        .one_of(["morse", "semaphore"])
                        .default_value(|| Bson::from(HONEYPOT_ENCODING_TYPE_DEFAULT.as_str())),
                ),
            ],
        ),
        field("allowAgents", boolean()),
        field("assetOrigin", string()),
        field("clientUrl", string()),
    ])
});

/// `UserDataSchema`: the client database's `users`.
pub static USER_DATA: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("email", string()),
        field("name", string()),
        field("account", string()),
        field("url", string()),
        field("mnemonic", string()),
        field("createdAt", date()),
        field("activated", boolean()),
        field("tier", string()),
        field("settings", subdocument(&USER_SETTINGS)),
        field("updatedAtTimestamp", date()),
    ])
});

static ACCOUNT_USER: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("email", string()),
        field("name", string()),
        field("role", string()),
        field("createdAt", number()),
        field("updatedAt", number()),
        field("status", string()),
    ])
});

static ACCOUNT_SITE: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("name", string()),
        field("siteKey", string()),
        field("secretKey", string()),
        nested(
            "settings",
            vec![
                field("domains", array(Kind::String)),
                field("powDifficulty", number()),
                field("captchaType", string()),
                field("frictionlessThreshold", mixed()),
                field("frictionlessTypes", mixed()),
                field("captchaTypeFeatureFlags", mixed()),
                field("widgetFeatureFlags", mixed()),
                field("ipValidationRules", subdocument(&IP_VALIDATION_RULES)),
            ],
        ),
        field("createdAt", number()),
        field("updatedAt", number()),
        field("active", boolean()),
    ])
});

/// `AccountSchema`: the portal's account documents.
pub static ACCOUNT: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("createdAt", number()),
        field("updatedAt", number()),
        field("signupEmail", string()),
        field("tier", string()),
        field("tierRequestQuota", number()),
        field("marketingPreferences", boolean()),
        field("users", document_array(&ACCOUNT_USER)),
        field("sites", document_array(&ACCOUNT_SITE)),
        field("deletedUsers", array(Kind::Mixed)),
    ])
});
