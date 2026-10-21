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


//! keyring/keyring/types.ts: the options a keyring is built with, and the JSON a pair is
//! exported to and imported from.

use prosopo_util_crypto::address::Prefix;
use prosopo_util_crypto::keystore::EncryptedJsonDescriptor;
use prosopo_util_crypto::KeypairType;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// `KeyringPair$Meta`: free-form, with a few conventional keys such as `name`.
pub type KeyringPairMeta = Map<String, Value>;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct KeyringOptions {
    pub ss58_format: Option<Prefix>,
    pub kind: Option<KeypairType>,
}

/// `KeyringPair$Json`, serialised in the order `toJson` builds it.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct KeyringPairJson {
    pub encoded: String,
    pub encoding: EncryptedJsonDescriptor,
    pub address: String,
    /// A missing `meta` is `{}`, as `createPair`'s default parameter makes it.
    #[serde(default)]
    pub meta: KeyringPairMeta,
}
