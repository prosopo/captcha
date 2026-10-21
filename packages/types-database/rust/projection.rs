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

//! `SESSION_PROJECTION`: the session fields `getSessionRecordBySessionId` reads. A field not
//! listed here reads as absent, however the session was written; the TS comment on the
//! constant records the three times that silently disabled something.

use bson::Document;

/// In the TS key order. `headers` is projected key by key: the stored headers can carry a
/// multi-kilobyte `x-tls-clienthello` that nothing reads back.
pub const SESSION_PROJECTION_FIELDS: [&str; 75] = [
    "sessionId",
    "token",
    "score",
    "threshold",
    "scoreComponents",
    "ipAddress",
    "ipInfo",
    "webView",
    "iFrame",
    "isEscalation",
    "decryptedHeadHash",
    "siteKey",
    "reason",
    "mode",
    "solvedImagesCount",
    "puzzleTolerance",
    "puzzle",
    "iconOrderTolerance",
    "iconOrder",
    "puzzleLevel",
    "powDifficulty",
    "ruleType",
    "isProtect",
    "d",
    "userSitekeyIpHash",
    "simdReadings",
    "bundleId",
    "dnsEvent",
    "originSessionId",
    "refreshCount",
    "createdAt",
    "currentUrl",
    "iframeUrl",
    "clientMetaData",
    "captchaType",
    "serverChecked",
    "synNs",
    "synackNs",
    "ackNs",
    "observedTtl",
    "tcpMss",
    "tcpWscale",
    "tcpWindow",
    "tcpOptsKinds",
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
    "headers.user-agent",
    "headers.accept",
    "headers.accept-language",
    "headers.accept-encoding",
    "headers.sec-ch-ua",
    "headers.sec-ch-ua-mobile",
    "headers.sec-ch-ua-platform",
    "headers.sec-ch-ua-platform-version",
    "headers.sec-fetch-dest",
    "headers.sec-fetch-mode",
    "headers.sec-fetch-site",
    "headers.sec-fetch-user",
    "headers.referer",
    "headers.origin",
    "headers.prosopo-user",
    "headers.prosopo-site-key",
    "headers.prosopo-type",
    "headers.x-tls-version",
];

/// The projection document mongoose sends: every field `1`.
pub fn session_projection() -> Document {
    SESSION_PROJECTION_FIELDS.iter().map(|field| (field.to_string(), bson::Bson::Int32(1))).collect()
}
