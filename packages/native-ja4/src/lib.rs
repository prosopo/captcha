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

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::{Buffer, Error, Status};

/// Compute a JA4 TLS fingerprint from raw ClientHello bytes.
///
/// Delegates to the `prosopo-ja4` crate on crates.io — the same
/// implementation the protect edge stack (bumblebee) uses, so both produce
/// byte-identical fingerprints for the same input.
#[napi(js_name = "calculateJa4")]
pub fn calculate_ja4(data: Buffer) -> napi::Result<String> {
    prosopo_ja4::Ja4::from_client_hello(data.as_ref())
        .map(|parsed| parsed.ja4)
        .map_err(|e| Error::new(Status::InvalidArg, format!("{:?}", e)))
}
