mod utils;
use sha2::Digest;
use sha2::Sha256;
use sha256::{digest, try_digest};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn run2(count: usize, arrSize: usize) -> u32 {
    let mut vec: Vec<u8> = Vec::new();
    for i in 0..arrSize {
        vec.push(0u8);
    }
    for i in 0..count {
        let mut hasher = Sha256::new();
        for j in 0..arrSize {
            vec[j] = (i + j) as u8;
        }
        hasher.update(vec.clone());
        let result = hasher.finalize();
    }
    return 0;
}

#[wasm_bindgen]
pub fn run(input: Vec<u8>, difficulty: usize) -> u32 {
    let mut hasher = Sha256::new();
    hasher.update(input);
    let result = hasher.finalize();
    return result[0] as u32;
    // for i in 0..100000 {
    //     let mut hasher = Sha256::new();
    //     let arr32 = [i as u32; 32];
    //     // convert arr32 to Vec<u8>
    //     let mut vec: Vec<u8> = Vec::new();
    //     for i in 0..32 {
    //         let bytes = arr32[i].to_le_bytes();
    //         vec.extend_from_slice(&bytes);
    //     }
    //     hasher.update(vec);
    //     let result = hasher.finalize();
    // }
    // return 0;

    // let mut nonce: u32 = 0;
    // loop {
    //     let mut hasher = Sha256::new();
    //     hasher.update(input.clone());
    //     hasher.update(nonce.to_le_bytes());
    //     let result = hasher.finalize();
    //     let mut found = true;
    //     for i in 0..difficulty {
    //         if result[i] != 0 {
    //             found = false;
    //             break;
    //         }
    //     }
    //     if found {
    //         return nonce;
    //     }
    //     nonce += 1;
    // }
}
