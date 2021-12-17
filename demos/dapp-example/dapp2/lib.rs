#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
pub mod dapp2 {
    #[ink(storage)]
    pub struct Dapp2 {
        pub what: u8,
    }

    impl Dapp2 {
        #[ink(constructor)]
        pub fn new() -> Self {
            let what = 2.into();
            Self {
                what
            }
        }

        #[ink(message)]
        pub fn do_something(&mut self) -> u8 {
            ink_env::debug_println!("{}", self.what);
            self.what
        }
    }
}
