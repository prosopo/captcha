// Copyright 2021-2023 Prosopo (UK) Ltd.
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

use ink::prelude::string::ToString;
use ink::primitives::*;
use scale::alloc::string::String;
use sp_core::crypto::Pair;
use sp_core::crypto::DEV_PHRASE;
use sp_core::sr25519;

pub struct TestHelper();

impl TestHelper {
    pub fn new() -> Self {
        Self {}
    }

    pub fn set_caller(account: AccountId) {
        ink::env::test::set_caller::<ink::env::DefaultEnvironment>(account)
    }

    pub fn set_callee(account: AccountId) {
        ink::env::test::set_callee::<ink::env::DefaultEnvironment>(account)
    }

    pub fn advance_block() {
        ink::env::test::advance_block::<ink::env::DefaultEnvironment>()
    }

    pub fn assert_contract_termination<F: FnMut() -> () + core::panic::UnwindSafe>(
        should_terminate: F,
        expected_beneficiary: AccountId,
        expected_transfer_to_beneficiary: u128,
    ) {
        ink::env::test::assert_contract_termination::<ink::env::DefaultEnvironment, _>(
            should_terminate,
            expected_beneficiary,
            expected_transfer_to_beneficiary,
        )
    }

    pub fn set_account_balance(account: AccountId, balance: u128) {
        ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(account, balance)
    }

    pub fn get_account_balance(account: AccountId) -> Result<u128, ink::env::Error> {
        ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>(account)
    }

    pub fn callee() -> AccountId {
        ink::env::test::callee::<ink::env::DefaultEnvironment>()
    }

    pub fn count_used_storage_cells(account: &AccountId) -> Result<usize, ink::env::Error> {
        ink::env::test::count_used_storage_cells::<ink::env::DefaultEnvironment>(account)
    }

    pub fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
        ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
    }

    pub fn set_contract(account: AccountId) {
        ink::env::test::set_contract::<ink::env::DefaultEnvironment>(account)
    }

    pub fn set_block_timestamp(timestamp: u64) {
        ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(timestamp)
    }

    pub fn set_value_transferred(value: u128) {
        ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(value)
    }

    pub fn transfer_in(&self, value: u128) {
        ink::env::test::transfer_in::<ink::env::DefaultEnvironment>(value)
    }

    pub fn get_contract_storage_rw(account: &AccountId) -> (usize, usize) {
        ink::env::test::get_contract_storage_rw::<ink::env::DefaultEnvironment>(account)
    }

    pub fn is_contract(account: AccountId) -> bool {
        ink::env::test::is_contract::<ink::env::DefaultEnvironment>(account)
    }
}
