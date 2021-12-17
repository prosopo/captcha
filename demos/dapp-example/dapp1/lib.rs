#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
pub mod dapp1 {
    use dapp2::Dapp2 as Dapp2;

    #[ink(storage)]
    pub struct Dapp1 {
        dapp2_instance: Dapp2
    }

    impl Dapp1 {
        /// Get existing `Dapp2` contract at `address`
        #[ink(constructor)]
        pub fn new(address: AccountId) -> Self {
            let dapp2_instance: Dapp2 = ink_env::call::FromAccountId::from_account_id(address);
            Self {
                dapp2_instance
            }
        }

        /// Calls the Dapp2 contract.
        #[ink(message)]
        pub fn dapp2_do_something(&self) -> u8 {
            self.dapp2_instance.do_something()
        }
    }
}
