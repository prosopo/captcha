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

//! The provider database's schemas (src/types/provider.ts).

use crate::client::USER_SETTINGS;
use crate::schema::{
    array, boolean, date, document_array, field, ip_half, mixed, nested, number, string, subdocument,
    Field, IndexOptions, Kind, Path, Schema,
};
use bson::{doc, Bson};
use prosopo_locale::translation_keys;
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::{ModeEnum, ScheduledTaskNames, ScheduledTaskStatus, Tier};
use prosopo_types::datasets::{CaptchaStatus, InputMethod};
use prosopo_types::decision_machine::{
    DecisionMachineKind, DecisionMachineLanguage, DecisionMachineRuntime, DecisionMachineScope,
};
use prosopo_types::settings::ContextType;
use prosopo_types::stored::{CaptchaLabel, IpAddressType};
use std::sync::LazyLock;

const ONE_HOUR: i64 = 60 * 60;
const ONE_DAY: i64 = ONE_HOUR * 24;
const ONE_WEEK: i64 = ONE_DAY * 7;
const ONE_MONTH: i64 = ONE_WEEK * 4;

fn captcha_statuses() -> Vec<&'static str> {
    CaptchaStatus::ALL.iter().map(|status| status.as_str()).collect()
}

fn captcha_labels() -> Vec<&'static str> {
    CaptchaLabel::ALL.iter().map(|label| label.as_str()).collect()
}

/// `CompositeIpAddressRecordSchemaObj`: the fields, spread into a parent or a schema of its own.
pub(crate) fn composite_ip_fields() -> Vec<Field> {
    vec![
        field("lower", ip_half().required()),
        field("upper", ip_half()),
        field(
            "type",
            string().one_of(IpAddressType::ALL.iter().map(|kind| kind.as_str())).required(),
        ),
    ]
}

static COMPOSITE_IP: LazyLock<Schema> = LazyLock::new(|| Schema::new(composite_ip_fields()).without_id());

static METADATA: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![field("email", string()), field("emailNormalised", string())]).without_id()
});

/// `ClientMetaDataRecordSchemaObj` as its own schema.
static CLIENT_META_DATA: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![field("hp", string()), field("clientSessionId", string())]).without_id()
});

/// `behavioralDataPacked: { type: { c1, c2, c3, c4, d } }`: an inline schema, so a subdocument.
static BEHAVIORAL_DATA_PACKED: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("c1", array(Kind::Mixed).required()),
        field("c2", array(Kind::Mixed).required()),
        field("c3", array(Kind::Mixed).required()),
        field("c4", array(Kind::Mixed)),
        field("d", string().required()),
    ])
});

fn result_fields() -> Field {
    nested(
        "result",
        vec![
            field("status", string().one_of(captcha_statuses()).required()),
            field("reason", string().one_of(translation_keys().iter().cloned())),
            field("error", string()),
        ],
    )
}

/// `[[[Number]]]`.
fn coords() -> Path {
    array(Kind::Array(Box::new(Kind::Array(Box::new(Kind::Number)))))
}

static ITEM: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("hash", string().required()),
        field("data", string().required()),
        field("type", string().required()),
    ])
    .without_id()
});

/// `ClientRecordSchema`.
pub static CLIENT_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("account", string()),
        field("settings", subdocument(&USER_SETTINGS)),
        field("tier", string().one_of(Tier::ALL.iter().map(|tier| tier.as_str())).required()),
    ])
    .index(&[("account", 1)], IndexOptions::default())
});

/// `CaptchaRecordSchema`.
pub static CAPTCHA_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("captchaId", string().required()),
        field("captchaContentId", string().required()),
        field("assetURI", string()),
        field("datasetId", string().required()),
        field("datasetContentId", string().required()),
        field("solved", boolean().required()),
        field("target", string().required()),
        field("salt", string().required()),
        field("randomKey", number()),
        field("items", document_array(&ITEM).required()),
    ])
    .index(&[("captchaId", 1)], IndexOptions::default())
    .index(&[("datasetId", 1)], IndexOptions::default())
    .index(&[("datasetId", 1), ("solved", 1)], IndexOptions::default())
    .index(&[("datasetId", 1), ("solved", 1), ("randomKey", 1)], IndexOptions::default())
});

/// The partial indexes every captcha record carries.
fn pending_stage_partial() -> IndexOptions {
    IndexOptions::named("pendingStage_partial").partial(doc! { "pendingStage": true })
}

