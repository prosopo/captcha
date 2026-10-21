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

//! provider/reasons.ts and isBlockingCaptchaResult. Every value here is stored.

use crate::captcha_type::CaptchaType;
use crate::datasets::CaptchaStatus;
use crate::wire_enum::wire_enum;
use serde::{Deserialize, Serialize};

wire_enum! {
    /// Why the frictionless flow chose a captcha type, stored at `session.reason`.
    pub enum FrictionlessReason {
        UserAccessPolicy: "USER_ACCESS_POLICY" = "USER_ACCESS_POLICY",
        AccessPolicyBlock: "ACCESS_POLICY_BLOCK" = "ACCESS_POLICY_BLOCK",
        UserAgentMismatch: "USER_AGENT_MISMATCH" = "USER_AGENT_MISMATCH",
        OldTimestamp: "OLD_TIMESTAMP" = "OLD_TIMESTAMP",
        BotScoreAboveThreshold: "BOT_SCORE_ABOVE_THRESHOLD" = "BOT_SCORE_ABOVE_THRESHOLD",
        BotScorePuzzleBand: "BOT_SCORE_PUZZLE_BAND" = "BOT_SCORE_PUZZLE_BAND",
        WebviewDetected: "WEBVIEW_DETECTED" = "WEBVIEW_DETECTED",
        AutoBanScore: "AUTO_BAN_SCORE" = "AUTO_BAN_SCORE",
        FingerprintProofInvalid: "FINGERPRINT_PROOF_INVALID" = "FINGERPRINT_PROOF_INVALID",
        MissingCurrentUrl: "MISSING_CURRENT_URL" = "MISSING_CURRENT_URL",
        MissingCoordinates: "MISSING_COORDINATES" = "MISSING_COORDINATES",
        IpChanged: "IP_CHANGED" = "IP_CHANGED",
        DecryptionFailed: "DECRYPTION_FAILED" = "DECRYPTION_FAILED",
        MissingToken: "MISSING_TOKEN" = "MISSING_TOKEN",
        MissingHeadHash: "MISSING_HEAD_HASH" = "MISSING_HEAD_HASH",
        PuzzleRefreshLimit: "PUZZLE_REFRESH_LIMIT" = "PUZZLE_REFRESH_LIMIT",
        PuzzleUserSwitch: "PUZZLE_USER_SWITCH" = "PUZZLE_USER_SWITCH",
    }
}

/// Reasons that mean "we measured nothing", as opposed to "we measured something bad": their
/// round counts are fixed fallbacks, not a severity. `OLD_TIMESTAMP` is a real graduated
/// measurement and so is not one of them.
pub const NO_MEASUREMENT_REASONS: [FrictionlessReason; 3] = [
    FrictionlessReason::MissingToken,
    FrictionlessReason::MissingHeadHash,
    FrictionlessReason::DecryptionFailed,
];

wire_enum! {
    /// The outcome of a verification, stored at `result.reason`. The values are the
    /// translation keys of the messages shown to the user.
    pub enum ResultReason {
        CaptchaPassed: "CAPTCHA_PASSED" = "API.CAPTCHA_PASSED",
        CaptchaFailed: "CAPTCHA_FAILED" = "API.CAPTCHA_FAILED",
        AbuserBlocked: "ABUSER_BLOCKED" = "API.ABUSER_BLOCKED",
        AccessPolicyBlock: "ACCESS_POLICY_BLOCK" = "API.ACCESS_POLICY_BLOCK",
        ClientSessionMismatch: "CLIENT_SESSION_MISMATCH" = "API.CLIENT_SESSION_MISMATCH",
        CrawlerBlocked: "CRAWLER_BLOCKED" = "API.CRAWLER_BLOCKED",
        DatacenterBlocked: "DATACENTER_BLOCKED" = "API.DATACENTER_BLOCKED",
        FailedIpValidation: "FAILED_IP_VALIDATION" = "API.FAILED_IP_VALIDATION",
        IncorrectCaptchaType: "INCORRECT_CAPTCHA_TYPE" = "API.INCORRECT_CAPTCHA_TYPE",
        MobileBlocked: "MOBILE_BLOCKED" = "API.MOBILE_BLOCKED",
        ProxyBlocked: "PROXY_BLOCKED" = "API.PROXY_BLOCKED",
        SatelliteBlocked: "SATELLITE_BLOCKED" = "API.SATELLITE_BLOCKED",
        SpamEmailDomain: "SPAM_EMAIL_DOMAIN" = "API.SPAM_EMAIL_DOMAIN",
        SpamEmailRule: "SPAM_EMAIL_RULE" = "API.SPAM_EMAIL_RULE",
        SpamEmailCountExceeded: "SPAM_EMAIL_COUNT_EXCEEDED" = "API.SPAM_EMAIL_COUNT_EXCEEDED",
        TimestampTooOld: "TIMESTAMP_TOO_OLD" = "API.TIMESTAMP_TOO_OLD",
        TooManyLocalhost: "TOO_MANY_LOCALHOST" = "API.TOO_MANY_LOCALHOST",
        TorBlocked: "TOR_BLOCKED" = "API.TOR_BLOCKED",
        VpnBlocked: "VPN_BLOCKED" = "API.VPN_BLOCKED",
        CaptchaInvalidSalt: "CAPTCHA_INVALID_SALT" = "CAPTCHA.INVALID_SALT",
        CaptchaInvalidSolution: "CAPTCHA_INVALID_SOLUTION" = "CAPTCHA.INVALID_SOLUTION",
        CaptchaInvalidTimestamp: "CAPTCHA_INVALID_TIMESTAMP" = "CAPTCHA.INVALID_TIMESTAMP",
        CaptchaNoSessionFound: "CAPTCHA_NO_SESSION_FOUND" = "CAPTCHA.NO_SESSION_FOUND",
        CaptchaDecisionMachineDenied: "CAPTCHA_DECISION_MACHINE_DENIED" = "CAPTCHA.DECISION_MACHINE_DENIED",
        DisallowedWebview: "DISALLOWED_WEBVIEW" = "API.DISALLOWED_WEBVIEW",
        UserNotVerified: "USER_NOT_VERIFIED" = "API.USER_NOT_VERIFIED",
        UserVerified: "USER_VERIFIED" = "API.USER_VERIFIED",
        EmailInvalid: "EMAIL_INVALID" = "EMAIL_INVALID",
        EmailMatchedCustomPattern: "EMAIL_MATCHED_CUSTOM_PATTERN" = "EMAIL_MATCHED_CUSTOM_PATTERN",
        EmailMatchedDefaultPattern: "EMAIL_MATCHED_DEFAULT_PATTERN" = "EMAIL_MATCHED_DEFAULT_PATTERN",
        EmailTooManyDots: "EMAIL_TOO_MANY_DOTS" = "EMAIL_TOO_MANY_DOTS",
    }
}

/// `CaptchaResult`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct CaptchaResult {
    pub status: CaptchaStatus,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<ResultReason>,
}

/// `isBlockingCaptchaResult`: whether a disapproval was the server rejecting the request
/// rather than the user failing the challenge. Stamps `blocked` on the session. Every
/// disapproved PoW is a block, since nobody legitimately fails a proof of work.
pub fn is_blocking_captcha_result(captcha_type: CaptchaType, result: CaptchaResult) -> bool {
    if result.status != CaptchaStatus::Disapproved {
        return false;
    }
    if captcha_type == CaptchaType::Pow {
        return true;
    }
    result.reason != Some(ResultReason::CaptchaInvalidSolution)
}
