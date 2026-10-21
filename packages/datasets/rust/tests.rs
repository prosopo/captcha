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

use crate::*;
use prosopo_logger::ErrorObject;
use prosopo_types::api_types::{CaptchaSolution, SolutionRecord};
use prosopo_types::datasets::{
    Captcha, CaptchaItem, CaptchaItemTypes, CaptchaTypes, CaptchaWithoutId, DatasetRaw,
    SelectAllCaptcha, SolutionEntry, Solutions,
};
use prosopo_types::JsNumber;
use prosopo_util_crypto::{hex_hash, JoinValue};
use serde_json::{json, Value};
use std::sync::Mutex;

fn text_item(data: &str) -> CaptchaItem {
    CaptchaItem {
        hash: String::new(),
        data: data.to_string(),
        item_type: CaptchaItemTypes::Text,
    }
}

fn hashed(data: &str) -> CaptchaItem {
    CaptchaItem {
        hash: hex_hash(data, None).expect("hashes"),
        ..text_item(data)
    }
}

fn index(n: f64) -> SolutionEntry {
    SolutionEntry::Index(JsNumber(n))
}

fn strings(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
}

fn hash_input<'a, S>(captcha: &'a mut SelectAllCaptcha<S>) -> CaptchaHashInput<'a, S> {
    CaptchaHashInput {
        target: &captcha.target,
        salt: &captcha.salt,
        items: &captcha.items,
        solution: captcha.solution.as_deref_mut(),
    }
}

fn hash_strings_of(layer: &[String]) -> String {
    hash_strings(&[&layer[0], &layer[1]])
}

// Ported from src/tests/merkle.unit.test.ts
mod merkle {
    use super::*;

    fn captcha(
        salt: &str,
        data: [&str; 3],
        solution: Option<Vec<String>>,
    ) -> SelectAllCaptcha<String> {
        SelectAllCaptcha {
            captcha_id: None,
            captcha_content_id: None,
            salt: salt.to_string(),
            solution,
            unlabelled: None,
            time_limit: None,
            items: data.iter().map(|data| hashed(data)).collect(),
            target: "letters".to_string(),
        }
    }

    /// getDataset() with the solutions the TS `beforeAll` sets.
    fn dataset() -> Vec<SelectAllCaptcha<String>> {
        let mut captchas: Vec<SelectAllCaptcha<String>> = vec![
            captcha("0x01020304", ["1", "b", "c"], None),
            captcha("0x02020304", ["c", "e", "3"], None),
            captcha("0x03020304", ["h", "f", "5"], None),
        ];
        let first: Vec<String> =
            match_items_to_solutions(&[index(1.0), index(2.0)], Some(&captchas[0].items))
                .expect("matches");
        let second: Vec<String> =
            match_items_to_solutions(&[index(2.0)], Some(&captchas[1].items)).expect("matches");
        captchas[0].solution = Some(first);
        captchas[1].solution = Some(second);
        captchas[2].solution = Some(
            match_items_to_solutions(&[index(1.0)], Some(&captchas[2].items)).expect("matches"),
        );
        captchas
    }

    fn content_hashes() -> Vec<String> {
        dataset()
            .iter_mut()
            .map(|captcha| {
                compute_captcha_hash(hash_input(captcha), false, false, false).expect("hashes")
            })
            .collect()
    }

    fn tree(leaves: &[String]) -> CaptchaMerkleTree {
        let mut tree: CaptchaMerkleTree = CaptchaMerkleTree::new();
        tree.build(leaves).expect("builds");
        tree
    }

    fn numbered(count: usize) -> Vec<String> {
        (1..=count).map(|n| n.to_string()).collect()
    }

    #[test]
    fn tree_contains_correct_leaf_hashes_when_computing_leaf_hashes() {
        let tree: CaptchaMerkleTree = tree(&content_hashes());
        let leaves: Vec<&str> = tree.leaves.iter().map(|leaf| leaf.hash.as_str()).collect();
        assert_eq!(
            leaves,
            [
                "0xa0957907fd7c36747f92d31753d295c2affa6c6b04f5e84e1228f40568ddda0c",
                "0xbefa0a7c4eb127459e01561e0a4d87108581fc8f6c75128ceafa8f6c2c036fa4",
                "0xfd248874ff5b5606fbad7f2327a31e7ca8833f9f4c8f9afedc3b6483d9866abc",
            ]
        );
    }

    #[test]
    fn tree_root_is_correct_when_computing_leaf_hashes() {
        assert_eq!(
            tree(&content_hashes()).get_root().expect("a root").hash,
            "0x460059c537d10c5b41964968e4158a9a14fcb63ea1d75591eab4222b845a9d36"
        );
    }

    #[test]
    fn tree_proof_works_when_computing_leaf_hashes() {
        let hashes: Vec<String> = content_hashes();
        let tree: CaptchaMerkleTree = tree(&hashes);
        let proof = tree.proof(&hashes[0]).expect("a proof");
        assert!(tree.layers[1].contains(&hash_strings_of(&proof[0])));
        assert!(tree.layers[2].contains(&hash_strings_of(&proof[1])));
    }

