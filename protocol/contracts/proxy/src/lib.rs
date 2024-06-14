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

//pub use self::proxy::{Proxy, ProxyRef};

#[ink::contract]
pub mod proxy {

    use common::common::check_is_admin;
    use common::common::config::*;
    use common::common::Error;
    use common::err;
    #[allow(unused_imports)]
    use ink::env::debug_println as debug;
    use ink::env::CallFlags;
    #[allow(unused_imports)] // do not remove StorageLayout, it is used in derives
    use ink::storage::traits::StorageLayout;
    use scale::Encode;

    #[ink(storage)]
    #[derive(Default)]
    pub struct Proxy {}

    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ProxyMessages {
        GetGitCommitId,
        GetAdmin,
        GetDestination,
        ProxyWithdraw(Amount),
        ProxyTerminate,
        ProxySetCodeHash(Hash),
    }

    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ProxyReturnTypes {
        U8x32([u8; 32]),
        U8x20([u8; 20]),
        AccountId(AccountId),
        Void,
    }

    pub type Amount = Balance;

    impl Proxy {
        #[ink(constructor)]
        pub fn new() -> Result<Self, Error> {
            let result = Self::new_unguarded();
            let author = get_admin();
            let caller = Self::env().caller();
            if caller != author {
                return Err(Error::NotAuthor);
            }
            Ok(result)
        }

        #[ink(constructor)]
        pub fn new_panic() -> Self {
            let result = Self::new();
            if let Err(e) = result {
                panic!("{:?}", e);
            }
            result.unwrap()
        }

        fn new_unguarded() -> Self {
            Self {}
        }

        fn get_destination(&self) -> AccountId {
            // the destination contract to forward to, set to 0 by default
            AccountId::from([
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0,
            ])
        }

        fn withdraw(&mut self, amount: Balance) -> Result<ProxyReturnTypes, Error> {
            let caller = self.env().caller();
            check_is_admin(caller)?;

            match self.env().transfer(caller, amount) {
                Ok(()) => Ok(ProxyReturnTypes::Void),
                Err(_) => Err(Error::TransferFailed),
            }
        }

        fn terminate(&mut self) -> Result<ProxyReturnTypes, Error> {
            let caller = self.env().caller();
            check_is_admin(caller)?;
            self.env().terminate_contract(caller);
            // unreachable
        }

        /// Modifies the code which is used to execute calls to this contract address (`AccountId`).
        /// We use this to upgrade the contract logic. The caller must be an operator.
        /// `true` is returned on successful upgrade, `false` otherwise
        /// Errors are returned if the caller is not an admin, if the code hash is the callers
        /// account_id, if the code is not found, and for any other unknown ink errors
        fn set_code_hash(&mut self, code_hash: Hash) -> Result<(), Error> {
            let caller = self.env().caller();
            check_is_admin(caller)?;

            self.env()
                .set_code_hash(&code_hash)
                .or_else(|_| err!(self, Error::SetCodeHashFailed))
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
        pub fn forward(&self) -> u32 {
            let mut flags = CallFlags::empty();
            flags.insert(CallFlags::FORWARD_INPUT);
            flags.insert(CallFlags::TAIL_CALL);
            ink::env::call::build_call::<ink::env::DefaultEnvironment>()
                .call(self.get_destination())
                .transferred_value(self.env().transferred_value())
                .call_flags(flags)
                .try_invoke()
                .unwrap_or_else(|env_err| {
                    panic!(
                        "cross-contract call to {:?} failed due to {:?}",
                        self.get_destination(),
                        env_err
                    )
                })
                .unwrap_or_else(|lang_err| {
                    panic!(
                        "cross-contract call to {:?} failed due to {:?}",
                        self.get_destination(),
                        lang_err
                    )
                });
            unreachable!("the forwarded call will never return since `tail_call` was set");
        }

        /// One other message allowed to handle messages.
        /// Fails to compile unless `IIP2_WILDCARD_COMPLEMENT_SELECTOR` is used.
        #[ink(message, selector = 0x9BAE9D5E)]
        pub fn handler(&mut self, msg: ProxyMessages) -> Result<ProxyReturnTypes, Error> {
            match msg {
                ProxyMessages::GetGitCommitId => Ok(ProxyReturnTypes::U8x20(get_git_commit_id())),
                ProxyMessages::GetAdmin => Ok(ProxyReturnTypes::AccountId(get_admin())),
                ProxyMessages::GetDestination => {
                    Ok(ProxyReturnTypes::AccountId(self.get_destination()))
                }
                ProxyMessages::ProxyWithdraw(amount) => {
                    self.withdraw(amount).map(|_| ProxyReturnTypes::Void)
                }
                ProxyMessages::ProxyTerminate => self.terminate().map(|_| ProxyReturnTypes::Void),
                ProxyMessages::ProxySetCodeHash(code_hash) => self
                    .set_code_hash(code_hash)
                    .map(|_| ProxyReturnTypes::Void),
            }
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
        use common::common::tests::*;
        use ink;
        use ink::codegen::Env;
        use ink::env::hash::Blake2x256;
        use ink::env::hash::CryptoHash;
        use ink::env::hash::HashOutput;

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        const ENV_AUTHOR_BYTES: [u8; 32] = [
            212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133,
            88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
        ]; // the account which can instantiate the contract
           // alice: [ 212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125, ]

        /// get the nth contract. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_contract_unguarded(index: u128) -> Proxy {
            get_contract(index, |index| Proxy::new_unguarded())
        }

        #[ink::test]
        fn test_ctor_guard_pass() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            // only able to instantiate from the alice account
            set_caller(AccountId::from(ENV_AUTHOR_BYTES));
            let contract = Proxy::new();
            // should construct successfully
        }

