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

//! clientMetaData.ts.

use prosopo_types::api_types::ClientMetaData;

/// `toStoredClientMetaData`: the fields stored, empty ones left out, or none when nothing is
/// left, so a record never gains an empty subdocument.
pub fn to_stored_client_meta_data(client_meta_data: Option<&ClientMetaData>) -> Option<ClientMetaData> {
    let present = |value: Option<&String>| value.filter(|value| !value.is_empty()).cloned();
    let stored: ClientMetaData = ClientMetaData {
        hp: present(client_meta_data.and_then(|data| data.hp.as_ref())),
        client_session_id: present(client_meta_data.and_then(|data| data.client_session_id.as_ref())),
    };
    (stored.hp.is_some() || stored.client_session_id.is_some()).then_some(stored)
}

/// `isClientSessionMismatch`: whether the site asked for a session correlation the solve does
/// not carry exactly.
pub fn is_client_session_mismatch(expected: Option<&str>, recorded: Option<&str>) -> bool {
    match expected.filter(|expected| !expected.is_empty()) {
        None => false,
        Some(expected) => recorded != Some(expected),
    }
}