    #[test]
    fn tree_contains_correct_leaf_hashes_when_not_computing_leaf_hashes() {
        let tree: CaptchaMerkleTree = tree(&numbered(3));
        let leaves: Vec<&str> = tree.leaves.iter().map(|leaf| leaf.hash.as_str()).collect();
        assert_eq!(leaves, ["1", "2", "3"]);
    }

    #[test]
    fn tree_root_is_correct_when_not_computing_leaf_hashes() {
        assert_eq!(
            tree(&numbered(3)).get_root().expect("a root").hash,
            "0x8fd940838c54e2406976e8c4745f39457fe27c7555a21a572b665efcc5d27bd6"
        );
    }

    #[test]
    fn tree_proof_works_when_not_computing_leaf_hashes() {
        let tree: CaptchaMerkleTree = tree(&numbered(3));
        let proof1 = tree.proof("1").expect("a proof");
        assert!(tree.layers[1].contains(&hash_strings_of(&proof1[0])));
        assert!(tree.layers[2].contains(&hash_strings_of(&proof1[1])));
        assert_eq!(proof1.last().expect("a root layer").len(), 1);
        let proof3 = tree.proof("3").expect("a proof");
        let proof2 = tree.proof("2").expect("a proof");
        assert_eq!(proof3.last(), proof1.last());
        assert_eq!(proof3.len(), proof1.len());
        assert_eq!(proof2.last(), proof1.last());
        assert_eq!(proof2.len(), proof1.len());
    }

    #[test]
    fn larger_tree_proof_works() {
        let tree: CaptchaMerkleTree = tree(&numbered(16));
        let proof = tree.proof("16").expect("a proof");
        assert!(tree.layers[1].contains(&hash_strings_of(&proof[0])));
        assert!(tree.layers[2].contains(&hash_strings_of(&proof[1])));
        assert_eq!(tree.layers.last().expect("layers").len(), 1);
        assert_eq!(proof.last().expect("a root layer").len(), 1);
    }

    #[test]
    fn refuses_to_build_a_proof_for_a_hash_that_is_not_a_leaf() {
        let tree: CaptchaMerkleTree = tree(&numbered(3));
        let inner: String = tree.layers[1][0].clone();
        assert!(tree.proof("not-a-leaf").is_err());
        assert!(tree.proof(&inner).is_err());
        assert!(tree.proof(&tree.get_root().expect("a root").hash).is_err());
    }

    #[test]
    fn refuses_to_build_a_proof_for_a_non_leaf_on_a_single_leaf_tree() {
        let tree: CaptchaMerkleTree = tree(&strings(&["only"]));
        assert_eq!(
            tree.proof("only").expect("a proof"),
            vec![strings(&["only"])]
        );
        assert!(tree.proof("not-a-leaf").is_err());
    }

    #[test]
    fn larger_odd_tree_proof_works() {
        let tree: CaptchaMerkleTree = tree(&numbered(17));
        let proof = tree.proof("17").expect("a proof");
        assert!(tree.layers[1].contains(&hash_strings_of(&proof[0])));
        assert!(tree.layers[2].contains(&hash_strings_of(&proof[1])));
        assert_eq!(tree.layers.last().expect("layers").len(), 1);
        assert_eq!(proof.last().expect("a root layer").len(), 1);
    }

    #[test]
    fn tree_proof_works_when_there_is_only_one_leaf() {
        assert_eq!(
            tree(&numbered(1)).proof("1").expect("a proof"),
            vec![strings(&["1"])]
        );
    }

    #[test]
    fn every_leaf_of_trees_of_every_size_up_to_33_verifies_against_the_root() {
        for size in 1..=33 {
            let leaves: Vec<String> = (0..size).map(|i| format!("leaf-{size}-{i}")).collect();
            let tree: CaptchaMerkleTree = tree(&leaves);
            let root: &str = &tree.get_root().expect("a root").hash;
            for leaf in &leaves {
                let proof = tree.proof(leaf).expect("a proof");
                assert!(verify_proof(leaf, &proof, root));
                assert!(!verify_proof(leaf, &proof, &format!("{root}0")));
            }
        }
    }

    #[test]
    fn rejects_a_self_consistent_proof_that_does_not_end_at_the_trusted_root() {
        let tree: CaptchaMerkleTree = tree(&numbered(3));
        let forged_layer: Vec<String> = strings(&["forged", "sibling"]);
        let forged = vec![forged_layer.clone(), vec![hash_strings_of(&forged_layer)]];
        assert!(!verify_proof(
            "forged",
            &forged,
            &tree.get_root().expect("a root").hash
        ));
    }

    #[test]
    fn rejects_a_proof_whose_root_layer_is_not_the_trusted_root() {
        let tree: CaptchaMerkleTree = tree(&numbered(4));
        let proof = tree.proof("1").expect("a proof");
        let tampered = vec![proof[0].clone(), proof[1].clone(), strings(&["other-root"])];
        assert!(!verify_proof(
            "1",
            &tampered,
            &tree.get_root().expect("a root").hash
        ));
    }

    #[test]
    fn rejects_a_proof_layer_that_does_not_contain_the_running_hash() {
        let tree: CaptchaMerkleTree = tree(&numbered(4));
        let proof = tree.proof("1").expect("a proof");
        assert!(!verify_proof(
            "5",
            &proof,
            &tree.get_root().expect("a root").hash
        ));
    }

