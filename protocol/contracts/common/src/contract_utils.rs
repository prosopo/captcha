use ink::codegen::Env;
use ink::env::ContractEnv;
use ink::env::ContractReference;
use ink::env::DefaultEnvironment;
use ink::EnvAccess;

use crate::account_utils::*;
use crate::test_utils::*;
use ink::primitives::*;

// // Example of how to pass a contract around
// pub fn pass_contract3<T>(contract: &T) -> u8
// where
//     T: ContractReference + ContractEnv<Env = DefaultEnvironment>,
// {
//     ink::env::debug_println!("caller abc: {:?}", ink::env::caller::<T::Env>());
//     3
// }

pub fn create_contract<Contract: ContractReference + ContractEnv<Env = DefaultEnvironment>>(
    author: AccountId,
    contract_account: AccountId,
    ctor: fn() -> Contract,
) -> Contract {
    // mark the account as a contract
    set_contract(contract_account);
    // set the contract account address
    set_callee(contract_account);
    // set the caller to the author of the contract
    set_caller(author);
    // now construct the contract instance
    let mut contract = ctor();
    // set the caller back to the unused acc
    set_caller(get_unused_account());
    // check the contract was created with the correct account
    assert_eq!(ink::env::account_id::<Contract::Env>(), contract_account);
    contract
}

pub fn nth_contract<Contract: ContractReference + ContractEnv<Env = DefaultEnvironment>>(
    index: u128,
    ctor: fn() -> Contract,
) -> Contract {
    let contract_account = get_contract_account(index);
    let author = get_admin_account(index);
    create_contract(author.account_id(), contract_account.account_id(), ctor)
}
