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

//! `ApiParams`: the JSON keys of request and response bodies, and of the token.

macro_rules! api_params {
    ($($konst:ident : $key:literal = $value:literal),+ $(,)?) => {
        /// `ApiParams.<key>` is `ApiParams::<KEY>`.
        pub struct ApiParams;

        impl ApiParams {
            $(pub const $konst: &'static str = $value;)+

            /// `(tsKey, value)` in TS declaration order.
            pub const ENTRIES: [(&'static str, &'static str); [$($value),+].len()] =
                [$(($key, $value)),+];
        }
    };
}

api_params! {
    DATASET_ID: "datasetId" = "datasetId",
    USER: "user" = "user",
    DAPP: "dapp" = "dapp",
    PROVIDER: "provider" = "provider",
    BLOCK_NUMBER: "blockNumber" = "blockNumber",
    REQUEST_HASH: "requestHash" = "requestHash",
    CAPTCHAS: "captchas" = "captchas",
    COMMITMENT_ID: "commitmentId" = "commitmentId",
    PROOF: "proof" = "proof",
    DAPP_SIGNATURE: "dappSignature" = "dappSignature",
    DAPP_USER_SIGNATURE: "dappUserSignature" = "dappUserSignature",
    PROVIDER_URL: "providerUrl" = "providerUrl",
    PROCAPTCHA_RESPONSE: "procaptchaResponse" = "procaptcha-response",
    VERIFIED_TIMEOUT: "verifiedTimeout" = "verifiedTimeout",
    MAX_VERIFIED_TIME: "maxVerifiedTime" = "maxVerifiedTime",
    VERIFIED: "verified" = "verified",
    STATUS: "status" = "status",
    CHALLENGE: "challenge" = "challenge",
    DIFFICULTY: "difficulty" = "difficulty",
    NONCE: "nonce" = "nonce",
    TIMEOUTS: "timeouts" = "timeouts",
    TOKEN: "token" = "token",
    SECRET: "secret" = "secret",
    TIMESTAMP: "timestamp" = "timestamp",
    SIGNATURE: "signature" = "signature",
    LANGUAGE: "language" = "language",
    ERROR: "error" = "error",
    SITE_KEY: "siteKey" = "siteKey",
    SITE_KEYS: "siteKeys" = "siteKeys",
    CAPTCHA_TYPE: "captchaType" = "captchaType",
    SESSION_ID: "sessionId" = "sessionId",
    SETTINGS: "settings" = "settings",
    DOMAINS: "domains" = "domains",
    FRICTIONLESS_THRESHOLD: "frictionlessThreshold" = "frictionlessThreshold",
    POW_DIFFICULTY: "powDifficulty" = "powDifficulty",
    SCORE: "score" = "score",
    TIER: "tier" = "tier",
    DETECTOR_KEY: "detectorKey" = "detectorKey",
    DETECTOR_SESSION_ID: "detectorSessionId" = "detectorSessionId",
    BUNDLE_ID: "bundleId" = "bundleId",
    DETECTOR_SCRIPT: "detectorScript" = "detectorScript",
    USE_PROVIDER_BUNDLE: "useProviderBundle" = "useProviderBundle",
    CLIENT_URL: "clientUrl" = "clientUrl",
    ASSET_ORIGIN: "assetOrigin" = "assetOrigin",
    IP: "ip" = "ip",
    EXPIRATION_IN_SECONDS: "expirationInSeconds" = "expirationInSeconds",
    ENABLED: "enabled" = "enabled",
    HEAD_HASH: "headHash" = "headHash",
    BEHAVIORAL_DATA: "behavioralData" = "behavioralData",
    SIMD_READINGS: "simdReadings" = "simdReadings",
    CURRENT_URL: "currentUrl" = "currentUrl",
    IFRAME_URL: "iframeUrl" = "iframeUrl",
    DECISION_MACHINE_SCOPE: "decisionMachineScope" = "decisionMachineScope",
    DECISION_MACHINE_RUNTIME: "decisionMachineRuntime" = "decisionMachineRuntime",
    DECISION_MACHINE_SOURCE: "decisionMachineSource" = "decisionMachineSource",
    DECISION_MACHINE_LANGUAGE: "decisionMachineLanguage" = "decisionMachineLanguage",
    DECISION_MACHINE_NAME: "decisionMachineName" = "decisionMachineName",
    DECISION_MACHINE_VERSION: "decisionMachineVersion" = "decisionMachineVersion",
    DECISION_MACHINE_CAPTCHA_TYPE: "decisionMachineCaptchaType" = "decisionMachineCaptchaType",
    DECISION_MACHINE_KIND: "decisionMachineKind" = "decisionMachineKind",
    SALT: "salt" = "salt",
    EMAIL: "email" = "email",
    TARGET_X: "targetX" = "targetX",
    TARGET_Y: "targetY" = "targetY",
    ORIGIN_X: "originX" = "originX",
    ORIGIN_Y: "originY" = "originY",
    FINAL_X: "finalX" = "finalX",
    FINAL_Y: "finalY" = "finalY",
    PUZZLE_EVENTS: "puzzleEvents" = "puzzleEvents",
    TOLERANCE: "tolerance" = "tolerance",
    BACKGROUND: "background" = "background",
    PIECE: "piece" = "piece",
    PIECE_SIZE: "pieceSize" = "pieceSize",
    LEGEND: "legend" = "legend",
    LEGEND_ICON_SIZE: "legendIconSize" = "legendIconSize",
    CLICKS: "clicks" = "clicks",
    ICON_ORDER_EVENTS: "iconOrderEvents" = "iconOrderEvents",
    MODE: "mode" = "mode",
    REASON: "reason" = "reason",
    ESCALATION: "escalation" = "escalation",
    HP: "hp" = "hp",
    CLIENT_META_DATA: "clientMetaData" = "clientMetaData",
    CLIENT_SESSION_ID: "clientSessionId" = "clientSessionId",
    REFRESH_OF: "refreshOf" = "refreshOf",
    SWITCH_TO_IMAGE: "switchToImage" = "switchToImage",
    IMAGE_SWITCH_AVAILABLE: "imageSwitchAvailable" = "imageSwitchAvailable",
    HONEYPOT: "honeypot" = "honeypot",
    FINGERPRINT_PROOF: "fingerprintProof" = "fingerprintProof",
    CLIP: "clip" = "clip",
    ANSWER: "answer" = "answer",
    AUDIO_EVENTS: "audioEvents" = "audioEvents",
    REPLAYS: "replays" = "replays",
    CHARACTER_COUNT: "characterCount" = "characterCount",
}