    #[test]
    fn hydrated_layers_give_the_same_proofs_as_a_built_tree() {
        let built: CaptchaMerkleTree = tree(&numbered(5));
        let mut hydrated: CaptchaMerkleTree = CaptchaMerkleTree::new();
        hydrated
            .hydrate_from_layers(built.layers.clone())
            .expect("hydrates");
        assert_eq!(
            hydrated.root.as_ref().map(|r| &r.hash),
            built.root.as_ref().map(|r| &r.hash)
        );
        for leaf in numbered(5) {
            assert_eq!(
                hydrated.proof(&leaf).expect("a proof"),
                built.proof(&leaf).expect("a proof")
            );
        }
        assert_eq!(parent_layers(&numbered(5)), built.layers[1..].to_vec());
    }
}

// Ported from src/tests/captcha.unit.test.ts
mod captcha {
    use super::*;

    const ITEM_HASHES: [&str; 9] = [
        "0xf50c63a914dac984e8e0ad16673f0c7224422d439ec19342d89ea985bc439040",
        "0xb22ba232374e4970ff72533bd84a0f4a86a31323518448a7820d08639bdec2f5",
        "0xe67b75b0c213c04693d9be4992319912ae9317039570221c640e243040b222ac",
        "0x95bd4e306b9ea73216179900e16a62b247e5f371a60fca72f7af84b314998bf6",
        "0x70bbf5a7aec5a3bb7109310ff5c4bf0915a504a3c0c7a69f3b514c67bd53f8ca",
        "0x66e6e346cfb7ecc73d64c5bbc10bd6eea3f55e0ef33037e2ebf8111f59b809be",
        "0xcf00c099c10c8d8678b29a166798e5720801053a9ac35b52ba623d3a0cebe468",
        "0x5981107cf8d5ab3a562d79b489ffd2b5b9e5fc0fce67aea550eab292069bbbee",
        "0x7f54f8853ac73d0590c038075895c59d0c4ef5c31340b34c1dc65cbe1765e0d0",
    ];

    /// The TS hashes `path.join("http://localhost", ...)`, which collapses the `//`.
    fn mock_items() -> Vec<CaptchaItem> {
        (1..=9)
            .map(|i| {
                hashed(&format!(
                    "http:/localhost/tests/js/mocks/data/img/01.0{i}.jpeg"
                ))
            })
            .collect()
    }

    fn items() -> Vec<CaptchaItem> {
        ITEM_HASHES
            .iter()
            .enumerate()
            .map(|(i, hash)| CaptchaItem {
                hash: hash.to_string(),
                ..text_item(&format!("blah{}", i + 1))
            })
            .collect()
    }

    fn matched(indexes: &[f64]) -> Vec<String> {
        let indexes: Vec<SolutionEntry> = indexes.iter().map(|i| index(*i)).collect();
        match_items_to_solutions(&indexes, Some(&mock_items())).expect("matches")
    }

    fn dataset() -> Value {
        json!({
            "format": "SelectAll",
            "captchas": [
                {
                    "captchaId": "0xbd9cab1f7aa219ee1b2afb4a0df4649cceaf028549ca3959a4adcb8fa7e5b60b",
                    "captchaContentId": "0x01",
                    "solution": [],
                    "salt": "0x01010101010101010101010101010101",
                    "target": "bus",
                    "items": items(),
                },
                {
                    "captchaId": "0xf1e9b2d9d6ca3a3740c29934768451b6790d38a8595a4b0fa5d5c3cf244b5dfa",
                    "captchaContentId": "0x01",
                    "salt": "0x02020202020202020202020202020202",
                    "target": "train",
                    "items": items(),
                },
            ],
        })
    }

    const RECEIVED_IDS: [&str; 2] = [
        "0x21eaa7d782eaf2930d5e1f0800328fb3be125936b18086efb20f9300c5d6f6f8",
        "0x9c2a2b6a556d83cf74c275cd9fdb8a30fdd7bbef8d09c83af7b1d08d91bc50a0",
    ];
    const SALTS: [&str; 2] = [
        "0x01010101010101010101010101010101",
        "0x02020202020202020202020202020202",
    ];

    fn received() -> Vec<CaptchaSolution> {
        (0..2)
            .map(|i| CaptchaSolution {
                captcha_id: RECEIVED_IDS[i].to_string(),
                captcha_content_id: "0x01".to_string(),
                solution: matched(&[0.0, 1.0, 2.0]),
                salt: SALTS[i].to_string(),
                input_methods: None,
            })
            .collect()
    }

    fn stored_captchas() -> Vec<Captcha> {
        (0..2)
            .map(|i| Captcha {
                captcha: CaptchaWithoutId {
                    salt: SALTS[i].to_string(),
                    items: mock_items(),
                    target: String::new(),
                    solved: Some(true),
                    time_limit_ms: None,
                    solution: Some(Solutions::Hashed(matched(&[0.0, 1.0, 2.0]))),
                    unlabelled: None,
                },
                captcha_id: RECEIVED_IDS[i].to_string(),
                captcha_content_id: "0x01".to_string(),
                asset_uri: None,
                dataset_id: Some("0x".to_string()),
                dataset_content_id: Some("0x".to_string()),
                random_key: None,
            })
            .collect()
    }

