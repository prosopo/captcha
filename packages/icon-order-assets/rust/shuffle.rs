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

use prosopo_puzzle_assets::Prng;

/// Fisher-Yates, so every ordering is equally likely.
pub fn shuffle<T: Clone>(prng: &mut Prng, items: &[T]) -> Vec<T> {
    let mut out = items.to_vec();
    for i in (1..out.len()).rev() {
        let j = prng.int(0, i as i64) as usize;
        out.swap(i, j);
    }
    out
}
