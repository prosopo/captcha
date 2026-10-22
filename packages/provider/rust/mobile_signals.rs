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

//! utils/mobileSignals.ts: whether a request came from a handheld touch device, weighed across
//! the user agent, the client hints, touch evidence and the network.

use bson::{Bson, Document};

/// `MobileSignals`.
#[derive(Debug, Default, Clone, Copy)]
pub struct MobileSignals<'a> {
    pub user_agent: Option<&'a str>,
    /// Read for the UA client hints.
    pub headers: Option<&'a Document>,
    /// `ipInfo.isMobile`: the IP is on a mobile carrier network.
    pub carrier_network: Option<bool>,
    /// MSS from the client's SYN.
    pub tcp_mss: Option<f64>,
    pub web_view: Option<bool>,
    /// `deviceCapability` off the behavioural payload.
    pub device_capability: Option<&'a str>,
    pub touch_event_count: Option<f64>,
}

/// `MobileVerdict`.
#[derive(Debug, Clone, PartialEq)]
pub struct MobileVerdict {
    pub is_mobile: bool,
    /// True when a signal other than a request header said mobile.
    pub corroborated: bool,
    pub score: f64,
    /// Which signals contributed, for logging and calibration.
    pub evidence: Vec<String>,
}

const MOBILE_UA: [&str; 7] = ["mobile", "android", "iphone", "ipad", "ipod", "opera mini", "iemobile"];
const DESKTOP_UA: [&str; 4] = ["windows nt", "macintosh", "x11", "cros"];
const MOBILE_PLATFORM_HINTS: [&str; 2] = ["android", "ios"];
const DESKTOP_PLATFORM_HINTS: [&str; 4] = ["windows", "macos", "linux", "chrome os"];
const TUNNELLED_MSS_MIN: f64 = 1300.0;
const TUNNELLED_MSS_MAX: f64 = 1430.0;
pub const MOBILE_SCORE_THRESHOLD: f64 = 3.0;

/// `/a|b|…/i.test(text)` for ASCII alternatives: JS case-insensitive matching never maps a
/// non-ASCII character onto an ASCII one, so `ſ` is not `s` here, as it would be under Unicode
/// case folding.
fn contains_ascii_insensitive(text: &str, needles: &[&str]) -> bool {
    let lowered: String = text.chars().map(|c| c.to_ascii_lowercase()).collect();
    needles.iter().any(|needle| lowered.contains(needle))
}

/// `readHeader`: a header as a non-empty string.
fn read_header<'a>(headers: Option<&'a Document>, name: &str) -> Option<&'a str> {
    match headers?.get(name) {
        Some(Bson::String(value)) if !value.is_empty() => Some(value),
        _ => None,
    }
}

/// `deriveMobileVerdict`.
pub fn derive_mobile_verdict(signals: &MobileSignals<'_>) -> MobileVerdict {
    let mut score: f64 = 0.0;
    let mut corroborated: bool = false;
    let mut evidence: Vec<String> = Vec::new();
    let mut vote = |weight: f64, name: &str, corroborating: bool| {
        score += weight;
        evidence.push(name.to_string());
        corroborated |= corroborating;
    };

    let user_agent: &str = signals.user_agent.unwrap_or_default();
    if contains_ascii_insensitive(user_agent, &MOBILE_UA) {
        vote(3.0, "userAgentMobile", false);
    } else if contains_ascii_insensitive(user_agent, &DESKTOP_UA) {
        vote(-3.0, "userAgentDesktop", false);
    }

    match read_header(signals.headers, "sec-ch-ua-mobile") {
        Some("?1") => vote(3.0, "clientHintMobile", false),
        Some("?0") => vote(-3.0, "clientHintNotMobile", false),
        _ => {}
    }

    if let Some(platform) = read_header(signals.headers, "sec-ch-ua-platform") {
        let platform: String = platform.replace('"', "").to_lowercase();
        if MOBILE_PLATFORM_HINTS.contains(&platform.as_str()) {
            vote(3.0, "clientHintPlatformMobile", false);
        } else if DESKTOP_PLATFORM_HINTS.contains(&platform.as_str()) {
            vote(-3.0, "clientHintPlatformDesktop", false);
        }
    }

    match signals.device_capability {
        Some("mobile") => vote(2.0, "touchCapability", true),
        Some("desktop") => vote(-3.0, "pointerCapability", false),
        _ => {}
    }

    if signals.touch_event_count.is_some_and(|count| count > 0.0) {
        vote(2.0, "touchEvents", true);
    }

    if signals.web_view == Some(true) {
        vote(1.0, "webView", true);
    }

    let on_carrier: bool = signals.carrier_network == Some(true);
    let tunnelled: bool = signals.tcp_mss.is_some_and(|mss| (TUNNELLED_MSS_MIN..=TUNNELLED_MSS_MAX).contains(&mss));
    if on_carrier || tunnelled {
        let name: &str = match (on_carrier, tunnelled) {
            (true, true) => "carrierNetwork+tunnelledMss",
            (true, false) => "carrierNetwork",
            _ => "tunnelledMss",
        };
        vote(1.0, name, true);
    }

    MobileVerdict { is_mobile: score >= MOBILE_SCORE_THRESHOLD, corroborated, score, evidence }
}

