// Copyright 2021-2024 Prosopo (UK) Ltd.
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
#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub use self::common::{Common, CommonRef};
pub mod math;
pub use math::Math;

/// Print and return an error in ink
#[macro_export]
macro_rules! err {
    ($self_:ident, $err:expr) => {{
        ink::env::debug_println!(
            "ERROR:
    type: {:?}
    block: {:?}
    caller: {:?}
",
            $err,
            $self_.env().block_number(),
            $self_.env().caller(),
        );
        Err($err)
    }};
}

#[macro_export]
macro_rules! err_fn {
    ($self_:ident, $err:expr) => {
        || {
            ink::env::debug_println!(
                "ERROR:
        type: {:?}
        block: {:?}
        caller: {:?}
    ",
                $err,
                $self_.env().block_number(),
                $self_.env().caller(),
            );
            $err
        }
    };
}

#[macro_export]
macro_rules! lazy {
    ($lazy:expr, $func:ident, $value:expr) => {
        let mut contents = $lazy.get_or_default();
        contents.$func($value);
        $lazy.set(&contents);
    };
}

/// An ink contract must be defined in order to import functions into another contract
#[ink::contract]
pub mod common {

    pub mod config {
        use super::*;

        /// Get the git commit id from when this contract was built
        pub fn get_git_commit_id() -> [u8; 20] {
            let env_git_commit_id: [u8; 20] = [
                153, 134, 127, 75, 38, 49, 57, 51, 175, 255, 238, 65, 223, 57, 224, 49, 161, 15,
                168, 85,
            ];
            env_git_commit_id
        }

        /// the admin which can control this contract. set to author/instantiator by default
        pub fn get_admin() -> AccountId {
            let env_admin_bytes: [u8; 32] = [
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ];
            AccountId::from(env_admin_bytes)
        }
    }

    pub fn check_is_admin(account: AccountId) -> Result<(), Error> {
        if account != config::get_admin() {
            return Err(Error::NotAuthorised);
        }
        Ok(())
    }

