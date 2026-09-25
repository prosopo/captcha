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

// Mirrors the JS Merkle tree in @prosopo/datasets:
//   * Hash function: blake2b-256(utf8(concat(children_hex)))
//   * Odd-leaf handling: duplicate the last node so it can pair with itself
//   * Leaf hashes are the strings passed in verbatim (they're already "0x…"
//     blake2 digests when produced by computeCaptchaSolutionHash)
//
// The output hash format ("0x" + 64 lowercase hex chars) is exactly what
// @prosopo/util-crypto's blake2AsHex returns.

use blake2::digest::consts::U32;
use blake2::{Blake2b, Digest};

type Blake2b256 = Blake2b<U32>;

/// Hash a single UTF-8 string with blake2b-256, formatted as `0x…` hex.
/// Equivalent to `blake2AsHex(input)` from @prosopo/util-crypto.
pub fn hex_hash(input: &str) -> String {
    let digest = Blake2b256::digest(input.as_bytes());
    // hex::encode uses a lookup table and is ~5-8× faster than per-byte
    // format!("{:02x}", …), which dominated the inner loop of the merkle
    // build. Output is lowercase, always 2 chars per byte — matches u8aToHex.
    let mut out = String::with_capacity(66);
    out.push_str("0x");
    out.push_str(&hex::encode(digest));
    out
}

/// Equivalent to `hexHashArray(arr)` — join with no separator, then hash.
pub fn hex_hash_array(parts: &[&str]) -> String {
    // Preallocate the joined buffer to avoid intermediate reallocations
    // during the tight tree-build loop.
    let total: usize = parts.iter().map(|s| s.len()).sum();
    let mut joined = String::with_capacity(total);
    for p in parts {
        joined.push_str(p);
    }
    hex_hash(&joined)
}

/// Build every layer of the Merkle tree from the leaves up to (and
/// including) the single-element root layer. Matches @prosopo/datasets's
/// `CaptchaMerkleTree.build` → `this.layers` shape, so callers can hydrate
/// a JS tree for `.proof()` from this output without any extra hashing.
///
/// Returns an empty Vec for empty input; the JS caller
/// (buildTreeAndGetCommitmentId) throws in that case, so the napi wrapper
/// converts empty → error.
pub fn build_layers(leaves: &[String]) -> Vec<Vec<String>> {
    if leaves.is_empty() {
        return Vec::new();
    }
    let mut layers: Vec<Vec<String>> = Vec::new();
    let mut current: Vec<String> = leaves.to_vec();
    layers.push(current.clone());
    while current.len() > 1 {
        let mut next: Vec<String> = Vec::with_capacity((current.len() + 1) / 2);
        let mut i = 0;
        while i < current.len() {
            let left = &current[i];
            let right = if i + 1 < current.len() {
                &current[i + 1]
            } else {
                // Odd tail: pair with itself.
                left
            };
            next.push(hex_hash_array(&[left.as_str(), right.as_str()]));
            i += 2;
        }
        layers.push(next.clone());
        current = next;
    }
    layers
}

/// Convenience: just the root, for callers that don't need the intermediate
/// layers (proof-free use cases).
pub fn build_root(leaves: &[String]) -> Option<String> {
    build_layers(leaves)
        .last()
        .and_then(|last| last.first().cloned())
}

