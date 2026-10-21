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

mod address;
mod base;
mod hashing;
mod jwt;
mod key;
mod mnemonic;
mod nacl;
mod secp256k1;
mod signature;
mod sr25519;

use crate::u8a::hex_to_u8a;

pub(crate) fn hex(value: &str) -> Vec<u8> {
    hex_to_u8a(value)
}

/// The double-quoted literals between `start` and `end` in a TS source file.
pub(crate) fn string_literals<'a>(source: &'a str, start: &str, end: &str) -> Vec<&'a str> {
    let from = source.find(start).map_or(0, |i| i + start.len());
    let section = &source[from..];
    let section = &section[..section.find(end).unwrap_or(section.len())];
    section.split('"').skip(1).step_by(2).collect()
}

/// `[mnemonic, entropy, seed, secret]` from src/sr25519/pair/testing.spec.ts.
pub(crate) fn testing_vectors() -> Vec<[&'static str; 4]> {
    let source = include_str!("../../src/sr25519/pair/testing.spec.ts");
    string_literals(source, "const tests: Test[] = [", "\n];")
        .chunks(4)
        .map(|c| [c[0], c[1], c[2], c[3]])
        .collect()
}

/// The wordlists exported by src/mnemonic/wordlists/index.ts.
pub(crate) fn wordlists() -> Vec<(&'static str, Vec<&'static str>)> {
    let parse = |source: &'static str| -> Vec<&'static str> {
        string_literals(source, "export default ", ".split(")[0]
            .split('|')
            .collect()
    };
    vec![
        ("english", parse(include_str!("../../src/mnemonic/wordlists/en.ts"))),
        ("spanish", parse(include_str!("../../src/mnemonic/wordlists/es.ts"))),
        ("french", parse(include_str!("../../src/mnemonic/wordlists/fr.ts"))),
        ("italian", parse(include_str!("../../src/mnemonic/wordlists/it.ts"))),
        ("japanese", parse(include_str!("../../src/mnemonic/wordlists/jp.ts"))),
        ("korean", parse(include_str!("../../src/mnemonic/wordlists/ko.ts"))),
        ("chineseSimplified", parse(include_str!("../../src/mnemonic/wordlists/zh-s.ts"))),
        ("chineseTraditional", parse(include_str!("../../src/mnemonic/wordlists/zh-t.ts"))),
    ]
}

pub(crate) fn wordlist(name: &str) -> Vec<&'static str> {
    wordlists()
        .into_iter()
        .find(|(n, _)| *n == name)
        .map(|(_, words)| words)
        .unwrap_or_default()
}
