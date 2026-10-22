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

//! tasks/frictionless/frictionlessTasksUtils.ts.

use prosopo_database::session::ScoreComponents;

/// `computeFrictionlessScore` over the numeric components in order: their sum, at most 1,
/// rounded as `toFixed(2)` rounds. A NaN component makes the score NaN.
pub fn frictionless_score(components: impl IntoIterator<Item = f64>) -> f64 {
    let sum: f64 = components.into_iter().fold(0.0, |sum, value| sum + value);
    let capped: f64 = if sum.is_nan() { f64::NAN } else { sum.min(1.0) };
    prosopo_util::to_fixed(capped, 2).parse::<f64>().unwrap_or(f64::NAN)
}

/// `computeFrictionlessScore` of a session's components, in the order the schema stores them.
pub fn compute_frictionless_score(components: &ScoreComponents) -> f64 {
    let numeric = [
        Some(components.base_score),
        components.l_score,
        components.timeout,
        components.access_policy,
        components.unverified_host,
        components.web_view,
        components.dns_asymmetry,
    ];
    frictionless_score(numeric.into_iter().flatten())
}