#[cfg(test)]
mod tests {
    //! tests/unit/utils/mobileSignals.unit.test.ts
    use super::*;
    use bson::doc;

    const IPHONE_UA: &str = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const PIXEL_UA: &str = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
    const WINDOWS_CHROME_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";
    const MAC_UA: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    const LINUX_FIREFOX_UA: &str = "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0";

    fn android_hints() -> Document {
        doc! { "sec-ch-ua-mobile": "?1", "sec-ch-ua-platform": "\"Android\"" }
    }

    fn windows_hints() -> Document {
        doc! { "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\"Windows\"" }
    }

    fn verdict(signals: MobileSignals<'_>) -> MobileVerdict {
        derive_mobile_verdict(&signals)
    }

    #[test]
    fn reads_a_phone_on_home_wifi_as_mobile() {
        assert!(verdict(MobileSignals { user_agent: Some(IPHONE_UA), carrier_network: Some(false), tcp_mss: Some(1460.0), ..Default::default() }).is_mobile);
    }

    #[test]
    fn does_not_read_a_tethered_laptop_as_mobile() {
        let hints: Document = windows_hints();
        assert!(!verdict(MobileSignals { user_agent: Some(WINDOWS_CHROME_UA), headers: Some(&hints), carrier_network: Some(true), tcp_mss: Some(1400.0), ..Default::default() }).is_mobile);
    }

    #[test]
    fn does_not_read_a_touchscreen_laptop_as_mobile() {
        let hints: Document = windows_hints();
        let signals = MobileSignals { user_agent: Some(WINDOWS_CHROME_UA), headers: Some(&hints), device_capability: Some("mobile"), touch_event_count: Some(40.0), ..Default::default() };
        assert!(!verdict(signals).is_mobile);
    }

    #[test]
    fn accepts_a_mobile_ua_alone() {
        assert!(verdict(MobileSignals { user_agent: Some(IPHONE_UA), ..Default::default() }).is_mobile);
    }

    #[test]
    fn accepts_the_client_hints_alone() {
        let hints: Document = android_hints();
        assert!(verdict(MobileSignals { headers: Some(&hints), ..Default::default() }).is_mobile);
    }

    #[test]
    fn reads_the_platform_hint_case_and_quote_insensitively() {
        let hints: Document = doc! { "sec-ch-ua-platform": "iOS" };
        assert!(verdict(MobileSignals { headers: Some(&hints), ..Default::default() }).evidence.contains(&"clientHintPlatformMobile".to_string()));
    }

    #[test]
    fn rejects_a_mobile_ua_the_client_hints_contradict() {
        let hints: Document = windows_hints();
        assert!(!verdict(MobileSignals { user_agent: Some(PIXEL_UA), headers: Some(&hints), ..Default::default() }).is_mobile);
    }

    #[test]
    fn accepts_a_desktop_ua_the_client_hints_contradict() {
        let hints: Document = android_hints();
        assert!(verdict(MobileSignals { user_agent: Some(WINDOWS_CHROME_UA), headers: Some(&hints), ..Default::default() }).is_mobile);
    }

    #[test]
    fn does_not_read_desktop_browsers_as_mobile() {
        for user_agent in [WINDOWS_CHROME_UA, MAC_UA, LINUX_FIREFOX_UA] {
            assert!(!verdict(MobileSignals { user_agent: Some(user_agent), ..Default::default() }).is_mobile, "{user_agent}");
        }
    }

    #[test]
    fn does_not_let_the_carrier_bit_alone_decide() {
        assert!(!verdict(MobileSignals { carrier_network: Some(true), ..Default::default() }).is_mobile);
    }

    #[test]
    fn does_not_let_a_tunnelled_mss_alone_decide() {
        assert!(!verdict(MobileSignals { tcp_mss: Some(1348.0), ..Default::default() }).is_mobile);
    }

