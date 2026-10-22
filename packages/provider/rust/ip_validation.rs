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

//! The IP helpers of util.ts: reading an address, checking a request's address against the one
//! a challenge was issued to, and the configurable rules for addresses that differ.

use crate::ip_comparison::{compare_ips, IpInfoLookup};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::{LogObject, LogRecord, Logger};
use prosopo_types::ipapi::{IpComparisonResponse, IpComparisonResult};
use prosopo_types::settings::IPValidationAction;
use prosopo_types::settings_types::{IPValidationActions, IPValidationRules};
use prosopo_util::{number_to_string, to_fixed, Address4, Address6, IpAddress};
use prosopo_util_crypto::address::{decode_address, encode_address};
use prosopo_util_crypto::u8a::{hex_to_u8a, is_hex, U8aLike};
use serde::Serialize;
use serde_json::json;

/// The ss58 prefix `encodeAddress` uses by default.
const SUBSTRATE_PREFIX: i32 = 42;

/// `encodeStringAddress`: an address, or its hex public key, in ss58 form.
pub fn encode_string_address(address: &str) -> Result<String, ProsopoError> {
    let key: Result<Vec<u8>, _> = if is_hex(address) {
        Ok(hex_to_u8a(address))
    } else {
        decode_address(Some(U8aLike::Str(address)), false, None)
    };
    key.and_then(|key| encode_address(U8aLike::Bytes(&key), SUBSTRATE_PREFIX)).map_err(|_| {
        ProsopoError::new(
            ErrorClass::Contract,
            ErrorSource::key("CONTRACT.INVALID_ADDRESS"),
            ErrorOptions {
                context: Some(ErrorContext::new().with("address", address)),
                ..ErrorOptions::default()
            },
        )
    })
}

/// `getIPAddress`: the text as a v4 address, or else a v6 one.
pub fn get_ip_address(address: &str) -> Result<IpAddress, ProsopoError> {
    if let Ok(v4) = Address4::new(address) {
        return Ok(IpAddress::V4(v4));
    }
    Address6::new(address).map(IpAddress::V6).map_err(|_| invalid_ip())
}

fn invalid_ip() -> ProsopoError {
    ProsopoError::new(ErrorClass::Env, ErrorSource::key("API.INVALID_IP"), ErrorOptions::default())
}

/// `getIPAddressFromBigInt`: a number above 4228250626 is read as a v6 address.
pub fn get_ip_address_from_big_int(value: u128) -> Result<IpAddress, ProsopoError> {
    if value > 4_228_250_626 {
        return Ok(IpAddress::V6(Address6::from_big_int(value)));
    }
    Address4::from_big_int(value).map(IpAddress::V4).map_err(|_| invalid_ip())
}

/// An address, as its embedded v4 address when it has one.
fn as_v4_where_embedded(address: IpAddress) -> IpAddress {
    match &address {
        IpAddress::V6(v6) => match v6.address4() {
            Some(v4) => IpAddress::V4(v4.clone()),
            None => address,
        },
        IpAddress::V4(_) => address,
    }
}

/// The outcome of a check, as the TS returns it.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpCheck {
    pub is_valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub distance_km: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub should_flag: Option<bool>,
}

impl IpCheck {
    fn valid() -> IpCheck {
        IpCheck {
            is_valid: true,
            ..IpCheck::default()
        }
    }

    fn invalid(message: String) -> IpCheck {
        IpCheck {
            is_valid: false,
            error_message: Some(message),
            ..IpCheck::default()
        }
    }
}

