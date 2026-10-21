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

//! pair/defaults.ts: the PKCS#8 framing of an exported pair.

/// The public/secret divider (generations 1 to 3).
pub const PAIR_DIV: [u8; 5] = [161, 35, 3, 33, 0];

/// The start block (generations 1 to 3).
pub const PAIR_HDR: [u8; 16] = [48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32];

pub const PUB_LENGTH: usize = 32;

pub const SALT_LENGTH: usize = 32;

pub const SEC_LENGTH: usize = 64;

/// A user-supplied seed, which generations 1 and 2 stored in place of the secret key.
pub const SEED_LENGTH: usize = 32;
