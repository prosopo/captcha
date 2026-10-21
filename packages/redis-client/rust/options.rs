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

//! node-redis's `createClient({ url, password, socket: { keepAliveInitialDelay: 5000 },
//! commandOptions: { timeout: undefined } })`, resolved the way node-redis 6.3 resolves it and
//! then mapped onto redis-rs.

use crate::error::RedisClientError;
use crate::js::{decode_uri_component, number_to_js_string, string_to_js_number};
use redis::aio::ConnectionManagerConfig;
use redis::io::tcp::{socket2::TcpKeepalive, TcpSettings};
use redis::{
    ConnectionAddr, ConnectionInfo, IntoConnectionInfo, ProtocolVersion, RedisConnectionInfo,
};
use std::time::Duration;
use url::Url;

const DEFAULT_HOST: &str = "localhost";
const DEFAULT_PORT: u16 = 6379;
pub(crate) const KEEP_ALIVE_INITIAL_DELAY: Duration = Duration::from_millis(5000);
pub(crate) const CONNECT_TIMEOUT: Duration = Duration::from_millis(5000);
pub(crate) const RECONNECT_MIN_DELAY: Duration = Duration::from_millis(50);
pub(crate) const RECONNECT_MAX_DELAY: Duration = Duration::from_millis(2000);
const RECONNECT_EXPONENT_BASE: f32 = 2.0;
const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

/// What node-redis's `createClient({ url, password })` resolves to before connecting.
/// `None` means node-redis leaves the option unset and its default applies.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ResolvedClientOptions {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub path: Option<String>,
    pub tls: Option<bool>,
    pub database: Option<f64>,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Default)]
struct ParsedUrl {
    host: Option<String>,
    port: Option<u16>,
    path: Option<String>,
    tls: bool,
    database: Option<f64>,
    credentials: Option<(Option<String>, Option<String>)>,
}

fn type_error(message: impl Into<String>) -> RedisClientError {
    RedisClientError::InvalidOptions {
        name: "TypeError",
        message: message.into(),
    }
}

fn decode(component: &str) -> Result<String, RedisClientError> {
    decode_uri_component(component).ok_or(RedisClientError::InvalidOptions {
        name: "URIError",
        message: "URI malformed".to_string(),
    })
}

fn decode_credentials(
    username: &str,
    password: &str,
) -> Result<Option<(Option<String>, Option<String>)>, RedisClientError> {
    if username.is_empty() && password.is_empty() {
        return Ok(None);
    }
    let username = (!username.is_empty())
        .then(|| decode(username))
        .transpose()?;
    let password = (!password.is_empty())
        .then(|| decode(password))
        .transpose()?;
    Ok(Some((username, password)))
}

fn strip_ipv6_brackets(hostname: &str) -> &str {
    hostname
        .strip_prefix('[')
        .and_then(|h| h.strip_suffix(']'))
        .filter(|h| {
            !h.is_empty()
                && h.bytes()
                    .all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f' | b':'))
        })
        .unwrap_or(hostname)
}

/// `RedisClient.parseURL` for `redis:` / `rediss:` URLs.
fn parse_tcp_url(url: &str) -> Result<ParsedUrl, RedisClientError> {
    let parsed = Url::parse(url).map_err(|_| type_error("Invalid URL"))?;
    let host = strip_ipv6_brackets(parsed.host_str().unwrap_or("")).to_string();
    let protocol = format!("{}:", parsed.scheme());
    if protocol != "redis:" && protocol != "rediss:" {
        return Err(type_error(format!(
            "Protocol - {protocol} - is not a valid Redis protocol. Expected redis: or rediss:"
        )));
    }
    let credentials = decode_credentials(parsed.username(), parsed.password().unwrap_or(""))?;
    let pathname = parsed.path();
    let database = if pathname.chars().count() > 1 {
        let database = string_to_js_number(&pathname[1..]);
        if database.is_nan() {
            return Err(type_error("Invalid pathname"));
        }
        Some(database)
    } else {
        None
    };
    Ok(ParsedUrl {
        host: Some(host),
        port: parsed.port(),
        path: None,
        tls: protocol == "rediss:",
        database,
        credentials,
    })
}

fn is_line_terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

/// The pieces of `^unix:\/\/(?:([^:@/]*)(?::([^@/]*))?@)?(\/[^?#]*)(?:\?([^#]*))?(?:#.*)?$`.
struct UnixUrlParts<'a> {
    username: &'a str,
    password: &'a str,
    path: &'a str,
    query: Option<&'a str>,
}

fn match_unix_url(url: &str) -> Option<UnixUrlParts<'_>> {
    let rest = url.strip_prefix("unix://")?;
    let (username, password, rest) = match rest.find(['@', '/']) {
        Some(at) if rest.as_bytes()[at] == b'@' && rest[at + 1..].starts_with('/') => {
            let userinfo = &rest[..at];
            let (username, password) = userinfo.split_once(':').unwrap_or((userinfo, ""));
            (username, password, &rest[at + 1..])
        }
        _ => ("", "", rest),
    };
    if !rest.starts_with('/') {
        return None;
    }
    let path_end = rest.find(['?', '#']).unwrap_or(rest.len());
    let (path, rest) = rest.split_at(path_end);
    let (query, fragment) = match rest.strip_prefix('?') {
        Some(after) => {
            let query_end = after.find('#').unwrap_or(after.len());
            (Some(&after[..query_end]), &after[query_end..])
        }
        None => (None, rest),
    };
    if fragment.chars().any(is_line_terminator) {
        return None;
    }
    Some(UnixUrlParts {
        username,
        password,
        path,
        query,
    })
}

