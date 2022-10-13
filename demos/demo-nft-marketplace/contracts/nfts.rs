use ink_prelude::{string::String, vec::Vec, format};
use serde::Serialize;

#[derive(Serialize)]
pub struct Metadata {
    pub name: String,
    pub description: String,
    pub image: String,
}

// TODO: make this generatable (upload images and generate structs with new urls)
// TODO: simplify/lessen the amount of content
pub mod Nfts {
    use super::*;

    const DESC: &'static str = "Generated via https://bigheads.io/";

    pub const PRICE: u128 = 2_000_000_000_000;

    pub fn get_list() -> Vec<Metadata> {
        let mut index = 0;
        let arr = [0; 100];
        Vec::from(arr.map(|_| {
            index += 1;
            Metadata {
                name: format!("bighead#{}", index),
                description: String::from(DESC),
                image: format!(
                    "https://prosopo.github.io/demo-assets/nft-marketplace/img/bighead-{}.svg",
                    index
                ),
            }
        }))
    }
}
