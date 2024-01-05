// pub use self::contract::{Common, CommonRef};

#[ink::contract]
pub mod contract {
    use crate::config::Config as ConfigTrait;
    use crate::config::DefaultConfig;
    use crate::errors::Error as ErrorEnum;
    use crate::utils::DefaultUtils;
    use crate::utils::Utils as UtilsTrait;

    #[allow(dead_code)]
    type Error = ErrorEnum<Environment>;
    type Config = DefaultConfig<Environment>;
    type Utils = DefaultUtils<Environment>;

    #[derive(Default)]
    /// No fields are stored in the util contract as it's just filler
    #[ink(storage)]
    pub struct Common {}

    /// Implementation of the contract
    impl Common {
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
            Utils::account_id_bytes(&account)
        }

        /// Get the git commit id from when this contract was built
        #[ink(message)]
        pub fn get_git_commit_id(&self) -> [u8; 20] {
            Config::get_git_commit_id()
        }
    }

    #[cfg(any(test, feature = "test-dependency"))]
    #[cfg_attr(
        debug_assertions,
        allow(
            dead_code,
            unused_imports,
            unused_variables,
            unused_mut,
            unused_must_use,
            non_upper_case_globals,
            non_shorthand_field_patterns
        )
    )]
    pub mod tests {

        use super::*;
        use crate::*;
        use ink;
        use ink::codegen::Env;
        use ink::env::hash::Blake2x256;
        use ink::env::hash::CryptoHash;
        use ink::env::hash::HashOutput;

        #[ink::test]
        fn test_dummy() {
            // no need to test the common contract, it's for debugging / demo purposes :) (common is a lib to other contracts, the contract portion of it is for testing + debugging, e.g. to print the caller, etc.)
            assert!(true);
        }
    }
}
