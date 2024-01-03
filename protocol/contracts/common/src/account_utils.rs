use crate::test_utils::*;
use crate::Account;
use ink::primitives::*;
use sp_core::Pair;

pub fn get_unused_account() -> AccountId {
    Account::nth_role(0, "unused").account_id()
}

pub fn get_admin_account(index: u128) -> Account {
    Account::nth_role(index, "admin")
}

pub fn get_provider_account(index: u128) -> Account {
    Account::nth_role(index, "provider")
}

pub fn get_dapp_account(index: u128) -> Account {
    Account::nth_role(index, "dapp")
}

pub fn get_user_account(index: u128) -> Account {
    Account::nth_role(index, "user")
}

pub fn get_contract_account(index: u128) -> Account {
    let account = Account::nth_role(index, "contract");
    // mark the account as a contract
    set_contract(account.account_id());
    assert!(is_contract(account.account_id()));
    account
}

pub fn get_code_hash(index: u128) -> [u8; 32] {
    Account::nth_role(index, "code_hash").pair().public().0
}
