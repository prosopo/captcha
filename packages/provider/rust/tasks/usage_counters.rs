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

//! util/usageCounters.ts: how many captchas each site served and had solved, per IP, user and
//! DNS peer, over rolling windows, as Redis counters that expire with their window.

use prosopo_logger::{LogRecord, Logger};
use prosopo_redis_client::RedisConnection;
use prosopo_types::decision_machine::{encode_counter_key, CounterCaptchaType, CounterDimension, CounterKind, CounterSpec, CounterWindow};
use serde_json::json;
use std::sync::Arc;

/// `INCR_WITH_TTL_LUA`: the expiry is set by the increment that creates the key.
const INCR_WITH_TTL_LUA: &str = "local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return count";

#[derive(Debug, Clone, PartialEq)]
pub struct CounterIncrement {
    pub spec: CounterSpec,
    pub value: String,
}

pub struct UsageCounters {
    connection: RedisConnection,
    logger: Logger,
}

impl UsageCounters {
    pub fn new(connection: RedisConnection, logger: Logger) -> UsageCounters {
        UsageCounters { connection, logger }
    }

    /// `incr`: the count after this increment, or none when Redis is not there.
    pub async fn incr(&self, dapp_account: &str, spec: &CounterSpec, value: &str) -> Option<i64> {
        if !self.connection.is_ready() {
            return None;
        }
        let mut client = self.connection.get_client().await.ok()?;
        let key: String = encode_counter_key(dapp_account, spec, value);
        let counted: Result<i64, redis::RedisError> =
            redis::cmd("EVAL").arg(INCR_WITH_TTL_LUA).arg(1).arg(&key).arg(spec.window.seconds().to_string()).query_async(&mut client).await;
        match counted {
            Ok(count) => Some(count),
            Err(error) => {
                self.logger.warn(|| LogRecord::msg("Counter incr failed").with_err(error.to_string()).with_data(json!({ "key": key })));
                None
            }
        }
    }

    /// `incrManyAsync`: each increment in the background.
    pub fn incr_many_async(self: &Arc<Self>, dapp_account: &str, increments: Vec<CounterIncrement>) {
        for increment in increments {
            let counters: Arc<UsageCounters> = self.clone();
            let dapp_account: String = dapp_account.to_string();
            tokio::spawn(async move {
                counters.incr(&dapp_account, &increment.spec, &increment.value).await;
            });
        }
    }
}

/// `buildAllWindowIncrements`: every window's IP, user and (if different) DNS peer counters,
/// for the captcha type and for all types.
pub fn build_all_window_increments(kind: CounterKind, captcha_type: CounterCaptchaType, ip: &str, user_account: &str, peer_ip: Option<&str>) -> Vec<CounterIncrement> {
    let peer_ip: Option<&str> = peer_ip.filter(|peer| !peer.is_empty() && *peer != ip);
    let mut out: Vec<CounterIncrement> = Vec::new();
    for window in CounterWindow::ALL {
        let mut push = |captcha_type: CounterCaptchaType, dimension: CounterDimension, value: &str| {
            out.push(CounterIncrement { spec: CounterSpec { kind, captcha_type, dimension, window }, value: value.to_string() });
        };
        push(captcha_type, CounterDimension::Ip, ip);
        push(captcha_type, CounterDimension::UserAccount, user_account);
        if let Some(peer_ip) = peer_ip {
            push(captcha_type, CounterDimension::PeerIp, peer_ip);
        }
        if captcha_type != CounterCaptchaType::Any {
            push(CounterCaptchaType::Any, CounterDimension::Ip, ip);
            push(CounterCaptchaType::Any, CounterDimension::UserAccount, user_account);
            if let Some(peer_ip) = peer_ip {
                push(CounterCaptchaType::Any, CounterDimension::PeerIp, peer_ip);
            }
        }
    }
    out
}
