use ink::codegen::Env;
use ink::env::ContractEnv;
use ink::env::ContractReference;
use ink::env::DefaultEnvironment;

use crate::account_utils::*;
use crate::*;

// pub fn pass_contract<'a, T>(contract: &mut T) -> u8
// where
//     T: ContractReference + Env<EnvAccess = dyn ContractEnv<Env = DefaultEnvironment>>,
//     // + Env<EnvAccess = ink::EnvAccess<'a, <T as ContractEnv>::Env>>,
//     // <T as ContractEnv>::Env: 'a, // ,
//     // <<T as ContractEnv>::Env as ink::env::Environment>::AccountId: std::fmt::Debug,
// {
//     ink::env::debug_println!("pass_contract");
//     let env = contract.env();
//     let caller = env.caller();
//     ink::env::debug_println!("caller: {:?}", caller);
//     // get the first byte from caller
//     // let caller_bytes = caller.as_ref();
//     // let caller_byte = caller_bytes[0];
//     // caller_byte
//     3
// }

// pub fn pass_contract2() -> u8 {
//     ink::env::debug_println!("pass_contract2");
//     3
// }

pub fn get_contract<
    Contract: ContractReference,
    // TODO use ctor returnt ype
>(
    index: u128,
    ctor: fn() -> Contract,
) -> Contract {
    let account = get_contract_account(index);
    set_callee(account.account_id());
    // set the caller to the first admin
    set_caller(get_admin_account(0).account_id());
    // now construct the contract instance
    let mut contract = ctor();
    // set the caller back to the unused acc
    set_caller(get_unused_account());
    // check the contract was created with the correct account
    // TODO get below to work
    // assert_eq!(contract.env().account_id(), account.account_id());
    contract
}