fn spam_email_count_partial() -> IndexOptions {
    IndexOptions::named("spamEmailCount_partial")
        .partial(doc! { "metadata.emailNormalised": { "$exists": true }, "serverChecked": true })
}

fn blocked_partial() -> IndexOptions {
    IndexOptions::named("blocked_partial").partial(doc! { "blocked": true })
}

/// The fields every challenge record starts with, up to and including `providedIp`.
fn challenge_head() -> Vec<Field> {
    vec![
        field("challenge", string().required()),
        field("dappAccount", string().required()),
        field("userAccount", string().required()),
        field("requestedAtTimestamp", date().required()),
        field("submittedAtTimestamp", date()),
        field("verifiedAtTimestamp", date()),
        field("failedAtTimestamp", date()),
        field("lastUpdatedTimestamp", date()),
        result_fields(),
    ]
}

/// From `ipAddress` to `serverChecked`, shared by every captcha record.
fn identity_fields() -> Vec<Field> {
    vec![
        nested("ipAddress", composite_ip_fields()),
        field("providedIp", subdocument(&COMPOSITE_IP)),
        field("metadata", subdocument(&METADATA)),
        field("clientMetaData", subdocument(&CLIENT_META_DATA)),
        field("headers", mixed().required()),
        field("ja4", string().required()),
    ]
}

/// From `storedAtTimestamp` to `coords`, shared by the challenge records.
fn stored_tail() -> Vec<Field> {
    vec![
        field("storedAtTimestamp", date().expires(ONE_MONTH)),
        field("pendingStage", boolean()),
        field("blocked", boolean()),
        field("ipInfo", mixed()),
        field("parsedUserAgentInfo", mixed()),
        field("sessionId", string()),
        field("coords", coords()),
        field("deviceCapability", string()),
        field("behavioralDataPacked", subdocument(&BEHAVIORAL_DATA_PACKED)),
    ]
}

fn label_fields() -> Vec<Field> {
    vec![
        field("label", string().one_of(captcha_labels())),
        field("labelReason", string()),
        field("labelledBy", string()),
        field("labelledAt", date()),
    ]
}

pub(crate) fn pow_fields() -> Vec<Field> {
    let mut fields: Vec<Field> = challenge_head();
    fields.push(field("difficulty", number().required()));
    fields.extend(identity_fields());
    fields.push(field("userSignature", string()));
    fields.push(field("userSubmitted", boolean().required()));
    fields.push(field("serverChecked", boolean().required()));
    fields.extend(stored_tail());
    fields.push(field("providerSignature", string().required()));
    fields.extend(label_fields());
    fields
}

/// `PoWCaptchaRecordSchema`.
pub static POW_CAPTCHA_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(pow_fields())
        .index(&[("challenge", 1)], IndexOptions::default())
        .index(&[("label", 1), ("dappAccount", 1)], IndexOptions::default())
        .index(&[("lastUpdatedTimestamp", 1)], IndexOptions::default())
        .index(&[("dappAccount", 1), ("requestedAtTimestamp", 1)], IndexOptions::default())
        .index(&[("ipAddress.lower", 1)], IndexOptions::default())
        .index(&[("ipAddress.upper", 1)], IndexOptions::default())
        .index(&[("result.reason", 1)], IndexOptions::default())
        .index(&[("ipInfo.countryCode", 1)], IndexOptions::default())
        .index(&[("ipInfo.isVPN", 1)], IndexOptions::default())
        .index(&[("ipInfo", 1)], IndexOptions::default())
        .index(&[("parsedUserAgentInfo", 1)], IndexOptions::default())
        .index(
            &[("dappAccount", 1), ("metadata.emailNormalised", 1), ("serverChecked", 1)],
            spam_email_count_partial(),
        )
        .index(&[("pendingStage", 1), ("_id", 1)], pending_stage_partial())
        .index(&[("blocked", 1)], blocked_partial())
});

/// `interactiveCaptchaRecordFields`.
fn interactive_fields() -> Vec<Field> {
    let mut fields: Vec<Field> = challenge_head();
    fields.extend(identity_fields());
    fields.push(field("userSignature", string()));
    fields.push(field("userSubmitted", boolean().required()));
    fields.push(field("serverChecked", boolean().required()));
    fields.extend(stored_tail());
    fields.push(field("providerSignature", string().required()));
    fields
}

static POINTER_EVENT: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("x", number().required()),
        field("y", number().required()),
        field("t", number().required()),
    ])
    .without_id()
});