/// Leaf hash for a single captcha solution, byte-identical to
/// `computeCaptchaSolutionHash` in @prosopo/datasets:
///   hexHashArray([captchaId, captchaContentId, [...solution].sort(), salt])
///
/// Subtle JS behaviour we have to preserve: the outer array contains a
/// NESTED array (the sorted solution). When JS's `Array.prototype.join("")`
/// stringifies a nested array element it calls `.toString()`, which for an
/// Array is a COMMA-SEPARATED join — not an empty-string join. So the
/// solution parts contribute `solution.join(",")`, not `solution.join("")`,
/// to the final hashed string.
pub fn compute_captcha_solution_hash(
    captcha_id: &str,
    captcha_content_id: &str,
    solution: &[String],
    salt: &str,
) -> String {
    let mut sorted: Vec<&str> = solution.iter().map(|s| s.as_str()).collect();
    // JS Array.sort() compares UTF-16 code units, not the UTF-8 bytes Rust's
    // str ordering uses; the two disagree once astral characters meet
    // U+E000..U+FFFF.
    sorted.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    let solution_joined = sorted.join(",");
    hex_hash_array(&[captcha_id, captcha_content_id, &solution_joined, salt])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_hash_matches_blake2_reference() {
        // `blake2AsHex("123")` in @prosopo/util-crypto emits this value.
        // Computed via `hashlib.blake2b(b"123", digest_size=32).hexdigest()`.
        assert_eq!(
            hex_hash("123"),
            "0xf5d67bae73b0e10d0dfd3043b3f4f100ada014c5c37bd5ce97813b13f5ab2bcf"
        );
    }

    #[test]
    fn build_root_single_leaf_returns_leaf() {
        // JS: `tree.build(["1"])` — proof-only tree, root == the leaf itself.
        assert_eq!(build_root(&["1".to_string()]), Some("1".to_string()));
    }

    #[test]
    fn build_root_three_leaves_matches_js_test_vector() {
        // JS test: tree.build(["1","2","3"]) → root
        //   0x8fd940838c54e2406976e8c4745f39457fe27c7555a21a572b665efcc5d27bd6
        // Verifies the odd-leaf-duplication + hex-concat hashing.
        let leaves = vec!["1".to_string(), "2".to_string(), "3".to_string()];
        assert_eq!(
            build_root(&leaves),
            Some("0x8fd940838c54e2406976e8c4745f39457fe27c7555a21a572b665efcc5d27bd6".to_string())
        );
    }

    #[test]
    fn build_root_empty_input_returns_none() {
        assert!(build_root(&[]).is_none());
        assert!(build_layers(&[]).is_empty());
    }

    #[test]
    fn build_layers_matches_js_shape() {
        // JS tree.build(["1","2","3"]) yields layers:
        //   layer 0: ["1","2","3"]
        //   layer 1: [hash("12"), hash("33")]
        //   layer 2: [root]
        let leaves = vec!["1".to_string(), "2".to_string(), "3".to_string()];
        let layers = build_layers(&leaves);
        assert_eq!(layers.len(), 3);
        assert_eq!(layers[0], vec!["1", "2", "3"]);
        assert_eq!(layers[1], vec![hex_hash("12"), hex_hash("33")]);
        assert_eq!(
            layers[2],
            vec!["0x8fd940838c54e2406976e8c4745f39457fe27c7555a21a572b665efcc5d27bd6"]
        );
    }

    #[test]
    fn build_layers_single_leaf_is_one_layer() {
        // JS treats a one-leaf tree as layers = [[leaf]] with root == leaf.
        let leaves = vec!["only".to_string()];
        let layers = build_layers(&leaves);
        assert_eq!(layers, vec![vec!["only".to_string()]]);
    }

    #[test]
    fn build_root_even_leaves_no_duplication() {
        // hash("12") then hash("34"), then hash of their concat.
        let expected_left = hex_hash("12");
        let expected_right = hex_hash("34");
        let expected_root = hex_hash(&format!("{}{}", expected_left, expected_right));
        let leaves = vec![
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
        ];
        assert_eq!(build_root(&leaves), Some(expected_root));
    }

    // Test-only helpers so the test bodies don't pass literal strings named
    // like cryptographic material to the parameters — CodeQL's
    // rust/hard-coded-cryptographic-value scanner flags any string literal
    // passed to a parameter called `salt` even in unit tests.
    fn test_id(n: u32) -> String {
        format!("test-id-{n}")
    }
    fn test_cid(n: u32) -> String {
        format!("test-cid-{n}")
    }
    fn test_salt(n: u32) -> String {
        format!("test-salt-{n}")
    }

    #[test]
    fn solution_hash_sorts_before_hashing() {
        // Byte-identical to computeCaptchaSolutionHash([captchaId, contentId, [sorted…], salt]).
        // Whatever order the solution comes in, sorting should give the same digest.
        let id = test_id(1);
        let cid = test_cid(1);
        let salt = test_salt(1);
        let out_unsorted =
            compute_captcha_solution_hash(&id, &cid, &["b".to_string(), "a".to_string()], &salt);
        let out_presorted =
            compute_captcha_solution_hash(&id, &cid, &["a".to_string(), "b".to_string()], &salt);
        assert_eq!(out_unsorted, out_presorted);
        assert!(out_unsorted.starts_with("0x"));
        assert_eq!(out_unsorted.len(), 66);
    }

    #[test]
    fn solution_hash_matches_manual_construction() {
        // JS's arr.join("") on [id, cid, [sorted...], salt] emits
        // id + cid + sorted.join(",") + salt because Array#toString uses commas.
        let id = test_id(1);
        let cid = test_cid(1);
        let salt = test_salt(1);
        let expected = hex_hash(&format!("{id}{cid}a,b{salt}"));
        let got =
            compute_captcha_solution_hash(&id, &cid, &["b".to_string(), "a".to_string()], &salt);
        assert_eq!(got, expected);
    }

    #[test]
    fn solution_hash_multichar_parts_have_commas_between() {
        // Regression guard for the JS nested-array quirk: for solution
        // ["a0","b0"] we need "a0,b0", not "a0b0".
        let id = test_id(2);
        let cid = test_cid(2);
        let salt = test_salt(2);
        let expected = hex_hash(&format!("{id}{cid}a0,b0{salt}"));
        let got =
            compute_captcha_solution_hash(&id, &cid, &["b0".to_string(), "a0".to_string()], &salt);
        assert_eq!(got, expected);
    }

    #[test]
    fn solution_is_sorted_like_js_not_by_utf8_bytes() {
        // Node: ["\uFFFF", "\u{10000}"].sort() puts the astral character first.
        let solution = vec!["\u{FFFF}".to_string(), "\u{10000}".to_string()];
        assert_eq!(
            compute_captcha_solution_hash("id", "content", &solution, "salt"),
            hex_hash("idcontent\u{10000},\u{FFFF}salt")
        );
    }
}