/// `validateIpAddress`: whether the address a request came from is the one the challenge was
/// issued to. None given passes: the check is optional.
pub fn validate_ip_address(ip: Option<&str>, challenge: &IpAddress, logger: &Logger) -> IpCheck {
    let Some(ip) = ip.filter(|ip| !ip.is_empty()) else {
        return IpCheck::valid();
    };
    let Ok(given) = get_ip_address(ip) else {
        let message: String = format!("Invalid IP address: {ip}");
        logger.info(|| LogRecord::msg(message.clone()));
        return IpCheck::invalid(message);
    };
    logger.info(|| LogRecord::default().with_data(json!({ "ipV4orV6Address": given.address() })));
    let given: IpAddress = as_v4_where_embedded(given);
    let mut challenge: IpAddress = as_v4_where_embedded(challenge.clone());
    if let (true, IpAddress::V6(v6)) = (given.is_v4(), &challenge) {
        if let Ok(v4) = Address4::new(&v6.to4().correct_form()) {
            challenge = IpAddress::V4(v4);
        }
    }
    if challenge.big_int() != given.big_int() {
        let message: String = format!("IP address mismatch: {} !== {}", challenge.address(), given.address());
        logger.info(|| {
            LogRecord::msg(message.clone())
                .with_data(json!({ "challengeIp": challenge.address(), "providedIp": given.address() }))
        });
        return IpCheck::invalid(message);
    }
    IpCheck::valid()
}

/// The rules' verdict on two addresses that differ.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleEvaluation {
    pub action: IPValidationAction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub should_flag: Option<bool>,
}

struct Condition {
    action: IPValidationAction,
    message: String,
}

/// `${value}` of an optional string.
fn shown(value: &Option<String>) -> String {
    value.clone().unwrap_or_else(|| "undefined".to_string())
}

fn action_list(actions: &IPValidationActions) -> [IPValidationAction; 5] {
    [
        actions.country_change_action,
        actions.city_change_action,
        actions.isp_change_action,
        actions.distance_exceed_action,
        actions.abuse_score_exceed_action,
    ]
}

