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

//! keyring/pairs.ts: pairs keyed by public key, so any encoding of an address finds them.

use crate::error::{err, Result};
use crate::pair::KeyringPair;
use prosopo_util_crypto::u8a::{is_hex, u8a_to_hex, u8a_to_u8a};
use prosopo_util_crypto::{decode_address, U8aLike};

/// In insertion order, as `Object.values` lists the TS map: replacing a pair keeps its place.
#[derive(Clone, Debug, Default)]
pub struct Pairs {
    entries: Vec<(Vec<u8>, KeyringPair)>,
}

fn key(address: U8aLike<'_>) -> Result<Vec<u8>> {
    Ok(decode_address(Some(address), false, None)?)
}

impl Pairs {
    pub fn new() -> Pairs {
        Pairs::default()
    }

    pub fn add(&mut self, pair: KeyringPair) -> Result<KeyringPair> {
        let address: String = pair.address()?;
        let key: Vec<u8> = key(U8aLike::Str(&address))?;
        match self.entries.iter_mut().find(|(stored, _)| *stored == key) {
            Some(entry) => entry.1 = pair.clone(),
            None => self.entries.push((key, pair.clone())),
        }
        Ok(pair)
    }

    pub fn all(&self) -> Vec<KeyringPair> {
        self.entries.iter().map(|(_, pair)| pair.clone()).collect()
    }

    pub fn get(&self, address: U8aLike<'_>) -> Result<KeyringPair> {
        let key: Vec<u8> = key(address)?;
        match self.entries.iter().find(|(stored, _)| *stored == key) {
            Some((_, pair)) => Ok(pair.clone()),
            None => {
                let shown: String = match address {
                    U8aLike::Str(text) if !is_hex(text) => text.to_string(),
                    _ => u8a_to_hex(&u8a_to_u8a(address)),
                };
                err(format!("Unable to retrieve keypair '{shown}'"))
            }
        }
    }

    pub fn remove(&mut self, address: U8aLike<'_>) -> Result<()> {
        let key: Vec<u8> = key(address)?;
        self.entries.retain(|(stored, _)| *stored != key);
        Ok(())
    }
}