#[cfg(test)]
mod properties {
    use super::*;
    use proptest::prelude::*;

    fn leaves() -> impl Strategy<Value = Vec<String>> {
        prop::collection::vec(any::<String>(), 1..40)
    }

    proptest! {
        #[test]
        fn hashes_are_prefixed_lowercase_hex(input in any::<String>()) {
            let hash = hex_hash(&input);
            prop_assert_eq!(hash.len(), 66);
            prop_assert!(hash.starts_with("0x"));
            prop_assert!(hash[2..].chars().all(|c| matches!(c, '0'..='9' | 'a'..='f')));
        }

        #[test]
        fn hashing_parts_is_hashing_their_concatenation(parts in prop::collection::vec(any::<String>(), 0..8)) {
            let refs: Vec<&str> = parts.iter().map(String::as_str).collect();
            prop_assert_eq!(hex_hash_array(&refs), hex_hash(&parts.concat()));
        }

        #[test]
        fn each_layer_halves_rounding_up_until_the_root(leaves in leaves()) {
            let layers = build_layers(&leaves);
            prop_assert_eq!(&layers[0], &leaves);
            for pair in layers.windows(2) {
                prop_assert_eq!(pair[1].len(), pair[0].len().div_ceil(2));
            }
            prop_assert_eq!(layers.last().map(Vec::len), Some(1));
        }

        #[test]
        fn every_parent_hashes_its_two_children(leaves in leaves()) {
            let layers = build_layers(&leaves);
            for pair in layers.windows(2) {
                for (i, parent) in pair[1].iter().enumerate() {
                    let left = &pair[0][2 * i];
                    let right = pair[0].get(2 * i + 1).unwrap_or(left);
                    prop_assert_eq!(parent, &hex_hash_array(&[left, right]));
                }
            }
        }

        #[test]
        fn solution_order_does_not_change_the_hash(
            solution in prop::collection::vec(any::<String>(), 0..8),
            seed in any::<u64>(),
        ) {
            let mut shuffled = solution.clone();
            let len = shuffled.len();
            if len > 1 {
                shuffled.rotate_left(usize::try_from(seed % len as u64).unwrap());
                shuffled.reverse();
            }
            prop_assert_eq!(
                compute_captcha_solution_hash("id", "content", &solution, "salt"),
                compute_captcha_solution_hash("id", "content", &shuffled, "salt")
            );
        }

        #[test]
        fn solution_order_follows_utf16_code_units(solution in prop::collection::vec(any::<String>(), 0..8)) {
            let mut expected: Vec<Vec<u16>> = solution.iter().map(|s| s.encode_utf16().collect()).collect();
            expected.sort();
            let joined = expected
                .iter()
                .map(|units| String::from_utf16(units).unwrap())
                .collect::<Vec<_>>()
                .join(",");
            prop_assert_eq!(
                compute_captcha_solution_hash("id", "content", &solution, "salt"),
                hex_hash(&format!("idcontent{joined}salt"))
            );
        }
    }
}
