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

use crate::key::{key_extract_path, key_extract_suri, DeriveJunction};

fn code(prefix: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[..prefix.len()].copy_from_slice(prefix);
    out
}

fn assert_junction(junction: &DeriveJunction, is_hard: bool, prefix: &[u8]) {
    assert_eq!(junction.is_hard(), is_hard);
    assert_eq!(junction.chain_code(), &code(prefix));
}

const ONE: &[u8] = &[1];
const DOT: &[u8] = &[12, 68, 79, 84];

mod extract_path_spec {
    // Ported from src/key/extractPath.spec.ts
    use super::*;

    #[test]
    fn extracts_properly_from_soft() {
        let test = key_extract_path("/1").expect("valid");
        assert_eq!(test.parts, Some(vec!["/1".to_string()]));
        assert_eq!(test.path.len(), 1);
        assert_junction(&test.path[0], false, ONE);
    }

    #[test]
    fn extracts_properly_from_hard() {
        let test = key_extract_path("//1").expect("valid");
        assert_eq!(test.parts, Some(vec!["//1".to_string()]));
        assert_eq!(test.path.len(), 1);
        assert_junction(&test.path[0], true, ONE);
    }

    #[test]
    fn extracts_properly_from_hard_soft() {
        let test = key_extract_path("//1/2").expect("valid");
        assert_eq!(test.parts, Some(vec!["//1".to_string(), "/2".to_string()]));
        assert_eq!(test.path.len(), 2);
        assert_junction(&test.path[0], true, ONE);
        assert_junction(&test.path[1], false, &[2]);
    }

    #[test]
    fn does_not_extract_from_invalid_paths_1() {
        let error = key_extract_path("1/2").expect_err("invalid");
        assert!(error.message().contains("does not match input"));
    }

    #[test]
    fn does_not_extract_from_invalid_paths_2() {
        let error = key_extract_path("hello").expect_err("invalid");
        assert!(error.message().contains("does not match input"));
    }
}

mod extract_suri_spec {
    // Ported from src/key/extractSuri.spec.ts
    use super::*;

    #[test]
    fn does_not_extract_from_invalid_suri() {
        let error = key_extract_suri("//2").expect_err("invalid");
        assert_eq!(error.message(), "Unable to match provided value to a secret URI");
    }

    #[test]
    fn derives_on_hello_world() {
        let test = key_extract_suri("hello world").expect("valid");
        assert_eq!(test.phrase, "hello world");
        assert_eq!(test.path.len(), 0);
    }

    fn check(suri: &str, password: Option<&str>, junctions: &[(bool, &[u8])]) {
        let test = key_extract_suri(suri).expect("valid");
        assert_eq!(test.password.as_deref(), password);
        assert_eq!(test.phrase, "hello world");
        assert_eq!(test.path.len(), junctions.len());
        for (junction, (is_hard, prefix)) in test.path.iter().zip(junctions) {
            assert_junction(junction, *is_hard, prefix);
        }
    }

    #[test]
    fn derives_on_hello_world_soft_1() {
        check("hello world/1", None, &[(false, ONE)]);
    }

    #[test]
    fn derives_on_hello_world_soft_dot() {
        check("hello world/DOT", None, &[(false, DOT)]);
    }

    #[test]
    fn derives_on_hello_world_hard_1() {
        check("hello world//1", None, &[(true, ONE)]);
    }

    #[test]
    fn derives_on_hello_world_hard_dot() {
        check("hello world//DOT", None, &[(true, DOT)]);
    }

    #[test]
    fn derives_on_hello_world_hard_1_soft_dot() {
        check("hello world//1/DOT", None, &[(true, ONE), (false, DOT)]);
    }

    #[test]
    fn derives_on_hello_world_hard_dot_soft_1() {
        check("hello world//DOT/1", None, &[(true, DOT), (false, ONE)]);
    }

    #[test]
    fn derives_on_hello_world_password() {
        check("hello world///password", Some("password"), &[]);
    }

    #[test]
    fn derives_on_hello_world_hard_1_soft_dot_password() {
        check("hello world//1/DOT///password", Some("password"), &[(true, ONE), (false, DOT)]);
    }

    #[test]
    fn derives_on_hello_world_soft_1_hard_dot_password() {
        check("hello world/1//DOT///password", Some("password"), &[(false, ONE), (true, DOT)]);
    }

    #[test]
    fn derives_on_actual_alice() {
        let test = key_extract_suri(
            "bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice",
        )
        .expect("valid");
        assert_eq!(test.password, None);
        assert_eq!(
            test.phrase,
            "bottom drive obey lake curtain smoke basket hold race lonely fit walk"
        );
        assert_eq!(test.path.len(), 1);
        assert_junction(&test.path[0], true, &[20, 65, 108, 105, 99, 101]);
    }
}
