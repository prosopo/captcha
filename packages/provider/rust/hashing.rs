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

//! hashUserAgent.ts and hashUserIp.ts.

use sha2::{Digest, Sha256};

/// `hashUserAgent`: the first 32 hex digits of the SHA-256 of the user agent, short enough
/// for an RSA-OAEP payload.
pub fn hash_user_agent(user_agent: &str) -> String {
    hex::encode(Sha256::digest(user_agent.as_bytes()))[..32].to_string()
}

/// `hashUserIp`: the SHA-256 of `user:ip:sitekey`, which keys a frictionless session.
pub fn hash_user_ip(user: &str, ip: &str, sitekey: &str) -> String {
    hex::encode(Sha256::digest(format!("{user}:{ip}:{sitekey}").as_bytes()))
}
