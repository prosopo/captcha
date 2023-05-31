#![cfg_attr(not(feature = "std"), no_std)]

#[ink::contract]
pub mod proxy {

    use common::err;
    #[allow(unused_imports)]
    use ink::env::debug_println as debug;
    #[allow(unused_imports)]
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
            let instantiator = AccountId::from([
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ]); // alice
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

        /// Set the destination to forward to for this contract
        #[ink(message)]
        pub fn proxy_set_destination(&mut self, destination: AccountId) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return err!(self, Error::NotAuthorised);
            }

            if !self.env().is_contract(&destination) {
                return err!(self, Error::InvalidDestination);
            }

            self.destination = destination;
            Ok(())
        }

        /// Set the admin for this contract
        #[ink(message)]
        pub fn proxy_set_admin(&mut self, new_admin: AccountId) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return err!(self, Error::NotAuthorised);
            }

            self.admin = new_admin;
            Ok(())
        }

        #[ink(message)]
        pub fn proxy_withdraw(&mut self, amount: Balance) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return err!(self, Error::NotAuthorised);
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
                return err!(self, Error::NotAuthorised);
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
                return err!(self, Error::NotAuthorised);
            }

            match ink::env::set_code_hash(&code_hash) {
                Ok(()) => Ok(()),
                Err(_) => err!(self, Error::SetCodeHashFailed),
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
        use common_dev::common_dev::tests::*;
        use ink;
        use ink::codegen::Env;
        use ink::env::hash::Blake2x256;
        use ink::env::hash::CryptoHash;
        use ink::env::hash::HashOutput;

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        /// get the nth contract. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_contract_unguarded(index: u128) -> Proxy {
            get_contract(index, |index| {
                Proxy::new_unguarded(get_contract_account(index))
            })
        }

        #[ink::test]
        fn test_ctor_guard_pass() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            // only able to instantiate from the alice account
            set_caller(AccountId::from([
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ]));
            let contract = Proxy::new(get_contract_account(0));
            // should construct successfully
        }

        #[ink::test]
        #[should_panic]
        fn test_ctor_guard_fail() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            // only able to instantiate from the alice account
            set_caller(default_accounts().bob);
            let contract = Proxy::new(get_contract_account(0));
            // should fail to construct and panic
        }

        #[ink::test]
        fn test_proxy_set_admin() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));
            let old_admin = contract.admin;
            let new_admin = get_admin_account(1);
            assert_ne!(old_admin, new_admin);

            set_caller(old_admin);
            contract.proxy_set_admin(new_admin).unwrap();
        }

        #[ink::test]
        fn test_proxy_set_admin_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));
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
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            // check the caller is admin
            assert_eq!(contract.admin, get_admin_account(0));
        }

        #[ink::test]
        fn test_proxy_terminate() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));
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
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));
            set_caller(get_user_account(0)); // an account which does not have permission to call proxy_terminate

            assert_eq!(
                contract.proxy_terminate().unwrap_err(),
                Error::NotAuthorised
            );
        }

        #[ink::test]
        fn test_proxy_withdraw() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

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
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            set_caller(get_admin_account(0)); // use the admin acc
            let admin_bal = get_account_balance(get_admin_account(0)).unwrap();
            let contract_bal = get_account_balance(contract.env().account_id()).unwrap();
            contract.proxy_withdraw(contract_bal + 1); // panics as bal would go below existential deposit
        }

        #[ink::test]
        fn test_proxy_withdraw_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            // give the contract funds
            set_caller(get_user_account(1)); // use the admin acc
            assert_eq!(contract.proxy_withdraw(1), Err(Error::NotAuthorised));
        }

        #[ink::test]
        fn test_proxy_set_destination() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

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
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            set_caller(get_user_account(1)); // use the admin acc
            assert_eq!(
                contract.proxy_set_destination(get_contract_account(1)),
                Err(Error::NotAuthorised)
            );
        }

        #[ink::test]
        fn test_proxy_set_destination_not_contract() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

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
        //     reset_caller();
        //     reset_callee();

        //     let mut contract = get_contract_unguarded(0);
        //     set_callee(get_contract_account(0));

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
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            set_caller(get_user_account(0)); // an account which does not have permission to call set code hash

            let new_code_hash = get_code_hash(1);
            assert_eq!(
                contract.proxy_set_code_hash(new_code_hash),
                Err(Error::NotAuthorised)
            );
        }
    }
}
