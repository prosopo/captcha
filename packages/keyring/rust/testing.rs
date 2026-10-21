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

//! keyring/testing.ts and testingPairs.ts: the well-known dev accounts, for tests.

use crate::error::{err, Result};
use crate::keyring::Keyring;
use crate::pair::{create_pair, nobody, KeyringPair};
use prosopo_types::keyring::{KeyringOptions, KeyringPairMeta};
use prosopo_util_crypto::u8a::hex_to_u8a;
use prosopo_util_crypto::Keypair;
use serde_json::Value;
use std::collections::BTreeMap;

pub struct PairDef {
    pub name: Option<&'static str>,
    /// The public key.
    pub p: &'static str,
    /// The secret key, in the clear: these are test accounts.
    pub s: &'static str,
    pub seed: Option<&'static str>,
}

const fn def(p: &'static str, s: &'static str, seed: &'static str) -> PairDef {
    PairDef {
        name: None,
        p,
        s,
        seed: Some(seed),
    }
}

pub const PAIRSSR25519: [PairDef; 8] = [
    def(
        "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
        "0x98319d4ff8a9508c4bb0cf0b5a78d760a0b2082c02775e6e82370816fedfff48925a225d97aa00682d6a59b95b18780c10d7032336e88f3442b42361f4a66011", // nosemgrep
        "Alice",
    ),
    def(
        "0xbe5ddb1579b72e84524fc29e78609e3caf42e85aa118ebfe0b0ad404b5bdd25f",
        "0xe8da6c9d810e020f5e3c7f5af2dea314cbeaa0d72bc6421e92c0808a0c584a6046ab28e97c3ffc77fe12b5a4d37e8cd4afbfebbf2391ffc7cb07c0f38c023efd", // nosemgrep
        "Alice//stash",
    ),
    def(
        "0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48",
        "0x081ff694633e255136bdb456c20a5fc8fed21f8b964c11bb17ff534ce80ebd5941ae88f85d0c1bfc37be41c904e1dfc01de8c8067b0d6d5df25dd1ac0894a325", // nosemgrep
        "Bob",
    ),
    def(
        "0xfe65717dad0447d715f660a0a58411de509b42e6efb8375f562f58a554d5860e",
        "0xc006507cdfc267a21532394c49ca9b754ca71de21e15a1cdf807c7ceab6d0b6c3ed408d9d35311540dcd54931933e67cf1ea10d46f75408f82b789d9bd212fde", // nosemgrep
        "Bob//stash",
    ),
    def(
        "0x90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe22",
        "0xa8f2d83016052e5d6d77b2f6fd5d59418922a09024cda701b3c34369ec43a7668faf12ff39cd4e5d92bb773972f41a7a5279ebc2ed92264bed8f47d344f8f18c", // nosemgrep
        "Charlie",
    ),
    def(
        "0x306721211d5404bd9da88e0204360a1a9ab8b87c66c1bc2fcdd37f3c2222cc20",
        "0x20e05482ca4677e0edbc58ae9a3a59f6ed3b1a9484ba17e64d6fe8688b2b7b5d108c4487b9323b98b11fe36cb301b084e920f7b7895536809a6d62a451b25568", // nosemgrep
        "Dave",
    ),
    def(
        "0xe659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4e",
        "0x683576abfd5dc35273e4264c23095a1bf21c14517bece57c7f0cc5c0ed4ce06a3dbf386b7828f348abe15d76973a72009e6ef86a5c91db2990cb36bb657c6587", // nosemgrep
        "Eve",
    ),
    def(
        "0x1cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c",
        "0xb835c20f450079cf4f513900ae9faf8df06ad86c681884122c752a4b2bf74d4303e4f21bc6cc62bb4eeed5a9cce642c25e2d2ac1464093b50f6196d78e3a7426", // nosemgrep
        "Ferdie",
    ),
];

/// `Alice//stash` is named `alice_stash`, the name the rest of the stack looks it up by.
fn create_meta(name: Option<&str>, seed: Option<&str>) -> Result<KeyringPairMeta> {
    let name: String = match (name.filter(|name| !name.is_empty()), seed) {
        (Some(name), _) => name.to_string(),
        (None, Some(seed)) if !seed.is_empty() => seed.replacen("//", "_", 1).to_lowercase(),
        _ => return err("Testing pair should have either a name or a seed"),
    };
    let mut meta: KeyringPairMeta = KeyringPairMeta::new();
    meta.insert("isTesting".to_string(), Value::Bool(true));
    meta.insert("name".to_string(), Value::String(name));
    Ok(meta)
}

/// `createTestKeyring`: a keyring holding every dev account, unlocked for good. With
/// `is_derived` false, a pair is derived from its bare seed name instead, which pads it into a
/// raw seed, so those pairs are not the well-known accounts.
pub fn create_test_keyring(options: KeyringOptions, is_derived: bool) -> Result<Keyring> {
    let mut keyring: Keyring = Keyring::new(options)?;
    for PairDef { name, p, s, seed } in &PAIRSSR25519 {
        let meta: KeyringPairMeta = create_meta(*name, *seed)?;
        let pair: KeyringPair = match (is_derived, name, seed) {
            (false, None, Some(seed)) => keyring.add_from_uri(seed, meta, options.kind)?,
            _ => {
                let keypair: Keypair = Keypair {
                    public_key: hex_to_u8a(p),
                    secret_key: hex_to_u8a(s),
                };
                let pair: KeyringPair = create_pair(keyring.ss58(), keypair, meta, None, None);
                keyring.add_pair(pair)?
            }
        };
        pair.disable_lock();
    }
    Ok(keyring)
}

/// `createTestPairs`: the test keyring's pairs by name, plus `nobody`.
pub fn create_test_pairs(
    options: KeyringOptions,
    is_derived: bool,
) -> Result<BTreeMap<String, KeyringPair>> {
    let keyring: Keyring = create_test_keyring(options, is_derived)?;
    let mut map: BTreeMap<String, KeyringPair> = BTreeMap::new();
    map.insert("nobody".to_string(), nobody());
    for pair in keyring.pairs() {
        if let Some(Value::String(name)) = pair.meta().get("name") {
            if !name.is_empty() {
                map.insert(name.clone(), pair.clone());
            }
        }
    }
    Ok(map)
}
