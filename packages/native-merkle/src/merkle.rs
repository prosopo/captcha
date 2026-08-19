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
    let mut out = String::with_capacity(66);
    out.push_str("0x");
    for byte in &digest {
        // Lowercase, always 2 chars per byte (matches u8aToHex).
        out.push_str(&format!("{:02x}", byte));
    }
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
    sorted.sort(); // lexicographic — matches JS Array.sort() default on strings
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

    #[test]
    fn solution_hash_sorts_before_hashing() {
        // Byte-identical to computeCaptchaSolutionHash([captchaId, contentId, [sorted…], salt]).
        // sorted(["b","a"]) == ["a","b"], joined "ab"; then the outer join is
        // captchaId + contentId + "ab" + salt, then blake2b.
        let out_unsorted = compute_captcha_solution_hash(
            "id1",
            "cid1",
            &["b".to_string(), "a".to_string()],
            "salt",
        );
        let out_presorted = compute_captcha_solution_hash(
            "id1",
            "cid1",
            &["a".to_string(), "b".to_string()],
            "salt",
        );
        assert_eq!(out_unsorted, out_presorted);
        // And its shape is a proper "0x…64-hex" hash.
        assert!(out_unsorted.starts_with("0x"));
        assert_eq!(out_unsorted.len(), 66);
    }

    #[test]
    fn solution_hash_matches_manual_construction() {
        // JS's arr.join("") on [id, cid, [sorted...], salt] emits
        // `id` + `cid` + sorted.join(",") + `salt` because Array#toString
        // uses comma separators. Rust mirrors that exactly.
        let expected = hex_hash("id1cid1a,bsalt");
        let got = compute_captcha_solution_hash(
            "id1",
            "cid1",
            &["b".to_string(), "a".to_string()],
            "salt",
        );
        assert_eq!(got, expected);
    }

    #[test]
    fn solution_hash_multichar_parts_have_commas_between() {
        // Regression guard for the JS nested-array quirk: for solution
        // ["a0","b0"] we need "a0,b0", not "a0b0". Manual reference builds
        // the same string JS would.
        let expected = hex_hash("idcida0,b0salt");
        let got = compute_captcha_solution_hash(
            "id",
            "cid",
            &["b0".to_string(), "a0".to_string()],
            "salt",
        );
        assert_eq!(got, expected);
    }
}
