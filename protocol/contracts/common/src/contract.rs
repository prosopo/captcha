// pub use self::contract::{Common, CommonRef};
use super::config::{Config, ConfigDefaultEnvironment};
use super::utils::account_id_bytes;
// use crate::common::account_id_bytes;

#[ink::contract]
pub mod contract {
    use super::*;

    #[derive(Default)]
    /// No fields are stored in the util contract as it's just filler
    #[ink(storage)]
    pub struct CommonA {}

    /// Implementation of the contract
    impl CommonA {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {}
        }

        /// Print and get the caller of this function
        /// This will print and get the caller's account in byte format, e.g. [1,2,3...32]
        #[ink(message)]
        pub fn get_caller(&self) -> AccountId {
            ink::env::debug_println!("caller: {:?}", self.env().caller());
            self.env().caller()
        }

        /// Print and get the caller bytes of this function
        /// This will print and get the caller's account in byte format, e.g. [1,2,3...32]
        #[ink(message)]
        pub fn get_caller_bytes(&self) -> [u8; 32] {
            let caller = self.env().caller();
            self.get_account_bytes(caller)
        }

        /// Print and get the caller bytes of this function
        /// This will print and get the caller's account in byte format, e.g. [1,2,3...32]
        #[ink(message)]
        pub fn get_account_bytes(&self, account: AccountId) -> [u8; 32] {
            ink::env::debug_println!("account: {:?}", account);
            *account_id_bytes(&account)
        }

        /// Get the git commit id from when this contract was built
        #[ink(message)]
        pub fn get_git_commit_id(&self) -> [u8; 20] {
            ConfigDefaultEnvironment::get_git_commit_id()
        }
    }
}