    fn stored_records() -> Vec<SolutionRecord> {
        (0..2)
            .map(|i| SolutionRecord {
                solution: CaptchaSolution {
                    captcha_id: RECEIVED_IDS[i].to_string(),
                    captcha_content_id: "0x01".to_string(),
                    solution: matched(&[0.0, 1.0, 2.0]),
                    salt: SALTS[i].to_string(),
                    input_methods: None,
                },
                dataset_id: "0x".to_string(),
                dataset_content_id: "0x".to_string(),
            })
            .collect()
    }

    #[test]
    fn parses_a_captcha_dataset_correctly() {
        assert!(parse_captcha_dataset(&dataset()).is_ok());
    }

    #[test]
    fn captcha_data_set_is_hashed_correctly() {
        let mut captchas: Vec<SelectAllCaptcha<String>> =
            serde_json::from_value(dataset()["captchas"].clone()).expect("captchas");
        let ids: Vec<Option<String>> = captchas.iter().map(|c| c.captcha_id.clone()).collect();
        let hashes: Vec<String> = captchas
            .iter_mut()
            .map(|captcha| {
                compute_captcha_hash(hash_input(captcha), true, true, false).expect("hashes")
            })
            .collect();
        assert_eq!(Some(&hashes[0]), ids[0].as_ref());
        assert_eq!(Some(&hashes[1]), ids[1].as_ref());
        assert_ne!(hashes[0], hashes[1]);
    }

    #[test]
    fn captcha_solutions_are_successfully_parsed() {
        let solutions: Value = serde_json::from_str(
            r#"[{ "captchaId": "1", "captchaContentId": "1", "solution": ["0x1", "0x2", "0x3"], "salt" : "0xsaltsaltsaltsaltsaltsaltsaltsalt" }, { "captchaId": "2", "captchaContentId": "2", "solution": ["0x1", "0x2", "0x3"], "salt" : "0xsaltsaltsaltsaltsaltsaltsaltsalt" }]"#,
        )
        .expect("json");
        assert_eq!(
            parse_and_sort_captcha_solutions(&solutions)
                .expect("parses")
                .len(),
            2
        );
    }

    #[test]
    fn invalid_captcha_solutions_are_not_successfully_parsed() {
        let solutions: Value = serde_json::from_str(
            r#"[{ "captchaId": "1", "salt" : "0xsaltsaltsaltsaltsaltsaltsaltsalt" }, { "captchaId": "2", "solution": ["1", "2", "3"], "salt" : "0xsaltsaltsaltsaltsaltsaltsaltsalt" }]"#,
        )
        .expect("json");
        assert!(parse_and_sort_captcha_solutions(&solutions).is_err());
    }

    #[test]
    fn captchas_are_hashed_properly() {
        let items: Vec<CaptchaItem> = mock_items();
        let mut solution: Vec<String> = matched(&[0.0]);
        let input = CaptchaHashInput {
            target: "plane",
            salt: "0x030303030303030303030303030303",
            items: &items,
            solution: Some(&mut solution[..]),
        };
        assert!(compute_captcha_hash(input, true, true, false).is_ok());
        let mut empty: Vec<String> = Vec::new();
        let with_empty: String = compute_captcha_hash(
            CaptchaHashInput {
                target: "plane",
                salt: "",
                items: &items,
                solution: Some(&mut empty[..]),
            },
            true,
            true,
            true,
        )
        .expect("hashes");
        let without: String = compute_captcha_hash::<String>(
            CaptchaHashInput {
                target: "plane",
                salt: "",
                items: &items,
                solution: None,
            },
            true,
            true,
            true,
        )
        .expect("hashes");
        assert_ne!(with_empty, without);
    }

    #[test]
    fn captcha_solutions_are_correctly_sorted_and_computed() {
        let hashes =
            sort_and_compute_hashes(&mut received(), &mut stored_captchas()).expect("hashes");
        assert!(hashes.iter().all(|entry| entry.hash == entry.captcha_id));
    }

    #[test]
    fn captcha_solutions_are_correctly_sorted_and_computed_non_matching_order() {
        let mut stored: Vec<Captcha> = stored_captchas();
        stored.reverse();
        let hashes = sort_and_compute_hashes(&mut received(), &mut stored).expect("hashes");
        assert!(hashes.iter().all(|entry| entry.hash == entry.captcha_id));
    }

    #[test]
    fn matching_captcha_solutions_are_correctly_compared_returning_true() {
        assert!(compare_captcha_solutions(
            &mut received(),
            &mut stored_records(),
            9.0,
            0.8
        ));
    }

    #[test]
    fn non_matching_captcha_solutions_are_correctly_compared_throwing_an_error() {
        let mut stored: Vec<SolutionRecord> = stored_records();
        stored[0].solution.captcha_id =
            "0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb".to_string();
        assert!(!compare_captcha_solutions(
            &mut received(),
            &mut stored,
            9.0,
            0.8
        ));
    }

