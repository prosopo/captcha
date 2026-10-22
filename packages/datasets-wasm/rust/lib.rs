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

//! The widget's image captcha commitment as WebAssembly. procaptcha commits to its solutions by
//! the merkle root over each solution's hash and the provider recomputes it, so both run this
//! one implementation (prosopo-datasets). The module imports nothing: the loader in src/ writes
//! the solutions' JSON into its memory and reads the answer back out.

use prosopo_datasets::{compute_captcha_solution_hash, merkle_root};
use prosopo_types::api_types::CaptchaSolution;
use std::cell::RefCell;

/// The commitment id of a set of solutions: the root of the merkle tree over their hashes.
pub fn commitment_id(solutions: &[CaptchaSolution]) -> Result<String, String> {
    let leaves: Vec<String> = solutions
        .iter()
        .map(compute_captcha_solution_hash)
        .collect();
    merkle_root(&leaves).ok_or_else(|| "No captcha solutions to commit to".to_string())
}

/// [`commitment_id`] of a JSON array of solutions.
pub fn commitment_id_of_json(json: &str) -> Result<String, String> {
    let solutions: Vec<CaptchaSolution> =
        serde_json::from_str(json).map_err(|error| error.to_string())?;
    commitment_id(&solutions)
}

thread_local! {
    static ANSWER: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

/// Room for `len` bytes the loader writes its input into.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buffer: Vec<u8> = Vec::with_capacity(len);
    let pointer: *mut u8 = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

/// Frees what [`alloc`] gave.
///
/// # Safety
/// `pointer` and `len` must be a pair [`alloc`] returned and not yet freed.
#[no_mangle]
pub unsafe extern "C" fn dealloc(pointer: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(pointer, 0, len));
}

/// [`commitment_id_of_json`] of the UTF-8 at `pointer`: 0 with the id as the answer, or 1 with
/// the error's message.
///
/// # Safety
/// `pointer` must address `len` initialised bytes.
#[no_mangle]
pub unsafe extern "C" fn commitment_id_json(pointer: *const u8, len: usize) -> u32 {
    let input: &[u8] = std::slice::from_raw_parts(pointer, len);
    let result: Result<String, String> = std::str::from_utf8(input)
        .map_err(|error| error.to_string())
        .and_then(commitment_id_of_json);
    let (status, answer) = match result {
        Ok(id) => (0, id),
        Err(error) => (1, error),
    };
    ANSWER.with(|stored| *stored.borrow_mut() = answer.into_bytes());
    status
}

/// Where the last answer is.
#[no_mangle]
pub extern "C" fn answer_pointer() -> *const u8 {
    ANSWER.with(|stored| stored.borrow().as_ptr())
}

/// How long the last answer is.
#[no_mangle]
pub extern "C" fn answer_len() -> usize {
    ANSWER.with(|stored| stored.borrow().len())
}

/// Nothing the commitment computes is random; key generation, which is, is linked in but never
/// reached.
#[cfg(target_arch = "wasm32")]
fn no_randomness(_: &mut [u8]) -> Result<(), getrandom::Error> {
    Err(getrandom::Error::UNSUPPORTED)
}

#[cfg(target_arch = "wasm32")]
getrandom::register_custom_getrandom!(no_randomness);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_an_empty_set_and_malformed_json() {
        assert!(commitment_id_of_json("[]").is_err());
        assert!(commitment_id_of_json("{").is_err());
        assert!(commitment_id_of_json(r#"[{"captchaId":"0x1"}]"#).is_err());
    }

    #[test]
    fn answers_through_memory_as_the_loader_reads_it() {
        let input: &[u8] =
            br#"[{"captchaId":"0x1","captchaContentId":"0x2","solution":["0x3"],"salt":"0x4"}]"#;
        let status: u32 = unsafe { commitment_id_json(input.as_ptr(), input.len()) };
        let answer: String = unsafe {
            String::from_utf8(std::slice::from_raw_parts(answer_pointer(), answer_len()).to_vec())
                .expect("utf-8")
        };
        assert_eq!(status, 0);
        assert_eq!(
            Ok(answer),
            commitment_id_of_json(std::str::from_utf8(input).expect("utf-8"))
        );
    }
}
