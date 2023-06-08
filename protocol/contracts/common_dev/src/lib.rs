#![cfg_attr(not(feature = "std"), no_std)]

/// An ink contract must be defined in order to import functions into another contract
#[ink::contract]
pub mod common_dev {

    /// No fields are stored in the util contract as it's just filler
    #[ink(storage)]
    pub struct CommonDev {}

    /// Implementation of the contract
    impl CommonDev {
        #[ink(constructor)]
        pub fn noop_ctor() -> Self {
            Self {}
        }

        /// No-op function to fill the mandatory ink message requirement
        #[ink(message)]
        pub fn noop_func(&self) {}
    }

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

        /// Imports all the definitions from the outer scope so we can use them here.
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

        /// Unit tests are placed in an inner module so they are independent of imports in other packages. For some reason in ink, when importing from this module the module being imported cannot be marked as an ink test otherwise compilation fails. Hence we put it as an inner module here. External packages can import the outer module and use the functions defined here.
        #[cfg(test)]
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
        pub mod tests_inner {
            use super::*;

            /// Test accounts are funded with existential deposit
            #[ink::test]
            fn test_accounts_funded() {
                for func in vec![get_admin_account, get_contract_account].iter() {
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
                for func in vec![
                    get_admin_account,
                    get_contract_account,
                    get_user_account,
                    get_forward_account,
                    get_provider_account,
                    get_dapp_account,
                ]
                .iter()
                {
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
                for func in vec![get_code_hash].iter() {
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
}