    #[test]
    fn mismatched_length_captcha_solutions_returns_false() {
        let id: &str = "0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb";
        let mut received: Vec<CaptchaSolution> = received();
        received.insert(
            0,
            CaptchaSolution {
                captcha_id: id.to_string(),
                captcha_content_id: String::new(),
                solution: matched(&[1.0, 2.0, 3.0]),
                salt: String::new(),
                input_methods: None,
            },
        );
        let mut stored: Vec<SolutionRecord> = vec![
            SolutionRecord {
                solution: CaptchaSolution {
                    captcha_id: id.to_string(),
                    captcha_content_id: String::new(),
                    solution: Vec::new(),
                    salt: SALTS[0].to_string(),
                    input_methods: None,
                },
                dataset_id: "0x".to_string(),
                dataset_content_id: "0x".to_string(),
            },
            stored_records().remove(0),
        ];
        assert!(!compare_captcha_solutions(
            &mut received,
            &mut stored,
            9.0,
            0.8
        ));
    }

    #[test]
    fn captchas_with_mismatching_solution_lengths_are_marked_as_incorrect() {
        let mut no_solutions: Vec<CaptchaSolution> = received();
        for captcha in &mut no_solutions {
            captcha.solution.clear();
        }
        assert!(!compare_captcha_solutions(
            &mut no_solutions,
            &mut stored_records(),
            9.0,
            0.8
        ));
    }

    #[test]
    fn an_empty_submission_is_never_marked_as_correct() {
        assert!(!compare_captcha_solutions(&mut [], &mut [], 9.0, 0.8));
    }

    #[test]
    fn pending_request_hash_is_calculated_properly() {
        let mut ids: Vec<String> = strings(&["1", "2", "3"]);
        assert_eq!(
            compute_pending_request_hash(&mut ids, JoinValue::from("0x01"), "0x02"),
            "0x0c85e41f84c1b6b29ee2f7eae88512caa28fa82c3389fad3b875fd06dcab9da5"
        );
    }

    /// The TS leaves `captchaContentId` undefined, which joins as the empty string.
    #[test]
    fn computes_a_captcha_solution_hash_correctly() {
        let captcha: CaptchaSolution = CaptchaSolution {
            captcha_id: "1".to_string(),
            captcha_content_id: String::new(),
            solution: matched(&[1.0, 2.0]),
            salt: "0x010101010101010101010101010101".to_string(),
            input_methods: None,
        };
        assert_eq!(
            compute_captcha_solution_hash(&captcha),
            "0x5d53f59e5a6a67e260f084e9b12cf9fa85c4a2cc42372edb14c063176ae0ccf1"
        );
    }

    fn proof(layers: &[&[&str]]) -> Vec<Vec<String>> {
        layers.iter().map(|layer| strings(layer)).collect()
    }

    #[test]
    fn verifies_a_valid_merkle_proof() {
        let proof = proof(&[
            &[
                "0xb2b33ccc7d240ab8ed24b8f77a32fd2825e78972c8a8cea359f11edc9ac26734",
                "0x946e6735cf57db19ed353dfc9b9fb515e219438225706bfcf20366739eb07176",
            ],
            &[
                "0xa6597728483934391c473f854ccfbce98c2f93edd9984ea7c473d3c4d86574b5",
                "0x208f6d9d66f06b6859ea00921fe46dc775610330c746f6fa9d9da9bb9cce1409",
            ],
            &[
                "0xc0a845f2457f68504398277783c1d4c35ace06296e7ae599114f314cd1168137",
                "0x4d865bc0d29808adac611017b690bc685d8dd166b757cf95b11207ba9510d6b5",
            ],
            &[
                "0xc9400eaa4374786917ac6df0ee2481f63a008486d8e10fe00e88f267f9d2a5dd",
                "0xdf2f96bd502a7b1e075f9e8e70ce70a778dbaf81a56ab5bb6570b70afbf626af",
            ],
            &[
                "0xa2224c0acf395506f8bbc2635e03abb2ea4b239c3bf93c95379b4823764e0494",
                "0x2add79b6e2c7253a98d751df9df8fae644c3ff761fe4684b836a4338804e017b",
            ],
            &["0xeee6c87e8ad5cd1fc05ea0d8874067d87918f1b141fdabd12352ad59b779cc80"],
        ]);
        assert!(verify_proof(
            "0xb2b33ccc7d240ab8ed24b8f77a32fd2825e78972c8a8cea359f11edc9ac26734",
            &proof,
            "0xeee6c87e8ad5cd1fc05ea0d8874067d87918f1b141fdabd12352ad59b779cc80"
        ));
    }