static PUZZLE_RENDER: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("level", number()),
        field("pieceSize", number().required()),
        nested(
            "geometry",
            vec![
                field("width", number().required()),
                field("height", number().required()),
                field("notchSize", number().required()),
            ],
        ),
        nested(
            "settings",
            vec![
                field("decoyCount", number().required()),
                field("decoyEdgeDarkness", number().required()),
                field("decoyBodyBrightness", number().required()),
                field("holeDarken", number().required()),
                field("decoyHoleDarken", number().required()),
            ],
        ),
        field("backgroundSeed", string().required()),
        field("renderSeed", string().required()),
    ])
    .without_id()
});

pub(crate) fn puzzle_fields() -> Vec<Field> {
    let mut fields: Vec<Field> = interactive_fields();
    fields.extend([
        field("targetX", number().required()),
        field("targetY", number().required()),
        field("originX", number().required()),
        field("originY", number().required()),
        field("tolerance", number().required()),
        field("render", subdocument(&PUZZLE_RENDER)),
        field("puzzleEvents", document_array(&POINTER_EVENT)),
    ]);
    fields
}

static ICON_TARGET: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("x", number().required()),
        field("y", number().required()),
        field("size", number().required()),
        field("kind", string().required()),
    ])
    .without_id()
});

static ICON_CLICK: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![field("x", number().required()), field("y", number().required())]).without_id()
});

pub(crate) fn icon_order_fields() -> Vec<Field> {
    let mut fields: Vec<Field> = interactive_fields();
    fields.extend([
        field("tolerance", number().required()),
        field("targets", document_array(&ICON_TARGET).required()),
        field("clicks", document_array(&ICON_CLICK)),
        field("iconOrderEvents", document_array(&POINTER_EVENT)),
    ]);
    fields
}

static AUDIO_EVENT: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![field("kind", string().required()), field("t", number().required())]).without_id()
});

pub(crate) fn audio_fields() -> Vec<Field> {
    let mut fields: Vec<Field> = interactive_fields();
    fields.extend([
        field("answer", string().required()),
        field("submittedAnswer", string()),
        field("replays", number()),
        field("audioEvents", document_array(&AUDIO_EVENT)),
    ]);
    fields
}

/// `indexInteractiveCaptchaRecord`.
fn index_interactive(schema: Schema) -> Schema {
    schema
        .index(&[("challenge", 1)], IndexOptions::default())
        .index(&[("lastUpdatedTimestamp", 1)], IndexOptions::default())
        .index(&[("dappAccount", 1), ("requestedAtTimestamp", 1)], IndexOptions::default())
        .index(&[("ipAddress.lower", 1)], IndexOptions::default())
        .index(&[("ipAddress.upper", 1)], IndexOptions::default())
        .index(&[("result.reason", 1)], IndexOptions::default())
        .index(&[("ipInfo.countryCode", 1)], IndexOptions::default())
        .index(&[("ipInfo.isVPN", 1)], IndexOptions::default())
        .index(&[("ipInfo", 1)], IndexOptions::default())
        .index(&[("parsedUserAgentInfo", 1)], IndexOptions::default())
        .index(&[("pendingStage", 1), ("_id", 1)], pending_stage_partial())
        .index(
            &[("dappAccount", 1), ("metadata.emailNormalised", 1), ("serverChecked", 1)],
            spam_email_count_partial(),
        )
        .index(&[("blocked", 1)], blocked_partial())
}

/// `PuzzleCaptchaRecordSchema`.
pub static PUZZLE_CAPTCHA_RECORD: LazyLock<Schema> = LazyLock::new(|| index_interactive(Schema::new(puzzle_fields())));

/// `IconOrderCaptchaRecordSchema`.
pub static ICON_ORDER_CAPTCHA_RECORD: LazyLock<Schema> =
    LazyLock::new(|| index_interactive(Schema::new(icon_order_fields())));

/// `AudioCaptchaRecordSchema`.
pub static AUDIO_CAPTCHA_RECORD: LazyLock<Schema> = LazyLock::new(|| index_interactive(Schema::new(audio_fields())));

