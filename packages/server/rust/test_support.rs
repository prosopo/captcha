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

//! What the unit and equivalence tests share: a transport that records each request and
//! answers it from a script, and a fixed provider list.

use prosopo_api::{ApiError, HttpRequest, HttpResponse, Transport, TransportFuture};
use prosopo_keyring::{FromAddress, Keyring, KeyringPair};
use prosopo_load_balancer::{
    HardcodedProvider, IpMode, LoadFuture, LoadProviders, ProviderDirectory,
};
use prosopo_types::config::EnvironmentTypes;
use prosopo_types::keyring::{KeyringOptions, KeyringPairMeta};
use prosopo_util_crypto::U8aLike;
use std::sync::{Arc, Mutex};

pub const ALICE: &str = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

#[derive(Clone)]
pub enum Reply {
    Response(HttpResponse),
    Failure(ApiError),
    Stall,
}

pub fn json_reply(body: &str) -> Reply {
    Reply::Response(HttpResponse {
        status: 200,
        status_text: "OK".to_string(),
        url: String::new(),
        content_type: Some("application/json".to_string()),
        body: body.as_bytes().to_vec(),
    })
}

/// Answers every request with `reply`, recording what was sent.
pub struct ScriptedTransport {
    reply: Reply,
    requests: Arc<Mutex<Vec<HttpRequest>>>,
}

impl ScriptedTransport {
    pub fn new(reply: Reply) -> (Arc<ScriptedTransport>, Arc<Mutex<Vec<HttpRequest>>>) {
        let requests: Arc<Mutex<Vec<HttpRequest>>> = Arc::new(Mutex::new(Vec::new()));
        let transport: Arc<ScriptedTransport> = Arc::new(ScriptedTransport {
            reply,
            requests: Arc::clone(&requests),
        });
        (transport, requests)
    }
}

impl Transport for ScriptedTransport {
    fn send(&self, request: HttpRequest) -> TransportFuture {
        let url: String = request.url.clone();
        self.requests.lock().expect("requests lock").push(request);
        let reply: Reply = self.reply.clone();
        Box::pin(async move {
            match reply {
                Reply::Response(response) => Ok(HttpResponse { url, ..response }),
                Reply::Failure(error) => Err(error),
                Reply::Stall => std::future::pending().await,
            }
        })
    }
}

struct FixedProviders(Vec<HardcodedProvider>);

impl LoadProviders for FixedProviders {
    fn load(&self, _environment: EnvironmentTypes, _ip_mode: Option<IpMode>) -> LoadFuture {
        let providers: Vec<HardcodedProvider> = self.0.clone();
        Box::pin(async move { Ok(providers) })
    }
}

/// A directory over one list, whatever the environment and ip mode.
pub fn provider_directory(providers: Vec<HardcodedProvider>) -> Arc<ProviderDirectory> {
    Arc::new(ProviderDirectory::new(Arc::new(FixedProviders(providers))))
}

pub fn provider(address: &str, url: &str, dataset_id: &str) -> HardcodedProvider {
    HardcodedProvider {
        address: address.to_string(),
        url: url.to_string(),
        dataset_id: dataset_id.to_string(),
        weight: 1,
    }
}

fn keyring() -> Keyring {
    Keyring::new(KeyringOptions::default()).expect("an sr25519 keyring")
}

pub fn alice() -> KeyringPair {
    keyring()
        .add_from_uri("//Alice", KeyringPairMeta::new(), None)
        .expect("//Alice")
}

/// A pair with no secret, which cannot sign.
pub fn watch_only(address: &str) -> KeyringPair {
    keyring()
        .add_from_address(U8aLike::Str(address), FromAddress::default())
        .expect("a valid address")
}