    #[test]
    fn fails_to_verify_an_invalid_merkle_proof() {
        let proof = proof(&[
            &[
                "0x41a5470f491204aefc954d5aeec744d30b0a1112c4a86397afe336807f115c16",
                "0xff4b64779f85d48204aea342d1b976a57a31f5f8eaa0f264fc5308f098b0e887",
            ],
            &[
                "0x23eef831153a067d5b4376ea7e933bbe21d7382d9c0ce79d7018a05c3281d69a",
                "0xb9f0bdbeff385c4b39172fd7fa9282d136468bee4c35fe55d04bc21010b975aa",
            ],
            &[
                "0x867a0a6b3e67c083233988d912ea93a0f71ed01f07e74d720e27e041fb4a229b",
                "0x26698f2a3fc5f93fd51dd8153c8d246eaafa7dd0f215b9c0135d3e41710a14e9",
            ],
            &[
                "0x8230f43abcd6e97c6748affa840d31a9ead5733e3c4063e217c6621cd0f98b84",
                "0x97f0025c96ac960a33c551ae6a2a50a3c39045006eed5a896fa8a9463e44ee29",
            ],
            &[
                "0xd173b71900767ac305747c2c627dee7d0b95aaeb2324c74ef9316edf2b072de9",
                "0x4d487ca588902640e2867a0da3c1d8525527eb89c8271a8908ee1c4cd642d61c",
            ],
            &["INVALID"],
        ]);
        assert!(!verify_proof(
            "0x41a5470f491204aefc954d5aeec744d30b0a1112c4a86397afe336807f115c16",
            &proof,
            "INVALID"
        ));
    }

    #[test]
    fn fails_to_verify_junk_data() {
        let leaf: &str = "0x41a5470f491204aefc954d5aeec744d30b0a1112c4a86397afe336807f115c16";
        assert!(!verify_proof(leaf, &[strings(&["junk"])], "junk"));
    }

    #[test]
    fn returns_sorted_solutions() {
        let mut empty: Vec<JsNumber> = Vec::new();
        assert_eq!(
            get_solution_value_to_hash(Some(&mut empty[..])),
            Vec::<JoinValue>::new()
        );
        let mut hashes: Vec<String> = strings(&["0x3", "0x2", "0x1"]);
        assert_eq!(
            get_solution_value_to_hash(Some(&mut hashes[..])),
            vec![
                JoinValue::from("0x1"),
                JoinValue::from("0x2"),
                JoinValue::from("0x3")
            ]
        );
        let mut numbers: Vec<JsNumber> = vec![JsNumber(3.0), JsNumber(2.0), JsNumber(1.0)];
        assert_eq!(
            get_solution_value_to_hash(Some(&mut numbers[..])),
            vec![
                JoinValue::Number(1.0),
                JoinValue::Number(2.0),
                JoinValue::Number(3.0)
            ]
        );
        assert_eq!(
            get_solution_value_to_hash::<String>(None),
            vec![JoinValue::from(NO_SOLUTION_VALUE)]
        );
    }
}

/// A [`Fetch`] that answers every URL with fixed bytes and records what it was asked.
#[derive(Default)]
struct FixedFetch {
    status: u16,
    requests: Mutex<Vec<String>>,
}

impl FixedFetch {
    fn ok() -> FixedFetch {
        FixedFetch {
            status: 200,
            requests: Mutex::default(),
        }
    }

    fn requests(&self) -> Vec<String> {
        self.requests.lock().expect("not poisoned").clone()
    }
}

impl Fetch for FixedFetch {
    fn get<'a>(&'a self, url: &'a str) -> FetchFuture<'a> {
        Box::pin(async move {
            self.requests
                .lock()
                .expect("not poisoned")
                .push(url.to_string());
            Ok(FetchedResponse {
                status: self.status,
                body: vec![1, 2, 3],
            })
        })
    }
}

// Ported from src/tests/dataset.unit.test.ts
mod dataset {
    use super::*;

    #[tokio::test]
    async fn validates_a_captcha_dataset_correctly() {
        let items: Vec<CaptchaItem> = (1..=9).map(|i| hashed(&format!("blah{i}"))).collect();
        let captcha: SelectAllCaptcha<SolutionEntry> = SelectAllCaptcha {
            captcha_id: Some(
                "0x7e6d425c3aae7194e06ff5f6f40ae7ce3f28f3cedff572d94141294af357bec2".to_string(),
            ),
            captcha_content_id: Some("0x01010101010101010101010101010101".to_string()),
            salt: "0x01010101010101010101010101010101".to_string(),
            solution: Some(Vec::new()),
            unlabelled: None,
            time_limit: None,
            items,
            target: "bus".to_string(),
        };
        let dataset: DatasetRaw<SolutionEntry> = DatasetRaw {
            dataset_id: None,
            dataset_content_id: None,
            captchas: vec![captcha; 1000],
            format: CaptchaTypes::SelectAll,
            solution_tree: None,
            content_tree: None,
            time_limit: None,
        };
        let fetch: FixedFetch = FixedFetch::ok();
        assert!(validate_dataset_content(&dataset, &fetch, None)
            .await
            .expect("validates"));
        assert!(fetch.requests().is_empty());
    }