/// `evaluateIpValidationRules`: each rule the change breaks becomes a condition with the
/// action the site configured (a country override taking precedence); then either every
/// rejecting rule must be broken to reject, or the first rejecting one rejects.
pub fn evaluate_ip_validation_rules(comparison: &IpComparisonResult, rules: &IPValidationRules, logger: &Logger) -> RuleEvaluation {
    let Some(comparison) = &comparison.comparison else {
        return RuleEvaluation {
            action: IPValidationAction::Allow,
            error_message: None,
            should_flag: None,
        };
    };
    let reject_actions: usize = action_list(&rules.actions).iter().filter(|action| **action == IPValidationAction::Reject).count();
    let (ip1, ip2) = (&comparison.ip1_details, &comparison.ip2_details);
    let override_for = |code: &Option<String>| {
        code.as_ref().and_then(|code| rules.country_overrides.as_ref().and_then(|overrides| overrides.get(code)))
    };
    let country_override = override_for(&ip2.country_code).or_else(|| override_for(&ip1.country_code));
    let mut actions: IPValidationActions = rules.actions.clone();
    let mut distance_threshold_km: f64 = rules.distance_threshold_km.get();
    let mut abuse_score_threshold: f64 = rules.abuse_score_threshold.get();
    let mut require_all_conditions: bool = rules.require_all_conditions;
    if let Some(country_override) = country_override {
        let overrides = &country_override.actions;
        actions.country_change_action = overrides.country_change_action.unwrap_or(actions.country_change_action);
        actions.city_change_action = overrides.city_change_action.unwrap_or(actions.city_change_action);
        actions.isp_change_action = overrides.isp_change_action.unwrap_or(actions.isp_change_action);
        actions.distance_exceed_action = overrides.distance_exceed_action.unwrap_or(actions.distance_exceed_action);
        actions.abuse_score_exceed_action = overrides.abuse_score_exceed_action.unwrap_or(actions.abuse_score_exceed_action);
        distance_threshold_km = country_override.distance_threshold_km.map_or(distance_threshold_km, |value| value.get());
        abuse_score_threshold = country_override.abuse_score_threshold.map_or(abuse_score_threshold, |value| value.get());
        require_all_conditions = country_override.require_all_conditions.unwrap_or(require_all_conditions);
    }
    let mut conditions: Vec<Condition> = Vec::new();
    if ip1.country != ip2.country {
        conditions.push(Condition {
            action: actions.country_change_action,
            message: format!("Country changed from {} to {}", shown(&ip1.country), shown(&ip2.country)),
        });
    }
    let unknown: bool = ip1.provider.as_deref().is_none_or(|provider| provider.is_empty() || provider == "Unknown");
    let datacenter = |details: &prosopo_types::ipapi::IpDetails| details.connection_type == prosopo_types::ipapi::IpConnectionType::Datacenter;
    let same_trusted_provider: bool =
        !comparison.different_providers && !unknown && ip1.country_code == ip2.country_code && !datacenter(ip1) && !datacenter(ip2);
    if same_trusted_provider {
        logger.info(|| {
            LogRecord::msg("Skipping city and distance IP validation rules for same trusted provider")
                .with_data(json!({ "provider": ip1.provider, "countryCode": ip1.country_code }))
        });
    }
    if !same_trusted_provider && ip1.city != ip2.city {
        conditions.push(Condition {
            action: actions.city_change_action,
            message: format!("City changed from {} to {}", shown(&ip1.city), shown(&ip2.city)),
        });
    }
    if comparison.different_providers {
        conditions.push(Condition {
            action: actions.isp_change_action,
            message: format!("ISP changed from {} to {}", shown(&ip1.provider), shown(&ip2.provider)),
        });
    }
    if let Some(distance_km) = comparison.distance_km.map(|distance| distance.get()).filter(|distance| !same_trusted_provider && *distance > distance_threshold_km) {
        conditions.push(Condition {
            action: actions.distance_exceed_action,
            message: format!(
                "IP addresses are {}km apart (>{}km limit)",
                to_fixed(distance_km, 2),
                number_to_string(distance_threshold_km)
            ),
        });
    }
    let worst_abuse_score: Option<f64> =
        [ip2.abuser_score, ip1.abuser_score].into_iter().flatten().map(|score| score.get()).fold(None, |worst, score| Some(worst.map_or(score, |worst: f64| worst.max(score))));
    if let Some(worst) = worst_abuse_score.filter(|worst| *worst > abuse_score_threshold) {
        conditions.push(Condition {
            action: actions.abuse_score_exceed_action,
            message: format!("Abuse score {} exceeds threshold {}", to_fixed(worst, 4), number_to_string(abuse_score_threshold)),
        });
    }
    if conditions.is_empty() {
        return RuleEvaluation {
            action: IPValidationAction::Allow,
            error_message: None,
            should_flag: None,
        };
    }
    let mut messages: Vec<String> = Vec::new();
    let mut final_action: IPValidationAction = IPValidationAction::Allow;
    let mut should_flag: bool = false;
    if require_all_conditions {
        let rejecting: usize = conditions.iter().filter(|condition| condition.action == IPValidationAction::Reject).count();
        if rejecting > 0 && rejecting >= reject_actions {
            final_action = IPValidationAction::Reject;
        }
        messages.extend(
            conditions
                .iter()
                .filter(|condition| matches!(condition.action, IPValidationAction::Reject | IPValidationAction::Flag))
                .map(|condition| condition.message.clone()),
        );
    } else {
        for condition in &conditions {
            if condition.action == IPValidationAction::Reject {
                final_action = IPValidationAction::Reject;
                messages.push(condition.message.clone());
                break;
            }
            if condition.action == IPValidationAction::Flag {
                final_action = IPValidationAction::Flag;
                should_flag = true;
            }
            messages.push(condition.message.clone());
        }
    }
    logger.info(|| {
        LogRecord::msg(format!("IP validation rules evaluated: {}", final_action.as_str())).with_data(json!({
            "conditions": conditions.iter().map(|condition| json!({ "met": true, "action": condition.action.as_str(), "message": condition.message })).collect::<Vec<_>>(),
            "finalAction": final_action.as_str(),
            "requireAllConditions": require_all_conditions,
        }))
    });
    RuleEvaluation {
        action: final_action,
        error_message: (!messages.is_empty()).then(|| messages.join("; ")),
        should_flag: Some(should_flag),
    }
}

