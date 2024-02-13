mod utils;
use sha2::Sha256;
use sha256::{digest, try_digest};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn run(input: [u8], difficulty: usize) -> String {
    let nonce: u32 = 0;
    while (true) {
        let mut hasher = Sha256::new();
        hasher.update(input);
        hasher.update(nonce.to_le_bytes());
        let result = hasher.finalize();
        let found = true;
        for(let i = 0; i < difficulty; i++) {
            if (result[i] != 0) {
                found = false;
                break;
            }
        }
        if(found) {
            return nonce;
        }
        nonce++;
    }
}