    #[test]
    fn builds_a_dataset_whose_ids_are_its_tree_leaves_and_roots() {
        let raw: DatasetRaw<String> = DatasetRaw {
            dataset_id: None,
            dataset_content_id: None,
            captchas: (0..3)
                .map(|i| SelectAllCaptcha {
                    captcha_id: None,
                    captcha_content_id: None,
                    salt: format!("0x{i:034}"),
                    solution: (i != 1).then(|| {
                        vec![
                            hashed(&format!("{i}-b")).hash,
                            hashed(&format!("{i}-a")).hash,
                        ]
                    }),
                    unlabelled: None,
                    time_limit: None,
                    items: ["a", "b", "c"]
                        .iter()
                        .map(|data| hashed(&format!("{i}-{data}")))
                        .collect(),
                    target: "t".to_string(),
                })
                .collect(),
            format: CaptchaTypes::SelectAll,
            solution_tree: None,
            content_tree: None,
            time_limit: None,
        };
        let built = build_dataset(&raw).expect("builds");
        let solution_tree: &Vec<Vec<String>> = built.solution_tree.as_ref().expect("a tree");
        let content_tree: &Vec<Vec<String>> = built.content_tree.as_ref().expect("a tree");
        assert_eq!(&built.dataset_id, &solution_tree.last().expect("a root")[0]);
        assert_eq!(
            built.dataset_content_id.as_ref(),
            Some(&content_tree.last().expect("a root")[0])
        );
        for (index, captcha) in built.captchas.iter().enumerate() {
            assert_eq!(captcha.captcha_id.as_ref(), Some(&solution_tree[0][index]));
            assert_eq!(
                captcha.captcha_content_id.as_ref(),
                Some(&content_tree[0][index])
            );
            if let Some(solution) = &captcha.solution {
                let mut sorted: Vec<String> = solution.clone();
                sorted.sort();
                assert_eq!(solution, &sorted, "stored solutions are sorted");
            }
        }
        assert_eq!(built.captchas[1].solution, None);
    }
}

// Ported from src/tests/assetToken.unit.test.ts
mod asset_token {
    use super::*;
    use sha2::{Digest, Sha256};

    const KEY: &str = "test-security-key";
    const NOW_MS: f64 = 1_700_000_000_000.0;
    const NOW_SECONDS: f64 = NOW_MS / 1000.0;
    const IMAGE: &str = "https://prosopoimages.b-cdn.net/v5_dataset_flat/images/abc.webp";
    const PATH: &str = "/v5_dataset_flat/images/abc.webp";

    /// bunny's documented scheme, reproduced independently of the implementation.
    fn expected_token(path: &str, expires: f64, ip: &str) -> String {
        use base64::Engine;
        let digest = Sha256::digest(format!("{KEY}{path}{expires}{ip}").as_bytes());
        base64::engine::general_purpose::STANDARD
            .encode(digest)
            .replace('+', "-")
            .replace('/', "_")
            .replace('=', "")
    }

    fn sign(url: &str, ttl_seconds: Option<f64>, client_ip: Option<&str>) -> String {
        sign_asset_url(
            url,
            &SignAssetUrlOptions {
                security_key: KEY.to_string(),
                ttl_seconds,
                client_ip: client_ip.map(str::to_string),
                now_ms: Some(NOW_MS),
            },
        )
    }

    fn query(url: &str, name: &str) -> Option<String> {
        url::Url::parse(url)
            .expect("a url")
            .query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    }

    fn env(key: Option<&str>, ttl: Option<&str>) -> impl Fn(&str) -> Option<String> {
        let key: Option<String> = key.map(str::to_string);
        let ttl: Option<String> = ttl.map(str::to_string);
        move |name: &str| match name {
            ASSET_TOKEN_KEY_ENV => key.clone(),
            ASSET_TOKEN_TTL_ENV => ttl.clone(),
            _ => None,
        }
    }

    #[test]
    fn produces_the_token_bunny_would_verify() {
        let signed: String = sign(IMAGE, None, None);
        let expires: f64 = NOW_SECONDS + DEFAULT_ASSET_TOKEN_TTL_SECONDS;
        assert!(signed.starts_with(&format!("{IMAGE}?")));
        assert_eq!(query(&signed, "expires"), Some(format!("{expires}")));
        assert_eq!(
            query(&signed, "token"),
            Some(expected_token(PATH, expires, ""))
        );
    }

    #[test]
    fn honours_the_ttl_it_is_given() {
        assert_eq!(
            query(&sign(IMAGE, Some(60.0), None), "expires"),
            Some(format!("{}", NOW_SECONDS + 60.0))
        );
    }

    #[test]
    fn binds_to_a_client_ip_when_one_is_supplied() {
        let expires: f64 = NOW_SECONDS + DEFAULT_ASSET_TOKEN_TTL_SECONDS;
        assert_eq!(
            query(&sign(IMAGE, None, Some("203.0.113.7")), "token"),
            Some(expected_token(PATH, expires, "203.0.113.7"))
        );
    }

    #[test]
    fn leaves_an_already_signed_url_alone() {
        let signed: String = format!("{IMAGE}?token=abc&expires=123");
        assert_eq!(sign(&signed, None, None), signed);
    }

    #[test]
    fn passes_through_anything_that_is_not_an_http_url() {
        for value in ["/local/fixture.webp", "not a url", "file:///a.webp"] {
            assert_eq!(sign(value, None, None), value);
        }
    }

    #[test]
    fn is_undefined_until_a_key_is_configured() {
        assert_eq!(asset_token_options_from(env(None, None)), None);
    }

    #[test]
    fn reads_the_key_and_ttl() {
        let options = asset_token_options_from(env(Some(KEY), Some("45"))).expect("options");
        assert_eq!(options.security_key, KEY);
        assert_eq!(options.ttl_seconds, Some(45.0));
    }

