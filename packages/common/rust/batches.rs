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

use std::future::Future;
use std::num::NonZeroUsize;

/// `chunkIntoBatches`. The TS throws a `RangeError` for a chunk size of 0, which the type rules
/// out here.
pub fn chunk_into_batches<T: Clone>(items: &[T], chunk_size: NonZeroUsize) -> Vec<Vec<T>> {
    items.chunks(chunk_size.get()).map(<[T]>::to_vec).collect()
}

/// `executeBatchesSequentially`: runs `handler` on one batch at a time, passing each batch's
/// index, and stops at the first error.
pub async fn execute_batches_sequentially<B, R, E, F, Fut>(
    batches: &[B],
    mut handler: F,
) -> Result<Vec<R>, E>
where
    F: FnMut(&B, usize) -> Fut,
    Fut: Future<Output = Result<R, E>>,
{
    let mut results: Vec<R> = Vec::with_capacity(batches.len());
    for batch in batches {
        let result: R = handler(batch, results.len()).await?;
        results.push(result);
    }
    Ok(results)
}
