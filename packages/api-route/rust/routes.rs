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

use std::sync::Arc;

use indexmap::IndexMap;

use crate::endpoint::DynApiEndpoint;

/// Route path to endpoint, in insertion order (the order the TS record's keys iterate in, for
/// any key that is not an integer-like string; route paths always start with `/`).
pub type ApiRoutes = IndexMap<String, Arc<dyn DynApiEndpoint>>;

/// A method rather than a field, so a provider can build its routes lazily once its own
/// dependencies are ready.
pub trait ApiRoutesProvider {
    fn get_routes(&self) -> ApiRoutes;
}