    #[test]
    fn falls_back_to_the_default_ttl_when_it_is_unset_or_junk() {
        for ttl in [None, Some("not-a-number")] {
            let options = asset_token_options_from(env(Some(KEY), ttl)).expect("options");
            assert_eq!(options.ttl_seconds, Some(DEFAULT_ASSET_TOKEN_TTL_SECONDS));
        }
    }

    #[tokio::test]
    async fn fetches_the_bare_url_when_no_key_is_configured() {
        let fetch: FixedFetch = FixedFetch::ok();
        download_image_with(IMAGE, &fetch, None)
            .await
            .expect("downloads");
        assert_eq!(fetch.requests(), vec![IMAGE.to_string()]);
    }

    #[tokio::test]
    async fn signs_the_url_when_a_key_is_configured() {
        let fetch: FixedFetch = FixedFetch::ok();
        let options = asset_token_options_from(env(Some(KEY), None)).expect("options");
        download_image_with(IMAGE, &fetch, Some(&options))
            .await
            .expect("downloads");
        let requested: String = fetch.requests().remove(0);
        assert!(requested.starts_with(&format!("{IMAGE}?")));
        assert!(query(&requested, "token").is_some_and(|token| !token.is_empty()));
        let now: f64 = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("after the epoch")
            .as_secs_f64();
        let expires: f64 = query(&requested, "expires")
            .expect("expires")
            .parse()
            .expect("a number");
        assert!(expires > now);
    }

    #[tokio::test]
    async fn returns_the_bytes_it_downloaded() {
        assert_eq!(
            download_image_with(IMAGE, &FixedFetch::ok(), None)
                .await
                .expect("downloads"),
            vec![1, 2, 3]
        );
    }

    #[tokio::test]
    async fn throws_when_the_image_cannot_be_fetched() {
        let fetch: FixedFetch = FixedFetch {
            status: 403,
            requests: Mutex::default(),
        };
        let error = download_image_with(IMAGE, &fetch, None)
            .await
            .expect_err("fails");
        assert_eq!(
            error.prosopo().and_then(|e| e.translation_key()),
            Some("DATABASE.IMAGE_GET_FAILED")
        );
    }
}

/// [`HttpFetch`] against a real socket: the parts the vectors replace with a recording fetch.
mod http_fetch {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    async fn serve(response: &'static str) -> String {
        let listener: TcpListener = TcpListener::bind("127.0.0.1:0").await.expect("binds");
        let address = listener.local_addr().expect("an address");
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.expect("accepts");
            let mut request = [0u8; 1024];
            let _ = socket.read(&mut request).await;
            socket.write_all(response.as_bytes()).await.expect("writes");
        });
        format!("http://{address}/img.png")
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn returns_the_status_and_body_of_a_success() {
        let url: String =
            serve("HTTP/1.1 200 OK\r\ncontent-length: 3\r\nconnection: close\r\n\r\nabc").await;
        let response = HttpFetch::default().get(&url).await.expect("fetches");
        assert_eq!(
            response,
            FetchedResponse {
                status: 200,
                body: b"abc".to_vec()
            }
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_failure_status_becomes_a_bad_request_wrapped_in_image_get_failed() {
        let url: String =
            serve("HTTP/1.1 404 Not Found\r\ncontent-length: 4\r\nconnection: close\r\n\r\nnope")
                .await;
        let error = download_image_with(&url, &HttpFetch::default(), None)
            .await
            .expect_err("fails");
        let error = error.prosopo().expect("a prosopo error");
        assert_eq!(error.translation_key(), Some("DATABASE.IMAGE_GET_FAILED"));
        let wrapped: &prosopo_common::ContextValue =
            error.context().and_then(|c| c.get("error")).expect("wraps");
        assert!(
            wrapped.to_json().to_string().contains("API.BAD_REQUEST"),
            "{}",
            wrapped.to_json()
        );
    }

    #[tokio::test]
    async fn an_unparseable_url_is_rejected_as_fetch_rejects_it() {
        let error: ErrorObject = HttpFetch::default()
            .get("not a url")
            .await
            .expect_err("fails");
        assert_eq!(error.name, "TypeError");
        assert_eq!(plain_message(&error), "Failed to parse URL from not a url");
    }

    #[tokio::test]
    async fn a_refused_connection_is_a_network_failure() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("binds");
        let address = listener.local_addr().expect("an address");
        drop(listener);
        let error: ErrorObject = HttpFetch::default()
            .get(&format!("http://{address}/a"))
            .await
            .expect_err("fails");
        assert_eq!(plain_message(&error), "fetch failed");
    }
}

#[test]
fn a_solution_entry_round_trips_as_the_json_it_came_from() {
    let entries: Vec<SolutionEntry> =
        serde_json::from_value(json!(["0xab", 3, 1.5])).expect("entries");
    assert_eq!(
        entries,
        vec![
            SolutionEntry::Hash("0xab".to_string()),
            index(3.0),
            index(1.5)
        ]
    );
    assert_eq!(
        serde_json::to_value(&entries).expect("serialises"),
        json!(["0xab", 3, 1.5])
    );
}
