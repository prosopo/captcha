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

use super::string_literals;
use crate::base::base64_decode;
use crate::nacl::{nacl_decrypt, nacl_encrypt, nacl_encrypt_random_nonce, nacl_secretbox, nacl_secretbox_open};

mod decrypt_spec {
    // Ported from src/nacl/decrypt.spec.ts
    use super::*;

    #[test]
    fn decrypts_an_encrypted_message() {
        let secret = [0u8; 32];
        let message = [1u8, 2, 3, 4, 5, 4, 3, 2, 1];
        let sealed = nacl_encrypt_random_nonce(&message, &secret).expect("encrypts");
        assert_eq!(
            nacl_decrypt(&sealed.encrypted, &sealed.nonce, &secret),
            Ok(Some(message.to_vec()))
        );
    }

    #[test]
    fn returns_null_on_invalid() {
        assert_eq!(nacl_decrypt(&[], &[0u8; 24], &[0u8; 32]), Ok(None));
    }
}

mod encrypt_spec {
    // Ported from src/nacl/encrypt.spec.ts
    use super::*;

    #[test]
    fn encrypts_a_message() {
        let sealed = nacl_encrypt(&[1, 2, 3, 4, 5, 4, 3, 2, 1], &[0u8; 32], &[0u8; 24]).expect("encrypts");
        assert_eq!(
            sealed.encrypted,
            vec![
                94, 21, 20, 69, 68, 221, 140, 245, 200, 67, 77, 188, 129, 85, 227, 141, 199, 60, 184,
                251, 251, 129, 205, 46, 234,
            ]
        );
        assert_eq!(sealed.nonce, vec![0u8; 24]);
    }
}

mod tweetnacl_secretbox_spec {
    // Ported from src/nacl/tweetnacl-secretbox.spec.ts (vectors read from src/nacl/tweetnacl-secretbox-data.spec.ts)
    use super::*;

    fn counting_key() -> [u8; 32] {
        std::array::from_fn(|i| i as u8)
    }

    #[test]
    fn secretbox_and_secretbox_open() {
        let key = counting_key();
        let nonce: [u8; 24] = std::array::from_fn(|i| (32 + i) as u8);
        let msg = b"message to encrypt";
        let sealed = nacl_secretbox(msg, &nonce, &key).expect("seals");
        assert_eq!(nacl_secretbox_open(&sealed, &nonce, &key), Ok(Some(msg.to_vec())));
    }

    #[test]
    fn secretbox_open_with_invalid_box() {
        let key = [0u8; 32];
        let nonce = [0u8; 24];
        assert_eq!(nacl_secretbox_open(&[], &nonce, &key), Ok(None));
        assert_eq!(nacl_secretbox_open(&[0u8; 10], &nonce, &key), Ok(None));
        assert_eq!(nacl_secretbox_open(&[0u8; 100], &nonce, &key), Ok(None));
    }

    #[test]
    fn secretbox_open_with_invalid_nonce() {
        let key = [0u8; 32];
        let mut nonce: [u8; 24] = std::array::from_fn(|i| i as u8);
        let msg = b"message to encrypt";
        let sealed = nacl_secretbox(msg, &nonce, &key).expect("seals");
        assert_eq!(nacl_secretbox_open(&sealed, &nonce, &key), Ok(Some(msg.to_vec())));
        nonce[0] = 255;
        assert_eq!(nacl_secretbox_open(&sealed, &nonce, &key), Ok(None));
    }

    #[test]
    fn secretbox_open_with_invalid_key() {
        let mut key = counting_key();
        let nonce = [0u8; 24];
        let msg = b"message to encrypt";
        let sealed = nacl_secretbox(msg, &nonce, &key).expect("seals");
        assert_eq!(nacl_secretbox_open(&sealed, &nonce, &key), Ok(Some(msg.to_vec())));
        key[0] = 255;
        assert_eq!(nacl_secretbox_open(&sealed, &nonce, &key), Ok(None));
    }

    #[test]
    fn secretbox_with_message_lengths_of_0_to_1024() {
        let key = counting_key();
        let nonce = [0u8; 24];
        let full: Vec<u8> = (0..1024).map(|i| i as u8).collect();
        for i in 0..full.len() {
            let msg = &full[..i];
            let sealed = nacl_secretbox(msg, &nonce, &key).expect("seals");
            assert_eq!(nacl_secretbox_open(&sealed, &nonce, &key), Ok(Some(msg.to_vec())));
        }
    }

    #[test]
    fn matches_the_tweetnacl_random_vectors() {
        let source = include_str!("../../src/nacl/tweetnacl-secretbox-data.spec.ts");
        let literals = string_literals(source, "export const TEST_DATA = [", "\n];");
        assert_eq!(literals.len() % 4, 0);
        assert!(literals.len() >= 4 * 100);
        for chunk in literals.chunks(4) {
            let decode = |s: &str| base64_decode(s, false).expect("valid base64");
            let (key, nonce, msg, good) = (decode(chunk[0]), decode(chunk[1]), decode(chunk[2]), decode(chunk[3]));
            assert_eq!(nacl_secretbox(&msg, &nonce, &key), Ok(good.clone()), "{}", chunk[2]);
            assert_eq!(nacl_secretbox_open(&good, &nonce, &key), Ok(Some(msg)), "{}", chunk[2]);
        }
    }
}
