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

//! Rust port of `@prosopo/api`, server side: JSON over HTTP with a time budget, and the
//! `ProviderApi` calls the provider (forwarding a verification to the provider that issued
//! the token) and the CLI (registering a site key) make.

mod client;
mod http;

pub use client::{ApiClient, ProviderApi, VERIFY_FORWARDED_HEADER};
pub use http::{
    ApiError, ClientOptions, Headers, HttpClient, HttpError, HttpRequest, HttpResponse,
    RequestOptions, ReqwestTransport, Transport, TransportFuture,
};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