        #[ink::test]
        fn test_ctor_guard_fail() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            // only able to instantiate from the alice account
            set_caller(default_accounts().bob);
            let contract = Proxy::new();
            assert_eq!(contract.unwrap_err(), Error::NotAuthor);
        }

        #[ink::test]
        fn test_ctor_caller_admin() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            // check the caller is admin
            let admin_result = contract.handler(ProxyMessages::GetAdmin).unwrap();
            if let ProxyReturnTypes::AccountId(admin) = admin_result {
                assert_eq!(admin, AccountId::from(ENV_AUTHOR_BYTES));
            }
        }

        #[ink::test]
        fn test_terminate() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));
            let admin_result = contract.handler(ProxyMessages::GetAdmin).unwrap();
            if let ProxyReturnTypes::AccountId(admin) = admin_result {
                set_caller(admin); // an account which does have permission to call terminate
                debug!("Admin account {:?}", admin);
                assert_eq!(admin, AccountId::from(ENV_AUTHOR_BYTES));
                let contract_account = contract.env().account_id();
                let bal = get_account_balance(contract_account).unwrap();
                debug!("Contract account {:?}", contract_account);
                reset_caller();
                set_caller(admin);
                // a lambda that terminates the contract and return nothing <-- this is important!
                let should_terminate = move || {
                    contract.handler(ProxyMessages::ProxyTerminate);
                };
                // the assert_contract_termination fn takes a lambda which will terminate the contract + a caller + a balance which should be returned
                // it will then check that the contract terminates and returns the correct balance to the caller
                // we have to use this fn because the terminate call stops the code execution in-place, so we can't check the return value of the terminate call
                // this fn works around that
                ink::env::test::assert_contract_termination::<ink::env::DefaultEnvironment, _>(
                    should_terminate,
                    admin,
                    bal,
                );
            } else {
                unreachable!();
            }
        }

        #[ink::test]
        fn test_terminate_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));
            set_caller(get_user_account(0)); // an account which does not have permission to call terminate

            let terminate_result = contract.handler(ProxyMessages::ProxyTerminate);
            assert_eq!(terminate_result.unwrap_err(), Error::NotAuthorised);
        }

        #[ink::test]
        fn test_withdraw() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            // give the contract funds
            set_account_balance(contract.env().account_id(), 10000000000);
            let admin_result = contract.handler(ProxyMessages::GetAdmin).unwrap();
            if let ProxyReturnTypes::AccountId(admin) = admin_result {
                set_caller(admin); // use the admin acc
                set_account_balance(admin, 10000000000); // give the admin some funds so the account exists
                let admin_bal: u128 = get_account_balance(admin).unwrap();
                let contract_bal: u128 = get_account_balance(contract.env().account_id()).unwrap();
                let withdraw_amount: u128 = 1;
                let withdraw_result = contract
                    .handler(ProxyMessages::ProxyWithdraw(withdraw_amount))
                    .unwrap();
                if let ProxyReturnTypes::Void = withdraw_result {
                    assert_eq!(
                        get_account_balance(admin).unwrap(),
                        admin_bal + withdraw_amount
                    );
                    assert_eq!(
                        get_account_balance(contract.env().account_id()).unwrap(),
                        contract_bal - withdraw_amount
                    );
                } else {
                    assert_eq!(true, false);
                }
            } else {
                assert_eq!(true, false);
            }
        }

        #[ink::test]
        #[should_panic]
        fn test_withdraw_insufficient_funds() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));
            let admin_result = contract.handler(ProxyMessages::GetAdmin).unwrap();
            if let ProxyReturnTypes::AccountId(admin) = admin_result {
                set_caller(admin); // use the admin acc
                let admin_bal = get_account_balance(admin).unwrap();
                let contract_bal = get_account_balance(contract.env().account_id()).unwrap();
                contract.handler(ProxyMessages::ProxyWithdraw(contract_bal + 1));
            // panics as bal would go below existential deposit
            } else {
                assert_eq!(true, false);
            }
        }

        #[ink::test]
        fn test_withdraw_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            // give the contract funds
            set_caller(get_user_account(1)); // use the admin acc
            assert_eq!(
                contract.handler(ProxyMessages::ProxyWithdraw(1)),
                Err(Error::NotAuthorised)
            );
            //assert_eq!(contract.handler(ProxyMessage::ProxyWithdraw(1)), Err(Error::NotAuthorised));
        }

        #[ink::test]
        fn test_set_code_hash() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            let new_code_hash = get_code_hash(1);
            // TODO own_code_hash() and set_code_hash() are not implemented in ink! yet
            // let old_code_hash = contract.env().own_code_hash().unwrap();
            // assert_ne!(Hash::from(new_code_hash), old_code_hash);

            // set_caller(get_admin_account(0)); // an account which does have permission to call set code hash

            // assert_eq!(contract.set_code_hash(new_code_hash), Ok(()));

            // assert_eq!(contract.env().own_code_hash().unwrap(), Hash::from(new_code_hash));
        }

        #[ink::test]
        fn test_set_code_hash_unauthorised() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            reset_caller();
            reset_callee();

            let mut contract = get_contract_unguarded(0);
            set_callee(get_contract_account(0));

            set_caller(get_user_account(0)); // an account which does not have permission to call set code hash

            let new_code_hash = get_code_hash(1);
            assert_eq!(
                contract.handler(ProxyMessages::ProxySetCodeHash(new_code_hash)),
                Err(Error::NotAuthorised)
            );
            // assert_eq!(
            //     contract.handler(new_code_hash),
            //     Err(Error::NotAuthorised)
            // );
        }
    }
}