pub(crate) fn user_commitment_fields() -> Vec<Field> {
    let mut fields: Vec<Field> = vec![
        field("userAccount", string().required()),
        field("dappAccount", string().required()),
        field("providerAccount", string().required()),
        field("datasetId", string().required()),
        field("id", string().required()),
        result_fields(),
    ];
    fields.extend(identity_fields());
    fields.extend([
        field("userSignature", string().required()),
        field("userSubmitted", boolean().required()),
        field("serverChecked", boolean().required()),
        field("storedAtTimestamp", date().expires(ONE_MONTH)),
        field("requestedAtTimestamp", date().required()),
        field("submittedAtTimestamp", date()),
        field("verifiedAtTimestamp", date()),
        field("failedAtTimestamp", date()),
        field("lastUpdatedTimestamp", date()),
        field("pendingStage", boolean()),
        field("blocked", boolean()),
        field("ipInfo", mixed()),
        field("parsedUserAgentInfo", mixed()),
        field("sessionId", string()),
        field("coords", coords()),
        field(
            "inputMethods",
            array(Kind::Array(Box::new(Kind::String)))
                .one_of(InputMethod::ALL.iter().map(|method| method.as_str()))
                .default_undefined(),
        ),
        field("pending", boolean().required()),
        field("salt", string().required()),
        field("requestHash", string().required()),
        field("deadlineTimestamp", date().required()),
        field("threshold", number().required()),
        field("deviceCapability", string()),
        field("behavioralDataPacked", subdocument(&BEHAVIORAL_DATA_PACKED)),
    ]);
    fields.extend(label_fields());
    fields
}

/// `UserCommitmentRecordSchema`.
pub static USER_COMMITMENT_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(user_commitment_fields())
        .index(&[("id", -1)], IndexOptions::default())
        .index(&[("label", 1), ("dappAccount", 1)], IndexOptions::default())
        .index(&[("lastUpdatedTimestamp", 1)], IndexOptions::default())
        .index(&[("userAccount", 1), ("dappAccount", 1)], IndexOptions::default())
        .index(&[("dappAccount", 1), ("requestedAtTimestamp", 1)], IndexOptions::default())
        .index(&[("ipAddress.lower", 1)], IndexOptions::default())
        .index(&[("ipAddress.upper", 1)], IndexOptions::default())
        .index(&[("result.reason", 1)], IndexOptions::default())
        .index(&[("ipInfo.countryCode", 1)], IndexOptions::default())
        .index(&[("ipInfo.isVPN", 1)], IndexOptions::default())
        .index(&[("requestHash", -1)], IndexOptions::default())
        .index(&[("pending", 1)], IndexOptions::default())
        .index(&[("ipInfo", 1)], IndexOptions::default())
        .index(&[("parsedUserAgentInfo", 1)], IndexOptions::default())
        .index(&[("pendingStage", 1), ("_id", 1)], pending_stage_partial())
        .index(
            &[("dappAccount", 1), ("metadata.emailNormalised", 1), ("serverChecked", 1)],
            spam_email_count_partial(),
        )
        .index(&[("blocked", 1)], blocked_partial())
});

/// `DatasetRecordSchema`.
pub static DATASET_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    let tree = || array(Kind::Array(Box::new(Kind::String))).required();
    Schema::new(vec![
        field("contentTree", tree()),
        field("datasetContentId", string().required()),
        field("datasetId", string().required()),
        field("format", string().required()),
        field("solutionTree", tree()),
    ])
    .index(&[("datasetId", 1)], IndexOptions::default())
});

/// `SolutionRecordSchema`.
pub static SOLUTION_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("captchaId", string().required()),
        field("captchaContentId", string().required()),
        field("datasetId", string().required()),
        field("datasetContentId", string().required()),
        field("salt", string().required()),
        field("solution", array(Kind::String).required()),
    ])
    .index(&[("captchaId", 1)], IndexOptions::default())
});

/// `UserSolutionRecordSchema`.
pub static USER_SOLUTION_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("captchaId", string().required()),
        field("captchaContentId", string().required()),
        field("salt", string().required()),
        field("solution", array(Kind::String)),
        field("processed", boolean().required()),
        field("checked", boolean().required()),
        field("commitmentId", string().required()),
        field(
            "createdAt",
            date().default_fn(|ids| Bson::DateTime(ids.now())).expires(ONE_MONTH),
        ),
    ])
    .without_id()
    .index(&[("captchaId", 1)], IndexOptions::default())
    .index(&[("commitmentId", -1)], IndexOptions::default())
});

