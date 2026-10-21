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

//! What the layers put on a request for the ones after them, as express puts `req.body`,
//! `req.logger`, `req.requestId` and `req.i18n`.

use prosopo_locale::{FixedT, I18n};
use prosopo_logger::Logger;
use serde_json::Value;
use std::sync::Arc;

/// `req.body`, as the JSON body parser left it. Absent when no body parser ran, which the
/// adapter hands on as an absent (`undefined`) body.
#[derive(Debug, Clone, PartialEq)]
pub struct RequestBody(pub Value);

/// `req.logger` and `req.requestId`.
#[derive(Clone)]
pub struct RequestLog {
    pub logger: Logger,
    pub request_id: String,
}

/// `req.i18n`: the server's catalogues and the language this request is served in.
#[derive(Clone)]
pub struct RequestI18n {
    pub i18n: Arc<I18n>,
    pub language: String,
}

impl RequestI18n {
    pub fn lookup(&self) -> FixedT<'_> {
        self.i18n.fixed_t(&self.language)
    }
}
