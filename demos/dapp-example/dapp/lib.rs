#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
pub mod dapp {
    use prosopo::ProsopoRef as Prosopo;
    use ink_storage::Vec as Vec;

    #[ink(storage)]
    pub struct Dapp {
        prosopo_instance: Prosopo,
        accounts: Vec<AccountId>,
    }

    impl Dapp {
        /// Get existing `Prosopo` contract at `address`
        #[ink(constructor)]
        pub fn new(address: AccountId) -> Self {
            let prosopo_instance: Prosopo = ink_env::call::FromAccountId::from_account_id(address);
            let mut known_accounts = Vec::new();
            known_accounts.push(AccountId::from([0x1; 32]));
            Self {
                prosopo_instance,
                accounts: known_accounts,
            }
        }

        /// Calls the `Prosopo` contract to check if an AccountId has correctly answered captcha
        #[ink(message)]
        pub fn is_human(&mut self, accountid: AccountId, threshold: u8) -> bool {
            self.prosopo_instance.dapp_operator_is_human_user(accountid, threshold).unwrap()
        }
    }
}