/// `ScheduledTaskRecordSchema`.
pub static SCHEDULED_TASK_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    static RESULT: LazyLock<Schema> =
        LazyLock::new(|| Schema::new(vec![field("error", string()), field("data", mixed())]).without_id());
    Schema::new(vec![
        field(
            "processName",
            string().one_of(ScheduledTaskNames::ALL.iter().map(|name| name.as_str())).required(),
        ),
        field("datetime", date().required().expires(ONE_WEEK)),
        field("updated", date()),
        field(
            "status",
            string().one_of(ScheduledTaskStatus::ALL.iter().map(|status| status.as_str())).required(),
        ),
        field("result", subdocument(&RESULT)),
    ])
    .index(&[("processName", 1)], IndexOptions::default())
    .index(&[("processName", 1), ("status", 1)], IndexOptions::default())
    .index(&[("_id", 1), ("status", 1)], IndexOptions::default())
});

static SESSION_RESULT: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("status", string().one_of(captcha_statuses()).required()),
        field("reason", string()),
        field("error", string()),
    ])
    .without_id()
});

static DNS_EVENT: LazyLock<Schema> = LazyLock::new(|| {
    Schema::new(vec![
        field("resolverIp", string()),
        field("peerIp", string()),
        field("pathValid", boolean()),
        field("receivedAt", date().required()),
    ])
    .without_id()
});

/// `SessionRecordSchema`.
pub static SESSION_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    let numbers = |names: &[&'static str]| -> Vec<Field> { names.iter().map(|name| field(name, number())).collect() };
    let mut fields: Vec<Field> = vec![
        field("sessionId", string().required()),
        field("createdAt", date().required()),
        field("token", string().required()),
        field("score", number().required()),
        field("threshold", number().required()),
        nested(
            "scoreComponents",
            vec![
                field("baseScore", number().required()),
                field("lScore", number()),
                field("timeout", number()),
                field("accessPolicy", number()),
                field("unverifiedHost", number()),
                field("webView", number()),
                field("triggeredDetectors", array(Kind::Number)),
                field("shadowDomPenalty", boolean()),
                field("dnsAsymmetry", number()),
            ],
        ),
        nested("ipAddress", composite_ip_fields()),
        field(
            "captchaType",
            string().one_of(CaptchaType::ALL.iter().map(|kind| kind.as_str())).required(),
        ),
        field("mode", string().one_of(ModeEnum::ALL.iter().map(|mode| mode.as_str()))),
        field("solvedImagesCount", number()),
        field("powDifficulty", number()),
        field("puzzleTolerance", number()),
        field("puzzle", mixed()),
        field("iconOrderTolerance", number()),
        field("iconOrder", mixed()),
        field("puzzleLevel", number()),
        field("storedAtTimestamp", date().expires(ONE_DAY)),
        field("lastUpdatedTimestamp", date()),
        field("pendingStage", boolean()),
        field("deleted", boolean()),
        field("userSitekeyIpHash", string()),
        field("webView", boolean().required().default_value(|| Bson::Boolean(false))),
        field("iFrame", boolean().required().default_value(|| Bson::Boolean(false))),
        field("isEscalation", boolean()),
        field("originSessionId", string()),
        field("refreshOf", string()),
        field("refreshCount", number()),
        field("refreshedAfterMs", number()),
        field("decryptedHeadHash", string().default_value(|| Bson::String(String::new()))),
        field("bundleId", string()),
        field("siteKey", string()),
        field("currentUrl", string()),
        field("iframeUrl", string()),
        field("isProtect", boolean()),
        field("reason", string()),
        field("blocked", boolean()),
        field("ruleHash", string()),
        field("ruleType", array(Kind::String)),
        field("ruleDescription", string()),
        field("matchedRule", mixed()),
        field("ipInfo", mixed()),
        field("headers", mixed()),
        field("result", subdocument(&SESSION_RESULT)),
        field("userSubmitted", boolean()),
        field("serverChecked", boolean()),
        field("agent", boolean()),
        field("webBotAuthAgent", string()),
        field("simdReadings", mixed()),
        field("simdReadingsStage", string()),
        field("d", mixed()),
    ];
    fields.extend(numbers(&[
        "tcpToChelloUs",
        "chelloToHandshakeUs",
        "synNs",
        "synackNs",
        "ackNs",
        "observedTtl",
        "tcpMss",
        "tcpWscale",
        "tcpWindow",
    ]));
    fields.push(field("tcpOptsKinds", array(Kind::Number)));
    fields.extend(numbers(&[
        "tcpOptsPresent",
        "tcpOptsCount",
        "tcpTsval",
        "tcpTsecr",
        "tcpFlags",
        "tcpDataOffsetResv",
        "tcpUrgPtr",
        "ipIdent",
        "ipTotalLen",
        "ipFragFlags",
        "ipTos",
        "tcpOptsFlags",
        "tcpOptsOrder",
    ]));
    fields.push(field("dnsEvent", subdocument(&DNS_EVENT)));
    fields.push(field("clientMetaData", subdocument(&CLIENT_META_DATA)));
    Schema::new(fields)
        .index(&[("createdAt", 1)], IndexOptions::default())
        .index(&[("deleted", 1)], IndexOptions::default())
        .index(&[("blocked", 1)], IndexOptions::default())
        .index(&[("sessionId", 1)], IndexOptions::unique())
        .index(&[("userSitekeyIpHash", 1)], IndexOptions::default())
        .index(&[("siteKey", 1), ("d.em", 1), ("createdAt", -1)], IndexOptions::sparse())
        .index(&[("token", 1)], IndexOptions::default())
        .index(&[("siteKey", 1)], IndexOptions::background_sparse())
        .index(&[("siteKey", 1), ("ipInfo.ip", 1)], IndexOptions::background())
        .index(&[("siteKey", 1), ("blocked", 1), ("createdAt", 1)], IndexOptions::background_sparse())
        .index(&[("ruleHash", 1)], IndexOptions::background_sparse())
        .index(&[("isEscalation", 1), ("createdAt", 1)], IndexOptions::background_sparse())
        .index(&[("isProtect", 1), ("createdAt", 1)], IndexOptions::background_sparse())
        .index(
            &[("createdAt", 1), ("captchaType", 1), ("scoreComponents.baseScore", 1)],
            IndexOptions::default(),
        )
        .index(&[("createdAt", 1), ("deleted", 1)], IndexOptions::default())
        .index(&[("result.status", 1)], IndexOptions::background_sparse())
        .index(&[("pendingStage", 1), ("_id", 1)], pending_stage_partial())
});

