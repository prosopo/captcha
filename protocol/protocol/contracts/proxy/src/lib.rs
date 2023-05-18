#![cfg_attr(not(feature = "std"), no_std)]

/// Print and return an error in ink
macro_rules! err {
    ($err:expr) => {{
        Err(get_self!().print_err($err, function_name!()))
    }};
}

// macro_rules! err_fn {
//     ($err:expr) => {
//         || get_self!().print_err($err, function_name!())
//     };
// }

#[allow(unused_macros)]
#[named_functions_macro::named_functions] // allows the use of the function_name!() macro
#[inject_self_macro::inject_self] // allows the use of the get_self!() macro
#[ink::contract]
pub mod proxy {

    use ink::env::debug_println as debug;
    use ink::storage::traits::StorageLayout;

    #[ink(storage)]
    pub struct Proxy {
        /// The `AccountId` of a contract where any call that does not match a
        /// selector of this contract is forwarded to.
        destination: AccountId,
        admin: AccountId, // the admin account to manage proxy_set_code_hash, proxy_withdraw, proxy_terminate, and set_forward_address
    }

    /// The errors that can be returned by the Proxy contract.
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum Error {
        NotAuthorised,
        TransferFailed,
        SetCodeHashFailed,
        InvalidDestination,
    }

    impl Proxy {
        /// Instantiate this contract with an address of the `logic` contract.
        ///
        /// Sets the privileged account to the caller. Only this account may
        /// later changed the `forward_to` address.
        #[ink(constructor)]
        pub fn new(destination: AccountId) -> Self {
            let instantiator = AccountId::from([0x1; 32]); // alice
            if Self::env().caller() != instantiator {
                panic!("Not authorised to instantiate this contract");
            }
            Self::new_unguarded(destination)
        }

        fn new_unguarded(destination: AccountId) -> Self {
            Self {
                destination,
                admin: Self::env().caller(), // set the admin to the caller
            }
        }

        /// Print and return an error
        fn print_err(&self, err: Error, fn_name: &str) -> Error {
            debug!(
                "ERROR in {}() at block {} with caller {:?}\n'{:?}'",
                fn_name,
                self.env().block_number(),
                self.env().caller(),
                err
            );
            err
        }

        /// Set the destination to forward to for this contract
        #[ink(message)]
        pub fn proxy_set_destination(&mut self, destination: AccountId) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return err!(Error::NotAuthorised);
            }

            if !self.env().is_contract(&destination) {
                return err!(Error::InvalidDestination);
            }

