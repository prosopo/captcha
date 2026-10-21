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

use super::hex;
use crate::mnemonic::mnemonic_to_mini_secret;
use crate::secp256k1::{secp256k1_compress, secp256k1_pair_from_seed};
use crate::u8a::u8a_to_hex;

mod compress_spec {
    // Ported from src/secp256k1/compress.spec.ts
    use super::*;

    const COMPRESSED: &str = "0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077";

    #[test]
    fn returns_a_compressed_key_as_is() {
        assert_eq!(secp256k1_compress(&hex(COMPRESSED)), Ok(hex(COMPRESSED)));
    }

    #[test]
    fn compresses_a_known_key() {
        assert_eq!(
            secp256k1_compress(&hex("0x04b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb1307763fe926c273235fd979a134076d00fd1683cbd35868cb485d4a3a640e52184af")),
            Ok(hex(COMPRESSED))
        );
    }
}

mod pair_from_seed_spec {
    // Ported from src/secp256k1/pair/fromSeed.spec.ts
    use super::*;

    const TESTS: [(&str, &str, &str); 4] = [
        ("life fee table ahead modify maximum dumb such tobacco boss dry nurse", "0xf2360e871c830d397fe221382b503f07ddd8763df81a94bb2504390a2fb91f59", "0x036b0aa6beab469dd2b748a0ff5ddbe3d13df1e15c9d28a2aa057212994e127bea"),
        ("tide survey cradle cover column ugly author wait eye state elder blame", "0x5385355a5118ec732b9dbcf1668ba21db38b07cf79082dafa9a7cc4b52e4abb0", "0x03929e4f93cdad265751ad8f6365185d8e937610d19b510400f5867d542d60a313"),
        ("laugh fish flee cake approve butter april dynamic myth license ticket lobster", "0x83ec65cf9a8a7442d808aef6f8987599f1ba3be880769bb3a20621b13adbd476", "0x0388299e4cfaa33d180a026bd54a46ad98df129a131320a9d2fd6f80e64bc3db39"),
        ("animal thing fork recipe exotic pilot inquiry pledge obey slab obtain reveal", "0x0fd50580eb5a58b0eee60c77656dffa50094b539262366f1227d3babfd7343e5", "0x036edc954685ad89f0a23b0fb1eb2b9c3a8600eee9091c758426dfb2bc7889a7c3"),
    ];

    #[test]
    fn generates_a_valid_public_key_secret_key_pair() {
        let seed = hex("0x4380de832af797688026ce24f85204d508243f201650c1a134929e5458b7fbae");
        let pair = secp256k1_pair_from_seed(&seed).expect("valid seed");
        assert_eq!(
            pair.public_key,
            hex("0x03fd8c74f795ced92064b86191cb2772b1e3a0947740aa0a5a6e379592471fd85b")
        );
        assert_eq!(pair.secret_key, seed);
    }

    #[test]
    fn creates_valid_pairs_against_known_vectors() {
        for (mnemonic, secret_key, public_key) in TESTS {
            let seed = mnemonic_to_mini_secret(mnemonic, "", None).expect("valid mnemonic");
            let pair = secp256k1_pair_from_seed(&seed).expect("valid seed");
            assert_eq!(u8a_to_hex(&pair.secret_key), secret_key);
            assert_eq!(u8a_to_hex(&pair.public_key), public_key);
        }
    }
}