    /// The errors that can be returned by the Proxy contract.
    #[derive(Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(
        any(feature = "std", feature = "ink-as-dependency"),
        derive(scale_info::TypeInfo)
    )]
    // #[cfg_attr(any(feature = "std", feature = "ink-as-dependency"), derive(ink::storage::traits::StorageLayout))]
    pub enum Error {
        NotAuthorised,
        TransferFailed,
        SetCodeHashFailed,
        InvalidDestination,
        UnknownMessage,
        /// Returned if provider account exists when it shouldn't
        ProviderAccountExists,
        /// Returned if provider exists when it shouldn't
        ProviderExists,
        /// Returned if provider account does not exists when it shouldn't
        ProviderAccountDoesNotExist,
        /// Returned if provider does not exist when it should
        ProviderDoesNotExist,
        /// Returned if provider has insufficient funds to operate
        ProviderInsufficientFunds,
        /// Returned if provider is inactive and trying to use the service
        ProviderInactive,
        /// Returned if url is already used by another provider
        ProviderUrlUsed,
        /// Returned if dapp exists when it shouldn't
        DappExists,
        /// Returned if dapp does not exist when it should
        DappDoesNotExist,
        /// Returned if dapp is inactive and trying to use the service
        DappInactive,
        /// Returned if dapp has insufficient funds to operate
        DappInsufficientFunds,
        /// Returned if captcha data does not exist
        CaptchaDataDoesNotExist,
        /// Returned if solution commitment does not exist when it should
        CommitDoesNotExist,
        /// Returned if dapp user does not exist when it should
        DappUserDoesNotExist,
        /// Returned if there are no active providers
        NoActiveProviders,
        /// Returned if the dataset ID and dataset ID with solutions are identical
        DatasetIdSolutionsSame,
        /// CodeNotFound ink env error
        CodeNotFound,
        /// An unknown ink env error has occurred
        #[default]
        Unknown,
        /// Invalid contract
        InvalidContract,
        /// Invalid payee. Returned when the payee value does not exist in the enum
        InvalidPayee,
        /// Returned if not all captcha statuses have been handled
        InvalidCaptchaStatus,
        /// No correct captchas in history (either history is empty or all captchas are incorrect)
        NoCorrectCaptcha,
        /// Returned if not enough providers are active
        NotEnoughActiveProviders,
        /// Returned if provider fee is too high
        ProviderFeeTooHigh,
        /// Returned if the commitment already exists
        CommitAlreadyExists,
        /// Returned if the caller is not the author
        NotAuthor,
        /// Returned if there is an math error, e.g. overflow, div 0, etc
        Math,
    }

    /// get the account id in byte array format
    pub fn account_id_bytes(account: &AccountId) -> &[u8; 32] {
        AsRef::<[u8; 32]>::as_ref(account)
    }

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
            *account_id_bytes(&account)
        }

        /// Get the git commit id from when this contract was built
        #[ink(message)]
        pub fn get_git_commit_id(&self) -> [u8; 20] {
            config::get_git_commit_id()
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
        use ink;
        use ink::codegen::Env;
        use ink::env::hash::Blake2x256;
        use ink::env::hash::CryptoHash;
        use ink::env::hash::HashOutput;

        pub const set_caller: fn(AccountId) =
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>;
        pub const get_account_balance: fn(AccountId) -> Result<u128, ink::env::Error> =
            ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>;
        pub const set_account_balance: fn(AccountId, u128) =
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>;
        pub const set_callee: fn(AccountId) =
            ink::env::test::set_callee::<ink::env::DefaultEnvironment>;
        pub const default_accounts: fn() -> ink::env::test::DefaultAccounts<
            ink::env::DefaultEnvironment,
        > = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>;
        const set_contract: fn(AccountId) =
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>;
        const callee: fn() -> AccountId = ink::env::test::callee::<ink::env::DefaultEnvironment>;

        const ADMIN_ACCOUNT_PREFIX: u8 = 0x01;
        const DAPP_ACCOUNT_PREFIX: u8 = 0x02;
        const PROVIDER_ACCOUNT_PREFIX: u8 = 0x03;
        const USER_ACCOUNT_PREFIX: u8 = 0x04;
        const CONTRACT_ACCOUNT_PREFIX: u8 = 0x05;
        const CODE_HASH_PREFIX: u8 = 0x06;
        const FORWARD_ADDRESS_PREFIX: u8 = 0x07;

        // unused account is 0x00 - do not use this, it will be the default caller, so could get around caller checks accidentally
        pub fn get_unused_account() -> AccountId {
            AccountId::from([0x00; 32])
        }

        // build an account. Accounts have the first byte set to the type of account and the next 16 bytes are the index of the account
        pub fn get_account_bytes(account_type: u8, index: u128) -> [u8; 32] {
            let mut bytes = [0x00; 32];
            bytes[0] = account_type;
            bytes[1..17].copy_from_slice(&index.to_le_bytes());
            bytes
        }

        pub fn get_account(account_type: u8, index: u128) -> AccountId {
            let account = AccountId::from(get_account_bytes(account_type, index));
            // fund the account so it exists if not already
            let balance = get_account_balance(account);
            if balance.is_err() {
                // account doesn't have the existential deposit so doesn't exist
                // give it funds to create it
                set_account_balance(account, 1);
            }
            account
        }

        /// get the nth admin account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        pub fn get_admin_account(index: u128) -> AccountId {
            get_account(ADMIN_ACCOUNT_PREFIX, index)
        }

        /// get the nth provider account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        pub fn get_provider_account(index: u128) -> AccountId {
            get_account(PROVIDER_ACCOUNT_PREFIX, index)
        }

        /// get the nth dapp account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        pub fn get_dapp_account(index: u128) -> AccountId {
            get_account(DAPP_ACCOUNT_PREFIX, index)
        }

        /// get the nth user account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        pub fn get_user_account(index: u128) -> AccountId {
            get_account(USER_ACCOUNT_PREFIX, index)
        }

        /// get the nth contract account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        pub fn get_contract_account(index: u128) -> AccountId {
            let account = get_account(CONTRACT_ACCOUNT_PREFIX, index);
            set_contract(account); // mark the account as a contract
            account
        }

        /// get the nth code hash. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        pub fn get_code_hash(index: u128) -> [u8; 32] {
            get_account_bytes(CODE_HASH_PREFIX, index)
        }

        pub fn get_forward_account(index: u128) -> AccountId {
            get_account(FORWARD_ADDRESS_PREFIX, index)
        }

        pub fn reset_caller() {
            set_caller(get_unused_account());
        }

        pub fn reset_callee() {
            set_callee(get_unused_account());
        }

        /// get the nth contract. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        pub fn get_contract<A>(index: u128, ctor: fn(index: u128) -> A) -> A {
            // get the current callee and caller
            let orig_callee = callee();
            let account = get_contract_account(index); // the account for the contract
            set_callee(account);
            // give the contract account some funds
            set_account_balance(account, 1);
            // set the caller to the first admin
            set_caller(get_admin_account(0));
            // now construct the contract instance
            let mut contract = ctor(index);
            // set the caller back to the unused acc
            reset_caller();
            // and callee back to the original
            set_callee(orig_callee);
            contract
        }

        /// Test accounts are funded with existential deposit
        #[ink::test]
        fn test_accounts_funded() {
            let arr: Vec<&dyn Fn(u128) -> AccountId> =
                vec![&get_admin_account, &get_contract_account];
            for func in arr.iter() {
                for i in 0..10 {
                    let account = func(i);
                    // check the account has funds. Will panic if not as no existential deposit == account not found
                    get_account_balance(account).unwrap();
                }
            }
        }

        /// Are the unit test accounts unique, i.e. make sure there's no collisions in accounts destined for different roles, as this would invalidate any caller guards
        #[ink::test]
        fn test_accounts_unique() {
            let mut set: std::collections::HashSet<[u8; 32]> = std::collections::HashSet::new();

            // for each method of generating an account
            let arr: Vec<&dyn Fn(u128) -> AccountId> = vec![
                &get_admin_account,
                &get_contract_account,
                &get_user_account,
                &get_forward_account,
                &get_provider_account,
                &get_dapp_account,
            ];
            for func in arr.iter() {
                // try the first 10 accounts
                for i in 0..10 {
                    let account = func(i);
                    assert!(
                        set.insert(*AsRef::<[u8; 32]>::as_ref(&account)),
                        "Duplicate account ID found: {:?}",
                        account
                    );
                }
            }

            // do the same for non-account based IDs
            let arr_hash: Vec<&dyn Fn(u128) -> [u8; 32]> = vec![&get_code_hash];
            for func in arr_hash.iter() {
                // try the first 10 accounts
                for i in 0..10 {
                    let account = func(i);
                    assert!(
                        set.insert(account),
                        "Duplicate account ID found: {:?}",
                        account
                    );
                }
            }
        }
    }
}