/// `RedisClient.#parseUnixURL`.
fn parse_unix_url(url: &str) -> Result<ParsedUrl, RedisClientError> {
    let parts = match_unix_url(url)
        .filter(|parts| parts.path != "/")
        .ok_or_else(|| type_error("Invalid unix URL"))?;
    let path = decode(parts.path)?;
    let credentials = decode_credentials(parts.username, parts.password)?;
    let mut database = None;
    if let Some(query) = parts.query.filter(|q| !q.is_empty()) {
        let db = url::form_urlencoded::parse(query.as_bytes())
            .find(|(key, _)| key == "db")
            .map(|(_, value)| value.into_owned());
        if let Some(db) = db {
            let value = string_to_js_number(&db);
            if value.is_nan() {
                return Err(type_error("Invalid db query parameter"));
            }
            database = Some(value);
        }
    }
    Ok(ParsedUrl {
        path: Some(path),
        database,
        credentials,
        ..ParsedUrl::default()
    })
}

/// node-redis's option handling in `createClient`: credentials in the URL replace the
/// `password` option entirely (even when the URL has only a username), and an empty `url` is
/// ignored.
pub(crate) fn resolve_client_options(
    url: Option<&str>,
    password: Option<&str>,
) -> Result<ResolvedClientOptions, RedisClientError> {
    let option_credentials = password
        .filter(|p| !p.is_empty())
        .map(|p| (None, Some(p.to_string())));
    let Some(url) = url.filter(|u| !u.is_empty()) else {
        let (username, password) = option_credentials.unwrap_or((None, None));
        return Ok(ResolvedClientOptions {
            host: None,
            port: None,
            path: None,
            tls: None,
            database: None,
            username,
            password,
        });
    };
    let parsed = if url.starts_with("unix:") {
        parse_unix_url(url)?
    } else {
        parse_tcp_url(url)?
    };
    let (username, password) = parsed
        .credentials
        .or(option_credentials)
        .unwrap_or((None, None));
    Ok(ResolvedClientOptions {
        host: parsed.host,
        port: parsed.port,
        path: parsed.path,
        tls: Some(parsed.tls),
        database: parsed.database,
        username,
        password,
    })
}

impl ResolvedClientOptions {
    /// node-redis only sends `SELECT` when the number is truthy.
    fn database_index(&self) -> Result<i64, RedisClientError> {
        match self.database {
            None => Ok(0),
            Some(db) if db == 0.0 => Ok(0),
            Some(db) if db.fract() == 0.0 && db.abs() <= MAX_SAFE_INTEGER => Ok(db as i64),
            Some(db) => Err(RedisClientError::UnsupportedDatabase(number_to_js_string(
                db,
            ))),
        }
    }

    pub(crate) fn connection_info(&self) -> Result<ConnectionInfo, RedisClientError> {
        let addr: ConnectionAddr = match &self.path {
            Some(path) => ConnectionAddr::Unix(path.into()),
            None => {
                let host: String = self
                    .host
                    .clone()
                    .filter(|host: &String| !host.is_empty())
                    .unwrap_or_else(|| DEFAULT_HOST.to_string());
                let port: u16 = self.port.unwrap_or(DEFAULT_PORT);
                if self.tls == Some(true) {
                    ConnectionAddr::TcpTls {
                        host,
                        port,
                        insecure: false,
                        tls_params: None,
                    }
                } else {
                    ConnectionAddr::Tcp(host, port)
                }
            }
        };
        let mut redis_settings: RedisConnectionInfo = RedisConnectionInfo::default()
            .set_db(self.database_index()?)
            .set_protocol(ProtocolVersion::RESP3);
        if let Some(username) = &self.username {
            redis_settings = redis_settings.set_username(username);
        }
        if let Some(password) = &self.password {
            redis_settings = redis_settings.set_password(password);
        }
        let tcp_settings: TcpSettings = TcpSettings::default()
            .set_nodelay(true)
            .set_keepalive(TcpKeepalive::new().with_time(KEEP_ALIVE_INITIAL_DELAY));
        Ok(addr
            .into_connection_info()?
            .set_redis_settings(redis_settings)
            .set_tcp_settings(tcp_settings))
    }
}

/// node-redis's connect timeout and default reconnect strategy (`min(2^n * 50, 2000)` ms plus
/// jitter, never giving up), with no command timeout.
pub(crate) fn connection_manager_config() -> ConnectionManagerConfig {
    ConnectionManagerConfig::new()
        .set_connection_timeout(Some(CONNECT_TIMEOUT))
        .set_response_timeout(None)
        .set_min_delay(RECONNECT_MIN_DELAY)
        .set_max_delay(RECONNECT_MAX_DELAY)
        .set_exponent_base(RECONNECT_EXPONENT_BASE)
        .set_number_of_retries(usize::MAX)
}