/// `DecisionMachineArtifactRecordSchema`.
pub static DECISION_MACHINE_ARTIFACT_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    let artifact_types: [CaptchaType; 5] = [
        CaptchaType::Pow,
        CaptchaType::Image,
        CaptchaType::Puzzle,
        CaptchaType::IconOrder,
        CaptchaType::Audio,
    ];
    Schema::new(vec![
        field(
            "scope",
            string().one_of(DecisionMachineScope::ALL.iter().map(|scope| scope.as_str())).required(),
        ),
        field("dappAccount", string()),
        field("kind", string().one_of(DecisionMachineKind::ALL.iter().map(|kind| kind.as_str()))),
        field(
            "runtime",
            string().one_of(DecisionMachineRuntime::ALL.iter().map(|runtime| runtime.as_str())).required(),
        ),
        field(
            "language",
            string().one_of(DecisionMachineLanguage::ALL.iter().map(|language| language.as_str())),
        ),
        field("source", string().required()),
        field("name", string()),
        field("version", string()),
        field("captchaType", string().one_of(artifact_types.iter().map(|kind| kind.as_str()))),
        field("createdAt", date().required()),
        field("updatedAt", date().required()),
    ])
    .index(&[("scope", 1), ("dappAccount", 1), ("kind", 1)], IndexOptions::unique())
    .index(&[("updatedAt", -1)], IndexOptions::default())
});

/// `ClientContextEntropyRecordSchema`.
pub static CLIENT_CONTEXT_ENTROPY_RECORD: LazyLock<Schema> = LazyLock::new(|| {
    static URL: LazyLock<Schema> = LazyLock::new(|| {
        Schema::new(vec![
            field("url", string().required()),
            field("sessions", number().required()),
            field("entropy", string().required()),
        ])
        .without_id()
    });
    Schema::new(vec![
        field("account", string().required()),
        field(
            "contextType",
            string().one_of(ContextType::ALL.iter().map(|context| context.as_str())).required(),
        ),
        field("entropy", string().required()),
        field("totalSessions", number()),
        field("distinctHashes", number()),
        field("urls", document_array(&URL)),
    ])
    .with_timestamps()
    .index(&[("account", 1), ("contextType", 1)], IndexOptions::unique())
});

fn domain_schema() -> Schema {
    Schema::new(vec![field("domain", string().required().unique())])
}

/// `SpamEmailDomainRecordSchema`.
pub static SPAM_EMAIL_DOMAIN_RECORD: LazyLock<Schema> = LazyLock::new(domain_schema);

/// `BannedDomainRecordSchema`.
pub static BANNED_DOMAIN_RECORD: LazyLock<Schema> = LazyLock::new(domain_schema);
