use crate::test_utils::*;
use crate::Account;
use ink::prelude::string::ToString;
use ink::primitives::*;
use sp_core::crypto::DEV_PHRASE;
use sp_core::Pair;

pub fn get_unused_account() -> AccountId {
    Account::nth_role(0, "unused").account_id()
}

pub fn nth_admin_account(index: u128) -> Account {
    Account::nth_role(index, "admin")
}

pub fn nth_provider_account(index: u128) -> Account {
    Account::nth_role(index, "provider")
}

pub fn nth_dapp_owner_account(index: u128) -> Account {
    Account::nth_role(index, "dapp_owner")
}

pub fn nth_dapp_contract_account(index: u128) -> Account {
    Account::nth_role(index, "dapp_contract")
}

pub fn nth_user_account(index: u128) -> Account {
    Account::nth_role(index, "user")
}

pub fn nth_contract_account(index: u128) -> Account {
    let account = Account::nth_role(index, "contract");
    // mark the account as a contract
    set_contract(account.account_id());
    assert!(is_contract(account.account_id()));
    account
}

pub fn nth_code_hash(index: u128) -> [u8; 32] {
    Account::nth_role(index, "code_hash").pair().public().0
}

pub fn alice() -> Account {
    Account::new(
        &[
            DEV_PHRASE.to_string(),
            "//".to_string(),
            "Alice".to_string(),
        ]
        .join(""),
    )
}

pub fn bob() -> Account {
    Account::new(&[DEV_PHRASE.to_string(), "//".to_string(), "Bob".to_string()].join(""))
}

pub fn charlie() -> Account {
    Account::new(
        &[
            DEV_PHRASE.to_string(),
            "//".to_string(),
            "Charlie".to_string(),
        ]
        .join(""),
    )
}

pub fn dave() -> Account {
    Account::new(&[DEV_PHRASE.to_string(), "//".to_string(), "Dave".to_string()].join(""))
}

pub fn eve() -> Account {
    Account::new(&[DEV_PHRASE.to_string(), "//".to_string(), "Eve".to_string()].join(""))
}

pub fn ferdie() -> Account {
    Account::new(
        &[
            DEV_PHRASE.to_string(),
            "//".to_string(),
            "Ferdie".to_string(),
        ]
        .join(""),
    )
}
