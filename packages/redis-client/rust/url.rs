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

use url::Url;

const UNPARSEABLE_URL: &str = "[unparseable redis url]";

/// Credentials in the URL (`redis://user:password@host`) must never reach the logs, and an
/// unparseable URL is logged as a placeholder rather than echoed.
pub fn redact_redis_url(url: Option<&str>) -> Option<String> {
    let url = url?;
    let Ok(mut parsed) = Url::parse(url) else {
        return Some(UNPARSEABLE_URL.to_string());
    };
    if !parsed.username().is_empty() && parsed.set_username("redacted").is_err() {
        return Some(UNPARSEABLE_URL.to_string());
    }
    if parsed.password().is_some_and(|p| !p.is_empty())
        && parsed.set_password(Some("redacted")).is_err()
    {
        return Some(UNPARSEABLE_URL.to_string());
    }
    Some(parsed.to_string())
}
