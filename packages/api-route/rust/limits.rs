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

use std::borrow::Cow;
use std::fmt;

use serde::ser::SerializeMap;
use serde::{Deserialize, Serialize, Serializer};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRouteLimit {
    pub window_ms: u64,
    pub limit: u64,
}

/// A route enum usable as the key of [`ApiRouteLimits`]: the TS `Enum extends string | number`.
pub trait RouteKey: Copy + Eq + 'static {
    /// Every member; a limits table always has exactly one limit per member.
    const ALL: &'static [Self];

    /// The record key: the member's string value, or its number in decimal.
    fn route_key(self) -> Cow<'static, str>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MissingRouteLimit(pub String);

impl fmt::Display for MissingRouteLimit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "missing rate limit for route {}", self.0)
    }
}

impl std::error::Error for MissingRouteLimit {}

/// `Record<Enum, ApiRouteLimit>`: total over the enum, so no route is silently unlimited.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiRouteLimits<E: RouteKey> {
    /// Parallel to `E::ALL`.
    limits: Vec<ApiRouteLimit>,
    route: std::marker::PhantomData<E>,
}

impl<E: RouteKey> ApiRouteLimits<E> {
    pub fn new(mut limit_for: impl FnMut(E) -> ApiRouteLimit) -> ApiRouteLimits<E> {
        ApiRouteLimits {
            limits: E::ALL.iter().map(|route| limit_for(*route)).collect(),
            route: std::marker::PhantomData,
        }
    }

    /// `Object.fromEntries`: a later entry for the same route wins. Errors on the first route
    /// (in `E::ALL` order) that has no entry.
    pub fn from_entries(
        entries: impl IntoIterator<Item = (E, ApiRouteLimit)>,
    ) -> Result<ApiRouteLimits<E>, MissingRouteLimit> {
        let mut found: Vec<Option<ApiRouteLimit>> = vec![None; E::ALL.len()];
        for (route, limit) in entries {
            if let Some(index) = E::ALL.iter().position(|member| *member == route) {
                found[index] = Some(limit);
            }
        }
        let limits = found
            .into_iter()
            .zip(E::ALL)
            .map(|(limit, route)| {
                limit.ok_or_else(|| MissingRouteLimit(route.route_key().into_owned()))
            })
            .collect::<Result<Vec<ApiRouteLimit>, MissingRouteLimit>>()?;
        Ok(ApiRouteLimits {
            limits,
            route: std::marker::PhantomData,
        })
    }

    pub fn get(&self, route: E) -> &ApiRouteLimit {
        let index = E::ALL
            .iter()
            .position(|member| *member == route)
            .expect("RouteKey::ALL lists every member");
        &self.limits[index]
    }

    /// In `E::ALL` order.
    pub fn iter(&self) -> impl Iterator<Item = (E, &ApiRouteLimit)> {
        E::ALL.iter().copied().zip(self.limits.iter())
    }

    /// `Object.keys` order: integer-like keys ascending first, then the rest in `E::ALL` order.
    pub fn keys(&self) -> Vec<Cow<'static, str>> {
        self.js_ordered().into_iter().map(|(key, _)| key).collect()
    }

    fn js_ordered(&self) -> Vec<(Cow<'static, str>, &ApiRouteLimit)> {
        let mut entries: Vec<(Cow<'static, str>, &ApiRouteLimit)> = self
            .iter()
            .map(|(route, limit)| (route.route_key(), limit))
            .collect();
        entries.sort_by_key(|(key, _)| array_index(key).map_or((1, 0), |index| (0, index)));
        entries
    }
}

/// JS treats a property key as an array index (and orders it first) when it is the canonical
/// decimal form of an integer below 2^32 - 1.
fn array_index(key: &str) -> Option<u64> {
    let canonical = key == "0" || (!key.starts_with('0') && !key.is_empty());
    if !canonical || !key.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    key.parse::<u64>()
        .ok()
        .filter(|index| *index < u64::from(u32::MAX))
}

impl<E: RouteKey> Serialize for ApiRouteLimits<E> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let entries = self.js_ordered();
        let mut map = serializer.serialize_map(Some(entries.len()))?;
        for (key, limit) in entries {
            map.serialize_entry(key.as_ref(), limit)?;
        }
        map.end()
    }
}
