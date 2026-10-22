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

//! utils/dns.ts: what a domain's CNAME and MX records, and its website's redirect, say about it.
//! A lookup that fails is no answer, never an error.

use hickory_resolver::config::{NameServerConfig, ResolverConfig};
use hickory_resolver::net::runtime::TokioRuntimeProvider;
use hickory_resolver::proto::rr::{RData, RecordType};
use hickory_resolver::TokioResolver;
use std::net::{IpAddr, SocketAddr};
use std::time::Duration;

/// Google's and Cloudflare's, when the config names none.
pub const DEFAULT_DNS_SERVERS: [&str; 2] = ["8.8.8.8", "1.1.1.1"];
pub const DEFAULT_HTTPS_TIMEOUT: Duration = Duration::from_millis(1000);

#[derive(Debug, Clone, PartialEq)]
pub struct MxRecord {
    pub priority: u16,
    pub exchange: String,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct RedirectResult {
    pub redirect_url: Option<String>,
    pub tls_error: bool,
    pub timeout: bool,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct DnsCheckResult {
    pub cname: Option<Vec<String>>,
    pub mx: Option<Vec<MxRecord>>,
    pub redirect: RedirectResult,
}

/// A server as `dns.Resolver.setServers` reads one: an IP, `a.b.c.d:port` or `[v6]:port`.
fn server_address(server: &str) -> Option<SocketAddr> {
    if let Ok(ip) = server.parse::<IpAddr>() {
        return Some(SocketAddr::new(ip, 53));
    }
    server.parse::<SocketAddr>().ok()
}

/// A resolver asking only these servers, over UDP then TCP.
fn resolver(servers: &[String]) -> Option<TokioResolver> {
    let name_servers: Vec<NameServerConfig> = servers
        .iter()
        .filter_map(|server| server_address(server))
        .map(|address| {
            let mut config: NameServerConfig = NameServerConfig::udp_and_tcp(address.ip());
            for connection in &mut config.connections {
                connection.port = address.port();
            }
            config
        })
        .collect();
    TokioResolver::builder_with_config(ResolverConfig::from_parts(None, Vec::new(), name_servers), TokioRuntimeProvider::default()).build().ok()
}

fn fully_qualified(domain: &str) -> String {
    if domain.ends_with('.') {
        domain.to_string()
    } else {
        format!("{domain}.")
    }
}

/// The name without its root dot, as Node gives names back.
fn name_text(name: &impl std::fmt::Display) -> String {
    let text: String = name.to_string();
    text.strip_suffix('.').map(str::to_string).unwrap_or(text)
}

/// `checkForCname`.
pub async fn check_for_cname(domain: &str, resolver: &TokioResolver) -> Option<Vec<String>> {
    let lookup = resolver.lookup(fully_qualified(domain).as_str(), RecordType::CNAME).await.ok()?;
    let names: Vec<String> = lookup
        .answers()
        .iter()
        .filter_map(|record| match &record.data {
            RData::CNAME(target) => Some(name_text(&target.0)),
            _ => None,
        })
        .collect();
    (!names.is_empty()).then_some(names)
}

/// `checkForMXRecord`.
pub async fn check_for_mx_record(domain: &str, resolver: &TokioResolver) -> Option<Vec<MxRecord>> {
    let lookup = resolver.lookup(fully_qualified(domain).as_str(), RecordType::MX).await.ok()?;
    let records: Vec<MxRecord> = lookup
        .answers()
        .iter()
        .filter_map(|record| match &record.data {
            RData::MX(mx) => Some(MxRecord { priority: mx.preference, exchange: name_text(&mx.exchange) }),
            _ => None,
        })
        .collect();
    (!records.is_empty()).then_some(records)
}

/// `checkForRedirect`: a 3xx with a `Location` is the URL it points to, resolved against the
/// request's.
pub async fn check_for_redirect(url: &str, timeout: Duration) -> RedirectResult {
    let client = match reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).timeout(timeout).build() {
        Ok(client) => client,
        Err(_) => return RedirectResult::default(),
    };
    match client.get(url).send().await {
        Ok(response) => {
            let location: Option<String> = response.headers().get(reqwest::header::LOCATION).and_then(|value| value.to_str().ok()).map(str::to_string);
            match location.filter(|_| response.status().is_redirection()) {
                Some(location) => RedirectResult {
                    redirect_url: url::Url::parse(url).ok().and_then(|base| base.join(&location).ok()).map(|joined| joined.to_string()),
                    ..RedirectResult::default()
                },
                None => RedirectResult::default(),
            }
        }
        Err(error) if error.is_timeout() => RedirectResult { timeout: true, ..RedirectResult::default() },
        Err(error) => {
            let message: String = format!("{error:?}");
            let tls_error: bool = ["CERT", "SSL", "TLS", "certificate", "EPROTO"].iter().any(|marker| message.contains(marker));
            RedirectResult { tls_error, ..RedirectResult::default() }
        }
    }
}

/// `runDnsChecks`, all three at once.
pub async fn run_dns_checks(domain: &str, dns_servers: Option<&[String]>) -> DnsCheckResult {
    let defaults: Vec<String> = DEFAULT_DNS_SERVERS.iter().map(|server| server.to_string()).collect();
    let resolver: Option<TokioResolver> = resolver(dns_servers.unwrap_or(&defaults));
    let url: String = format!("https://{domain}");
    let (cname, mx, redirect) = tokio::join!(
        async {
            match &resolver {
                Some(resolver) => check_for_cname(domain, resolver).await,
                None => None,
            }
        },
        async {
            match &resolver {
                Some(resolver) => check_for_mx_record(domain, resolver).await,
                None => None,
            }
        },
        check_for_redirect(&url, DEFAULT_HTTPS_TIMEOUT),
    );
    DnsCheckResult { cname, mx, redirect }
}
