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

use ink::primitives::*;
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

pub struct Account {
    pair: sr25519::Pair,
    seed: String,
    role: String,
}

impl Account {
    /// Create the nth account with the given role
    /// The role is embedded in the seed to ensure the same nth account is unique for each role. E.g. the 1st account with role1 is different to the 1st account with role2, etc.
    pub fn nth_role(n: u128, role: &str) -> Self {
        // use the dev seed to generate a key pair for the nth account
        let mut result = Self::new(
            &[
                DEV_PHRASE.to_string(),
                "//".to_string(),
                role.to_string(),
                n.to_string(),
            ]
            .join(""),
        );
        result.role = role.to_string();
        result
    }

    /// Create an account with the given seed
    pub fn new(seed: &String) -> Self {
        let result = Self {
            pair: sr25519::Pair::from_string(seed, None).expect("Generates key pair"),
            seed: seed.to_string(),
            role: "".to_string(),
        };
        // set the account balance to 0
        result.fund(0);
        result
    }

    /// Create the nth account with no role (role set to "")
    pub fn nth(n: u128) -> Self {
        Self::nth_role(n, "")
    }

    pub fn pair(&self) -> &sr25519::Pair {
        &self.pair
    }

    pub fn account_id(&self) -> AccountId {
        let public = self.pair().public();
        let bytes = public.as_array_ref();
        AccountId::from(*bytes)
    }

    pub fn seed(&self) -> &String {
        &self.seed
    }

    pub fn balance(&self) -> u128 {
        TestHelper::get_account_balance(self.account_id()).unwrap()
    }

    pub fn fund(&self, value: u128) {
        TestHelper::set_account_balance(self.account_id(), value);
    }

    pub fn role(&self) -> &String {
        &self.role
    }
}

pub mod tests {
    use super::*;

    #[ink::test]
    fn test_nth_account_unique_with_roles() {
        let mut account_ids: Vec<AccountId> = Vec::new();
        let mut seeds: Vec<String> = Vec::new();
        for role in ["", "role1", "role2"].iter() {
            for i in 0..10 {
                let account = Account::nth_role(i, role);
                let account_id = account.account_id();
                let seed = account.seed().clone();
                assert!(!account_ids.contains(&account_id));
                assert!(!seeds.contains(&seed));
                account_ids.push(account_id);
                seeds.push(seed);
                assert_eq!(account.role(), role);
            }
        }
    }

    #[ink::test]
    fn test_account_balance_zero_on_creation() {
        let account = Account::nth(0);
        assert_eq!(account.balance(), 0);
    }
}
