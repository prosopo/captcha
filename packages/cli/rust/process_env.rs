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

//! process.env.ts: the account settings of the provider (`who` "PROVIDER") and the admin.

use crate::config::Environment;
use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};

fn who(who: Option<&str>) -> String {
    who.filter(|who| !who.is_empty()).map_or_else(|| "PROVIDER".to_string(), str::to_uppercase)
}

/// `getAddress`: `PROSOPO_<WHO>_ADDRESS`.
pub fn get_address(env: &Environment, account: Option<&str>) -> Option<String> {
    env.get(&format!("PROSOPO_{}_ADDRESS", who(account)))
}

/// `getPassword`: `PROSOPO_<WHO>_ACCOUNT_PASSWORD`.
pub fn get_password(env: &Environment, account: Option<&str>) -> Option<String> {
    env.get(&format!("PROSOPO_{}_ACCOUNT_PASSWORD", who(account)))
}

/// `getSecret`: the first set of the mnemonic, seed, URI and JSON key file.
pub fn get_secret(env: &Environment, account: Option<&str>) -> Option<String> {
    let who: String = who(account);
    ["MNEMONIC", "SEED", "URI", "JSON"].iter().find_map(|kind| env.truthy(&format!("PROSOPO_{who}_{kind}")))
}

/// `getDB`: the database host, which the provider will not start without.
pub fn get_db(env: &Environment) -> Result<String, ProsopoError> {
    env.truthy("PROSOPO_DATABASE_HOST")
        .ok_or_else(|| ProsopoError::new(ErrorClass::Env, ErrorSource::key("DATABASE.DATABASE_HOST_UNDEFINED"), ErrorOptions::default()))
}
