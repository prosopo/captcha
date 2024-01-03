use ink::codegen::Env;
use ink::env::ContractEnv;
use ink::env::ContractReference;
use ink::env::DefaultEnvironment;
use ink::EnvAccess;

use crate::account_utils::*;
use crate::*;
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
    ctor: fn() -> Contract,
) -> Contract {
    set_callee(author);
    // set the caller to the first admin
    set_caller(get_admin_account(0).account_id());
    // now construct the contract instance
    let mut contract = ctor();
    // set the caller back to the unused acc
    set_caller(get_unused_account());
    // check the contract was created with the correct account
    assert_eq!(ink::env::account_id::<Contract::Env>(), author,);
    contract
}

pub fn nth_contract<Contract: ContractReference + ContractEnv<Env = DefaultEnvironment>>(
    index: u128,
    ctor: fn() -> Contract,
) -> Contract {
    let account = get_contract_account(index);
    set_callee(account.account_id());
    create_contract(account.account_id(), ctor)
}