/// `deepValidateIpAddress`: `validateIpAddress`, and for an address that merely differs, how
/// far apart and how different the two are, judged by the site's rules (or, without any, a
/// 1000 km limit).
pub async fn deep_validate_ip_address(
    ip: &str,
    challenge: &IpAddress,
    logger: &Logger,
    service: &dyn IpInfoLookup,
    rules: Option<&IPValidationRules>,
    dns_peer_ip: Option<&str>,
) -> IpCheck {
    let mut bindings: LogObject = LogObject::new();
    bindings.insert("challengeIp".to_string(), json!(challenge.address()));
    bindings.insert("providedIp".to_string(), json!(ip));
    let log: Logger = logger.with(&bindings, None);
    let force_consistent_ip: bool = rules.is_some_and(|rules| rules.force_consistent_ip);
    if let Some(peer) = dns_peer_ip.filter(|peer| force_consistent_ip && !peer.is_empty() && *peer != ip) {
        logger.info(|| {
            LogRecord::msg("IP validation failed - dnsEvent.peerIp does not match client IP")
                .with_data(json!({ "clientIp": ip, "dnsPeerIp": peer }))
        });
        return IpCheck::invalid(format!("Client IP {ip} does not match dnsEvent.peerIp {peer}"));
    }
    let standard: IpCheck = validate_ip_address(Some(ip), challenge, logger);
    if standard.is_valid {
        return IpCheck::valid();
    }
    if standard.error_message.as_deref().is_some_and(|message| message.contains("Invalid IP address")) {
        return standard;
    }
    if force_consistent_ip {
        log.info(|| LogRecord::msg("IP validation failed - forceConsistentIp is true"));
        return IpCheck {
            is_valid: false,
            error_message: standard.error_message,
            ..IpCheck::default()
        };
    }
    let comparison: IpComparisonResult = match compare_ips(challenge.address(), ip, service).await {
        IpComparisonResponse::Error(error) => {
            log.error(|| {
                LogRecord::msg("Failed to get IP distance comparison")
                    .with_data(json!({ "error": error.error, "ip1Error": error.ip1_error, "ip2Error": error.ip2_error }))
            });
            return IpCheck {
                is_valid: true,
                error_message: Some("Could not determine IP distance".to_string()),
                ..IpCheck::default()
            };
        }
        IpComparisonResponse::Result(result) => *result,
    };
    if comparison.ips_match {
        return IpCheck::valid();
    }
    let distance_km: Option<f64> = comparison.comparison.as_ref().and_then(|comparison| comparison.distance_km).map(|distance| distance.get());
    let Some(rules) = rules else {
        log.info(|| LogRecord::msg("No IP validation rules provided, using legacy logic").with_data(json!({ "distanceKm": distance_km })));
        if let Some(distance) = distance_km.filter(|distance| *distance > 1000.0) {
            log.info(|| {
                LogRecord::msg("IP validation failed - distance too great")
                    .with_data(json!({ "distanceKm": distance, "comparison": comparison.comparison }))
            });
            return IpCheck {
                is_valid: false,
                error_message: Some(format!("IP addresses are too far apart: {}km (>1000km limit)", to_fixed(distance, 2))),
                distance_km,
                should_flag: None,
            };
        }
        log.info(|| {
            LogRecord::msg("IP addresses differ but within acceptable distance")
                .with_data(json!({ "distanceKm": distance_km, "comparison": comparison.comparison }))
        });
        return IpCheck {
            is_valid: true,
            error_message: None,
            distance_km,
            should_flag: Some(true),
        };
    };
    let evaluation: RuleEvaluation = evaluate_ip_validation_rules(&comparison, rules, logger);
    match evaluation.action {
        IPValidationAction::Reject => IpCheck {
            is_valid: false,
            error_message: evaluation.error_message,
            distance_km,
            should_flag: None,
        },
        IPValidationAction::Flag => IpCheck {
            is_valid: true,
            error_message: evaluation.error_message,
            distance_km,
            should_flag: Some(true),
        },
        IPValidationAction::Allow => IpCheck {
            is_valid: true,
            error_message: None,
            distance_km,
            should_flag: None,
        },
    }
}