    #[test]
    fn counts_these_mss_values_as_tunnelled() {
        for tcp_mss in [1300.0, 1348.0, 1400.0, 1430.0] {
            assert!(verdict(MobileSignals { tcp_mss: Some(tcp_mss), ..Default::default() }).evidence.contains(&"tunnelledMss".to_string()), "{tcp_mss}");
        }
    }

    #[test]
    fn scores_the_carrier_bit_and_a_tunnelled_mss_once_between_them() {
        let both: MobileVerdict = verdict(MobileSignals { carrier_network: Some(true), tcp_mss: Some(1400.0), ..Default::default() });
        let one: MobileVerdict = verdict(MobileSignals { carrier_network: Some(true), ..Default::default() });
        assert_eq!(both.score, one.score);
        assert_eq!(both.evidence, ["carrierNetwork+tunnelledMss"]);
    }

    #[test]
    fn does_not_let_the_two_network_signals_plus_a_webview_decide() {
        assert!(!verdict(MobileSignals { carrier_network: Some(true), tcp_mss: Some(1400.0), web_view: Some(true), ..Default::default() }).is_mobile);
    }

    #[test]
    fn does_not_count_these_mss_values_as_tunnelled() {
        for tcp_mss in [1452.0, 1460.0, 0.0] {
            assert!(!verdict(MobileSignals { tcp_mss: Some(tcp_mss), ..Default::default() }).evidence.contains(&"tunnelledMss".to_string()), "{tcp_mss}");
        }
    }

    #[test]
    fn lets_touch_evidence_carry_a_ua_less_client() {
        assert!(verdict(MobileSignals { device_capability: Some("mobile"), touch_event_count: Some(12.0), ..Default::default() }).is_mobile);
    }

    #[test]
    fn rejects_a_mobile_ua_that_reports_no_touch_support() {
        assert!(!verdict(MobileSignals { user_agent: Some(PIXEL_UA), device_capability: Some("desktop"), ..Default::default() }).is_mobile);
    }

    #[test]
    fn ignores_a_zero_touch_event_count() {
        assert!(!verdict(MobileSignals { touch_event_count: Some(0.0), ..Default::default() }).evidence.contains(&"touchEvents".to_string()));
    }

    #[test]
    fn reads_nothing_as_not_mobile() {
        let nothing: MobileVerdict = verdict(MobileSignals::default());
        assert!(!nothing.is_mobile);
        assert_eq!(nothing.score, 0.0);
        assert!(nothing.evidence.is_empty());
    }

    #[test]
    fn is_not_corroborated_by_a_user_agent_alone() {
        let found: MobileVerdict = verdict(MobileSignals { user_agent: Some(IPHONE_UA), ..Default::default() });
        assert!(found.is_mobile);
        assert!(!found.corroborated);
    }

    #[test]
    fn is_not_corroborated_by_the_client_hints_alone() {
        let hints: Document = android_hints();
        let found: MobileVerdict = verdict(MobileSignals { headers: Some(&hints), ..Default::default() });
        assert!(found.is_mobile);
        assert!(!found.corroborated);
    }

    #[test]
    fn is_corroborated_by_each_non_header_signal() {
        let extras: [MobileSignals<'_>; 5] = [
            MobileSignals { carrier_network: Some(true), ..Default::default() },
            MobileSignals { tcp_mss: Some(1400.0), ..Default::default() },
            MobileSignals { web_view: Some(true), ..Default::default() },
            MobileSignals { device_capability: Some("mobile"), ..Default::default() },
            MobileSignals { touch_event_count: Some(9.0), ..Default::default() },
        ];
        for extra in extras {
            let found: MobileVerdict = verdict(MobileSignals { user_agent: Some(IPHONE_UA), ..extra });
            assert!(found.is_mobile && found.corroborated, "{extra:?}");
        }
    }

    #[test]
    fn is_not_corroborated_by_a_signal_that_says_desktop() {
        assert!(!verdict(MobileSignals { user_agent: Some(IPHONE_UA), device_capability: Some("desktop"), ..Default::default() }).corroborated);
    }

    #[test]
    fn ignores_empty_header_values() {
        let hints: Document = doc! { "sec-ch-ua-mobile": "", "sec-ch-ua-platform": "" };
        assert_eq!(verdict(MobileSignals { user_agent: Some(IPHONE_UA), headers: Some(&hints), ..Default::default() }).evidence, ["userAgentMobile"]);
    }
}