            self.destination = destination;
            Ok(())
        }

        /// Set the admin for this contract
        #[ink(message)]
        pub fn proxy_set_admin(&mut self, new_admin: AccountId) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return err!(Error::NotAuthorised);
            }

            self.admin = new_admin;
            Ok(())
        }

        #[ink(message)]
        pub fn proxy_withdraw(&mut self, amount: Balance) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return err!(Error::NotAuthorised);
            }

            match self.env().transfer(caller, amount) {
                Ok(()) => Ok(()),
                Err(_) => Err(Error::TransferFailed),
            }
        }

        #[ink(message)]
        pub fn proxy_terminate(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return err!(Error::NotAuthorised);
            }

            self.env().terminate_contract(caller);
            // unreachable
        }

        /// Modifies the code which is used to execute calls to this contract address (`AccountId`).
        /// We use this to upgrade the contract logic. The caller must be an operator.
        /// `true` is returned on successful upgrade, `false` otherwise
        /// Errors are returned if the caller is not an admin, if the code hash is the callers
        /// account_id, if the code is not found, and for any other unknown ink errors
        #[ink(message)]
        pub fn proxy_set_code_hash(&mut self, code_hash: [u8; 32]) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return err!(Error::NotAuthorised);
            }

            match ink::env::set_code_hash(&code_hash) {
                Ok(()) => Ok(()),
                Err(_) => err!(Error::SetCodeHashFailed),
            }
        }

        /// Fallback message for a contract call that doesn't match any
        /// of the other message selectors.
        ///
        /// # Note:
        ///
        /// - We allow payable messages here and would forward any optionally supplied
        ///   value as well.
        /// - If the self receiver were `forward(&mut self)` here, this would not
        ///   have any effect whatsoever on the contract we forward to.
        #[ink(message, payable, selector = _)]
        pub fn proxy_forward(&self) -> u32 {
            ink::env::call::build_call::<ink::env::DefaultEnvironment>()
                .call(self.destination)
                .transferred_value(self.env().transferred_value())
                .gas_limit(0)
                .call_flags(
                    ink::env::CallFlags::default()
                        .set_forward_input(true)
                        .set_tail_call(true),
                )
                .try_invoke()
                .unwrap_or_else(|env_err| {
                    panic!(
                        "cross-contract call to {:?} failed due to {:?}",
                        self.destination, env_err
                    )
                })
                .unwrap_or_else(|lang_err| {
                    panic!(
                        "cross-contract call to {:?} failed due to {:?}",
                        self.destination, lang_err
                    )
                });
            unreachable!("the forwarded call will never return since `tail_call` was set");
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// ************** READ BEFORE TESTING *******************
    /// The below code is technically just normal Rust code.
    /// Therefore you can use println!() as usual, but by default stdout is only shown for tests which fail.
    /// Run the tests via `cargo test` (no need for `cargo contract`!)
    /// *********************************
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
    mod tests {
        use ink;
        use ink::codegen::Env;
        use ink::env::hash::Blake2x256;
        use ink::env::hash::CryptoHash;
        use ink::env::hash::HashOutput;

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        const set_caller: fn(AccountId) =
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>;
        const get_account_balance: fn(AccountId) -> Result<u128, ink::env::Error> =
            ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>;
        const set_account_balance: fn(AccountId, u128) =
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>;
        const set_callee: fn(AccountId) =
            ink::env::test::set_callee::<ink::env::DefaultEnvironment>;
        const set_contract: fn(AccountId) =
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>;
        const default_accounts: fn() -> ink::env::test::DefaultAccounts<
            ink::env::DefaultEnvironment,
        > = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>;

        // unused account is 0x00 - do not use this, it will be the default caller, so could get around caller checks accidentally
        fn get_unused_account() -> AccountId {
            AccountId::from([0x00; 32])
        }

        const ADMIN_ACCOUNT_PREFIX: u8 = 0x01;
        const USER_ACCOUNT_PREFIX: u8 = 0x04;
        const CONTRACT_ACCOUNT_PREFIX: u8 = 0x05;
        const CODE_HASH_PREFIX: u8 = 0x06;
        const FORWARD_ADDRESS_PREFIX: u8 = 0x07;

        // build an account. Accounts have the first byte set to the type of account and the next 16 bytes are the index of the account
        fn get_account_bytes(account_type: u8, index: u128) -> [u8; 32] {
            let mut bytes = [0x00; 32];
            bytes[0] = account_type;
            bytes[1..17].copy_from_slice(&index.to_le_bytes());
            bytes
        }

        fn get_account(account_type: u8, index: u128) -> AccountId {
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

        /// get the nth code hash. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_code_hash(index: u128) -> [u8; 32] {
            get_account_bytes(CODE_HASH_PREFIX, index)
        }

        /// get the nth user account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_user_account(index: u128) -> AccountId {
            get_account(USER_ACCOUNT_PREFIX, index)
        }

        /// get the nth contract account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_contract_account(index: u128) -> AccountId {
            let account = get_account(CONTRACT_ACCOUNT_PREFIX, index);
            set_contract(account); // mark the account as a contract
            account
        }

        /// get the nth admin account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_admin_account(index: u128) -> AccountId {
            get_account(ADMIN_ACCOUNT_PREFIX, index)
        }

        fn get_forward_account(index: u128) -> AccountId {
            get_account(FORWARD_ADDRESS_PREFIX, index)
        }

        /// get the nth contract. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_contract(index: u128) -> Proxy {
            let account = get_account(CONTRACT_ACCOUNT_PREFIX, index); // the account for the contract
                                                                       // make sure the contract gets allocated the above account
            set_callee(account);
            // give the contract account some funds
            set_account_balance(account, 1);
            // set the caller to the first admin
            set_caller(get_admin_account(0));
            // now construct the contract instance
            let mut contract = Proxy::new_unguarded(get_admin_account(index));
            // set the caller back to the unused acc
            set_caller(get_unused_account());
            // check the contract was created with the correct account
            assert_eq!(contract.env().account_id(), account);
            contract
        }

        #[ink::test]
        fn test_ctor_guard_pass() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            // only able to instantiate from the alice account
            set_caller(default_accounts().alice);
            let contract = Proxy::new(get_contract_account(0));
            // should construct successfully
        }

        #[ink::test]
        #[should_panic]
        fn test_ctor_guard_fail() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            // only able to instantiate from the alice account
            set_caller(default_accounts().bob);
            let contract = Proxy::new(get_contract_account(0));
            // should fail to construct and panic
        }

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

            // same for contracts
            for i in 0..10 {
                let contract = get_contract(i);
                // check the account has funds. Will panic if not as no existential deposit == account not found
                get_account_balance(contract.env().account_id()).unwrap();
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

        /// Are the unit test contracts unique, i.e. make sure there's no collisions in contract accounts as two contracts with the same account could work around funding tests as utilising the same account
        #[ink::test]
        fn test_contracts_unique() {
            let mut set: std::collections::HashSet<[u8; 32]> = std::collections::HashSet::new();

            // for the first 10 contracts
            for i in 0..9 {
                let contract = get_contract(i);
                let account = contract.env().account_id();
                assert!(
                    set.insert(*AsRef::<[u8; 32]>::as_ref(&account)),
                    "Duplicate account ID found: {:?}",
                    account
                );
            }
        }

        #[ink::test]
        fn test_proxy_set_admin() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            let old_admin = contract.admin;
            let new_admin = get_admin_account(1);
            assert_ne!(old_admin, new_admin);

            set_caller(old_admin);
            contract.proxy_set_admin(new_admin).unwrap();
        }

        #[ink::test]
        fn test_proxy_set_admin_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            let old_admin = contract.admin;
            let new_admin = get_admin_account(1);
            assert_ne!(old_admin, new_admin);

            // can only call proxy_set_admin from the current admin account (old admin)
            set_caller(new_admin);
            contract.proxy_set_admin(new_admin).unwrap_err();
        }

        #[ink::test]
        fn test_ctor_caller_admin() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            // check the caller is admin
            assert_eq!(contract.admin, get_admin_account(0));
        }

        #[ink::test]
        fn test_proxy_terminate() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            set_caller(get_admin_account(0)); // an account which does have permission to call proxy_terminate

            let contract_account = contract.env().account_id();
            let bal = get_account_balance(contract_account).unwrap();
            let admin = get_admin_account(0);
            let should_proxy_terminate = move || contract.proxy_terminate().unwrap();
            ink::env::test::assert_contract_termination::<ink::env::DefaultEnvironment, _>(
                should_proxy_terminate,
                get_admin_account(0),
                bal,
            );
        }

        #[ink::test]
        fn test_proxy_terminate_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            set_caller(get_user_account(0)); // an account which does not have permission to call proxy_terminate

            assert_eq!(
                contract.proxy_terminate().unwrap_err(),
                Error::NotAuthorised
            );
        }

        #[ink::test]
        fn test_proxy_withdraw() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            // give the contract funds
            set_account_balance(contract.env().account_id(), 10000000000);
            set_caller(get_admin_account(0)); // use the admin acc
            let admin_bal: u128 = get_account_balance(get_admin_account(0)).unwrap();
            let contract_bal: u128 = get_account_balance(contract.env().account_id()).unwrap();
            let proxy_withdraw_amount: u128 = 1;
            contract.proxy_withdraw(proxy_withdraw_amount).unwrap();
            assert_eq!(
                get_account_balance(get_admin_account(0)).unwrap(),
                admin_bal + proxy_withdraw_amount
            );
            assert_eq!(
                get_account_balance(contract.env().account_id()).unwrap(),
                contract_bal - proxy_withdraw_amount
            );
        }

        #[ink::test]
        #[should_panic]
        fn test_proxy_withdraw_insufficient_funds() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            set_caller(get_admin_account(0)); // use the admin acc
            let admin_bal = get_account_balance(get_admin_account(0)).unwrap();
            let contract_bal = get_account_balance(contract.env().account_id()).unwrap();
            contract.proxy_withdraw(contract_bal + 1); // panics as bal would go below existential deposit
        }

        #[ink::test]
        fn test_proxy_withdraw_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            // give the contract funds
            set_caller(get_user_account(1)); // use the admin acc
            assert_eq!(contract.proxy_withdraw(1), Err(Error::NotAuthorised));
        }

        #[ink::test]
        fn test_proxy_set_destination() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            let old_dest = contract.destination;
            let new_dest = get_contract_account(1);
            assert_ne!(old_dest, new_dest);

            set_caller(get_admin_account(0)); // use the admin acc
            contract.proxy_set_destination(new_dest).unwrap();
            assert_eq!(contract.destination, new_dest);
        }

        #[ink::test]
        fn test_proxy_set_destination_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            set_caller(get_user_account(1)); // use the admin acc
            assert_eq!(
                contract.proxy_set_destination(get_contract_account(1)),
                Err(Error::NotAuthorised)
            );
        }

        #[ink::test]
        fn test_proxy_set_destination_not_contract() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            set_caller(get_admin_account(0)); // use the admin acc
            assert_eq!(
                // set dest to an account which is not a contract
                contract.proxy_set_destination(get_admin_account(1)),
                Err(Error::InvalidDestination)
            );
        }

        // #[ink::test]
        // fn test_proxy_set_code_hash() {

        //     // always set the caller to the unused account to start, avoid any mistakes with caller checks
        //     set_caller(get_unused_account());

        //     let mut contract = get_contract(0);

        //     let new_code_hash = get_code_hash(1);
        //     let old_code_hash = contract.env().own_code_hash().unwrap();
        //     assert_ne!(Hash::from(new_code_hash), old_code_hash);

        //     set_caller(get_admin_account(0)); // an account which does have permission to call set code hash

        //     assert_eq!(contract.proxy_set_code_hash(new_code_hash), Ok(()));

        //     assert_eq!(contract.env().own_code_hash().unwrap(), Hash::from(new_code_hash));
        // }

        #[ink::test]
        fn test_proxy_set_code_hash_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            set_caller(get_user_account(0)); // an account which does not have permission to call set code hash

            let new_code_hash = get_code_hash(1);
            assert_eq!(
                contract.proxy_set_code_hash(new_code_hash),
                Err(Error::NotAuthorised)
            );
        }
    }
}
