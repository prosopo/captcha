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

//! Rust port of `@prosopo/keyring`: sr25519 keyring pairs, made from a mnemonic, seed, secret
//! URI or JSON key file, and `getPair`, which the provider loads its account with.

mod accounts;
mod defaults;
mod error;
mod keyring;
mod pair;
mod pairs;
mod testing;

pub use accounts::{generate_mini_secret, generate_mnemonic, get_pair, Secret};
pub use defaults::{PAIR_DIV, PAIR_HDR, PUB_LENGTH, SALT_LENGTH, SEC_LENGTH, SEED_LENGTH};
pub use error::{KeyringError, Result};
pub use keyring::{FromAddress, Keyring, DEV_PHRASE};
pub use pair::{decode_pair, encode_pair, nobody, pair_to_json, KeyringPair};
pub use pairs::Pairs;
pub use testing::{create_test_keyring, create_test_pairs, PairDef, PAIRSSR25519};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod sr25519_cross;
#[cfg(test)]
mod tests;
