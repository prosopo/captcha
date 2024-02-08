mod utils;
use sha256::{digest, try_digest};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn run(input: String) -> String {
    digest(input)
}
