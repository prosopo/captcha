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

//! tasks/dnsEvent/enrichDnsEvent.ts: what the addresses a client's DNS lookup came through
//! say about it.

use crate::api::pipeline::IpInfoLookup;
use crate::tasks::traffic::{is_datacenter_allowlisted, is_datacenter_denylisted, is_private_relay, max_abuser_score, TrafficFilterView};
use prosopo_types::decision_machine::EnrichedDnsEvent;
use prosopo_types::ipapi::{IpInfoResponse, IpInfoResult, ProviderType};

/// A session's `dnsEvent` as enrichment reads it.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct DnsEventAddresses {
    pub peer_ip: Option<String>,
    pub resolver_ip: Option<String>,
    pub path_valid: Option<bool>,
}

/// `enrichDnsEvent`: the event with the peer's and resolver's IP info, each looked up unless
/// it is the client's own address.
pub async fn enrich_dns_event(dns_event: Option<&DnsEventAddresses>, ip_info: &dyn IpInfoLookup, primary_ip: Option<&str>) -> Option<EnrichedDnsEvent> {
    let event: &DnsEventAddresses = dns_event?;
    let other = |ip: &Option<String>| ip.clone().filter(|ip| !ip.is_empty() && Some(ip.as_str()) != primary_ip);
    let (peer, resolver) = (other(&event.peer_ip), other(&event.resolver_ip));
    let (peer_ip_info, resolver_ip_info) = futures_util::join!(
        async {
            match &peer {
                Some(ip) => Some(ip_info.lookup(ip).await),
                None => None,
            }
        },
        async {
            match &resolver {
                Some(ip) => Some(ip_info.lookup(ip).await),
                None => None,
            }
        },
    );
    Some(EnrichedDnsEvent {
        peer_ip: event.peer_ip.clone(),
        resolver_ip: event.resolver_ip.clone(),
        path_valid: event.path_valid,
        peer_ip_info,
        resolver_ip_info,
    })
}

/// `getIpInfoAsn`.
pub fn get_ip_info_asn(info: Option<&IpInfoResponse>) -> Option<f64> {
    match info {
        Some(IpInfoResponse::Valid(info)) => info.asn_number.map(|asn| asn.get()),
        _ => None,
    }
}

/// `extraIpInfosFromEnrichedDnsEvent`: the peer's info, then the resolver's.
pub fn extra_ip_infos_from_enriched_dns_event(enriched: Option<&EnrichedDnsEvent>) -> Vec<IpInfoResponse> {
    enriched.map_or_else(Vec::new, |enriched| enriched.peer_ip_info.iter().chain(enriched.resolver_ip_info.iter()).cloned().collect())
}

fn valid(info: Option<&IpInfoResponse>) -> Option<&IpInfoResult> {
    match info {
        Some(IpInfoResponse::Valid(info)) => Some(info),
        _ => None,
    }
}

fn counts_as_datacenter(info: Option<&IpInfoResponse>, filter: Option<&TrafficFilterView>) -> bool {
    let Some(ip) = valid(info).filter(|ip| ip.is_datacenter == Some(true)) else {
        return false;
    };
    let Some(filter) = filter else {
        return !is_private_relay(ip);
    };
    if filter.datacenter.is_none() {
        return false;
    }
    if is_datacenter_denylisted(ip, filter.datacenter_name_denylist.as_deref()) {
        return true;
    }
    let shielded = |flag: Option<bool>, configured: bool| flag == Some(true) && !configured;
    if shielded(ip.is_vpn, filter.vpn.is_some())
        || shielded(ip.is_proxy, filter.proxy.is_some())
        || shielded(ip.is_tor, filter.tor.is_some())
        || shielded(ip.is_crawler, filter.crawler.is_some())
    {
        return false;
    }
    if ip.provider_type == Some(ProviderType::Isp) {
        return false;
    }
    !is_datacenter_allowlisted(ip, filter.datacenter_name_allowlist.as_deref())
}

fn counts_as_abuser(info: Option<&IpInfoResponse>, filter: Option<&TrafficFilterView>) -> bool {
    let Some(ip) = valid(info).filter(|ip| ip.is_abuser == Some(true)) else {
        return false;
    };
    match filter {
        None => true,
        Some(filter) => filter.abuser.is_some() && max_abuser_score(ip) >= filter.abuser_threshold(),
    }
}

/// `computeDnsAsymmetry`: how far the DNS path disagrees with the connection, from 0 to 1.
pub fn compute_dns_asymmetry(enriched: Option<&EnrichedDnsEvent>, client_ip_info: Option<&IpInfoResponse>, filter: Option<&TrafficFilterView>) -> f64 {
    let Some(enriched) = enriched else {
        return 0.0;
    };
    let resolver: Option<&IpInfoResponse> = enriched.resolver_ip_info.as_ref();
    let peer: Option<&IpInfoResponse> = enriched.peer_ip_info.as_ref();
    let mut score: f64 = 0.0;
    if enriched.path_valid == Some(false) {
        score += 0.3;
    }
    if counts_as_datacenter(resolver, filter) {
        score += 0.3;
    }
    if counts_as_abuser(resolver, filter) {
        score += 0.2;
    }
    if counts_as_datacenter(peer, filter) {
        score += 0.2;
    }
    if counts_as_abuser(peer, filter) {
        score += 0.2;
    }
    let client_is_isp: bool = valid(client_ip_info).is_some_and(|client| client.provider_type == Some(ProviderType::Isp));
    if client_is_isp && counts_as_datacenter(resolver, filter) {
        score += 0.2;
    }
    score.min(1.0)
}
