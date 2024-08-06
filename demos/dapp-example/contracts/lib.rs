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
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
pub mod dapp {
    use ink_storage::{traits::SpreadAllocate, Mapping};
    use prosopo::ProsopoRef;

    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Dapp {
        /// Total token supply.
        total_supply: Balance,
        /// Mapping from owner to number of owned token.
        balances: Mapping<AccountId, Balance>,
        /// Amount of tokens to drip feed via the faucet function
        faucet_amount: Balance,
        /// Token holder who initially receives all tokens
        token_holder: AccountId,
        /// The percentage of correct captchas that an Account must have answered correctly
        human_threshold: u8,
        /// The time in ms within which a user must have answered a captcha
        recency_threshold: u32,
        /// The address of the prosopo bot protection contract
        prosopo_account: AccountId,
    }

    /// Event emitted when a token transfer occurs.
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        value: Balance,
    }

    /// Error types.
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Returned if not enough balance to fulfill a request is available.
        InsufficientBalance,
        /// Returned if the user has not completed a captcha
        UserNotHuman,
    }

    impl Dapp {
        /// Creates a new contract with the specified initial supply and loads an instance of the
        /// `prosopo` contract
        #[ink(constructor, payable)]
        pub fn new(
            initial_supply: Balance,
            faucet_amount: Balance,
            prosopo_account: AccountId,
            human_threshold: u8,
            recency_threshold: u32,
        ) -> Self {
            ink_lang::codegen::initialize_contract(|contract| {
                Self::new_init(
                    contract,
                    initial_supply,
                    faucet_amount,
                    prosopo_account,
                    human_threshold,
                    recency_threshold,
                )
            })
        }

        /// Default initializes the ERC-20 contract with the specified initial supply.
        fn new_init(
            &mut self,
            initial_supply: Balance,
            faucet_amount: Balance,
            prosopo_account: AccountId,
            human_threshold: u8,
            recency_threshold: u32,
        ) {
            let caller = Self::env().caller();
            self.balances.insert(&caller, &initial_supply);
            self.total_supply = initial_supply;
            self.faucet_amount = faucet_amount;
            self.token_holder = caller;
            self.human_threshold = human_threshold;
            self.recency_threshold = recency_threshold;
            self.prosopo_account = prosopo_account;
            // Events not working due to bug https://github.com/paritytech/ink/issues/1000
            // self.env().emit_event(Transfer {
            //     from: None,
            //     to: Some(caller),
            //     value: initial_supply,
            // });
        }

        /// Faucet function for sending tokens to humans
        #[ink(message)]
        pub fn faucet(&mut self, accountid: AccountId) -> Result<(), Error> {
            let token_holder = self.token_holder;
            if self.is_human(accountid, self.human_threshold, self.recency_threshold) {
                self.transfer_from_to(&token_holder, &accountid, self.faucet_amount);
            } else {
                return Err(Error::UserNotHuman);
            }
            Ok(())
        }

        /// Calls the `Prosopo` contract to check if `accountid` is human
        #[ink(message)]
        pub fn is_human(&self, accountid: AccountId, threshold: u8, recency: u32) -> bool {
            let prosopo_instance: ProsopoRef =
                ink_env::call::FromAccountId::from_account_id(self.prosopo_account);
            prosopo_instance
                .dapp_operator_is_human_user(accountid, threshold)
                .unwrap();
            // check that the captcha was completed within the last X seconds
            let last_correct_captcha = prosopo_instance
                .dapp_operator_last_correct_captcha(accountid)
                .unwrap();
            return last_correct_captcha.before_ms <= recency
                && prosopo_instance
                    .dapp_operator_is_human_user(accountid, threshold)
                    .unwrap();
        }

        /// Transfers `value` amount of tokens from the caller's account to account `to`.
        ///
        /// On success a `Transfer` event is emitted.
        ///
        /// # Errors
        ///
        /// Returns `InsufficientBalance` error if there are not enough tokens on
        /// the caller's account balance.
        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, value: Balance) -> Result<(), Error> {
            let from = self.env().caller();
            self.transfer_from_to(&from, &to, value)
        }

        /// Transfers `value` amount of tokens from the caller's account to account `to`.
        ///
        /// On success a `Transfer` event is emitted.
        ///
        /// # Errors
        ///
        /// Returns `InsufficientBalance` error if there are not enough tokens on
        /// the caller's account balance.
        fn transfer_from_to(
            &mut self,
            from: &AccountId,
            to: &AccountId,
            value: Balance,
        ) -> Result<(), Error> {
            let from_balance = self.balance_of_impl(from);
            if from_balance < value {
                return Err(Error::InsufficientBalance);
            }

            self.balances.insert(from, &(from_balance - value));
            let to_balance = self.balance_of_impl(to);
            self.balances.insert(to, &(to_balance + value));
            // Events not working due to bug https://github.com/paritytech/ink/issues/1000
            // self.env().emit_event(Transfer {
            //     from: Some(*from),
            //     to: Some(*to),
            //     value,
            // });
            Ok(())
        }

        /// Returns the account balance for the specified `owner`.
        ///
        /// Returns `0` if the account is non-existent.
        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> Balance {
            self.balance_of_impl(&owner)
        }

        /// Returns the account balance for the specified `owner`.
        ///
        /// Returns `0` if the account is non-existent.
        ///
        /// # Note
        ///
        /// Prefer to call this method over `balance_of` since this
        /// works using references which are more efficient in Wasm.
        #[inline]
        fn balance_of_impl(&self, owner: &AccountId) -> Balance {
            self.balances.get(owner).unwrap_or_default()
        }
    }
}
