#![cfg_attr(not(feature = "std"), no_std)]
#![feature(min_specialization)]

#[brush::contract]
pub mod demo_nft_contract {
    use base64;
    use serde::Serialize;
    use serde_json_core as serde_json;

    use brush::contracts::psp34::extensions::enumerable::*;
    use brush::contracts::psp34::extensions::metadata::*;

    use ink_prelude::{string::String, vec::Vec};
    use ink_storage::traits::SpreadAllocate;
    use ink_prelude::format;

    use prosopo::ProsopoRef;

    #[derive(
        Default, SpreadAllocate, PSP34Storage, PSP34MetadataStorage, PSP34EnumerableStorage,
    )]
    #[ink(storage)]
    pub struct DemoNFT {
        #[PSP34StorageField]
        psp34: PSP34Data,
        next_id: u8,
        #[PSP34MetadataStorageField]
        metadata: PSP34MetadataData,
        #[PSP34EnumerableStorageField]
        enumdata: PSP34EnumerableData,
        // / The address of the prosopo bot protection contract
        prosopo_account: AccountId,
    }

    #[derive(scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct NFT {
        id: Id,
        owner: AccountId,
        token_uri: String,
    }

    #[derive(Serialize)]
    pub struct Metadata {
        name: String,
        description: String,
        image: String
    }

    impl PSP34 for DemoNFT {}

    impl PSP34Metadata for DemoNFT {}
    impl PSP34Enumerable for DemoNFT {}

    impl DemoNFT {
        #[ink(constructor)]
        pub fn new(prosopo_account: AccountId) -> Self {
            ink_lang::codegen::initialize_contract(|instance: &mut Self| {
                instance.prosopo_account = prosopo_account;
            })
        }

        #[ink(message)]
        pub fn mint(&mut self, name: String, description: String, image: String) -> Result<Id, PSP34Error> {
            let id = Id::U8(self.next_id);
            self._mint_to(Self::env().caller(), id.clone())?;
            self.next_id += 1;
            let metadata = Metadata {
                name,
                description,
                image,
            };
            let stringified = serde_json::to_string::<Metadata, 128>(&metadata).unwrap();
            let encoded = base64::encode(stringified);

            let token_uri = format!("data:application/json;base64,{}", encoded);
            self._set_attribute(
                id.clone(),
                String::from("token_uri").into_bytes(),
                token_uri.into_bytes()
            );

            Ok(id)
        }

        #[ink(message)]
        pub fn token_uri(&self, token: Id) -> String {
            let token_uri_key = String::from("token_uri").into_bytes();
            let token_uri_attribute = self.get_attribute(token, token_uri_key).unwrap();
            String::from_utf8(token_uri_attribute).unwrap()
        }

        // // // // // // // // // // // // // nonstandard nft smart contract functionalities // // // // // // // // // // // // //
        fn get_token_by_index(
            &self,
            owner: &Option<AccountId>,
            index: &u128,
        ) -> Result<Id, PSP34Error> {
            self.enumdata.enumerable.get_by_index(owner, index)
        }

        /// Calls the `Prosopo` contract to check if `user` is human
        #[ink(message)]
        pub fn is_human(&self, user: AccountId, threshold: u8, recency: u32) -> bool {
            let prosopo_instance: ProsopoRef =
                ink_env::call::FromAccountId::from_account_id(self.prosopo_account);
            prosopo_instance
                .dapp_operator_is_human_user(user, threshold)
                .unwrap();
            // check that the captcha was completed within the last X seconds
            let last_correct_captcha = prosopo_instance
                .dapp_operator_last_correct_captcha(user)
                .unwrap();
            return last_correct_captcha.before_ms <= recency
                && prosopo_instance
                    .dapp_operator_is_human_user(user, threshold)
                    .unwrap();
        }

        /// Fetches newest tokens
        #[ink(message)]
        pub fn get_tokens(
            &self,
            page_size: u128,
            page_index: u128,
            owner: Option<AccountId>,
        ) -> Result<Vec<NFT>, String> {
            if page_size == 0 {
                return Err(String::from("Invalid page size! Must be 1 or greater."));
            }

            let mut tokens = Vec::new();

            let offset = page_size * page_index;
            let balance: u128 = if owner.is_some() {
                self.balance_of(owner.unwrap()).into()
            } else {
                self.total_supply()
            };

            if balance <= offset {
                return Ok(tokens);
            }

            let mut i = balance - offset - 1;
            let end = if balance > offset + page_size {
                balance - offset - page_size
            } else {
                0
            };

            while let Ok(token) = self.get_token_by_index(&owner, &i) {
                let id = token.clone();
                let owner = if owner.is_some() {
                    owner.unwrap()
                } else {
                    self._owner_of(&token.clone()).unwrap()
                };

                let token_uri = self.token_uri(token.clone()); 

                tokens.push(NFT {
                    id,
                    owner,
                    token_uri,
                });

                if i == 0 {
                    break;
                }
                i -= 1;
                if i < end {
                    break;
                }
            }

            Ok(tokens)
        }
    }

    #[cfg(test)]
    mod tests {
        use core::cmp::Ordering;
        use ink_lang as ink;

        use super::*;

        #[ink::test]
        fn test_new_works() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = DemoNFT::new(operator_account);
            assert_eq!(
                contract.prosopo_account.cmp(&operator_account),
                Ordering::Equal
            );
        }

        #[ink::test]
        fn test_fetching_works() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = DemoNFT::new(operator_account);

            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(operator_account);

            let token1 = contract.mint(String::from("name1"), String::from("desc1"), String::from("image1")).unwrap();
            let _token2 = contract.mint(String::from("name2"), String::from("desc2"), String::from("image2")).unwrap();
            let token3 = contract.mint(String::from("name3"), String::from("desc3"), String::from("image3")).unwrap();

            let new_account = AccountId::from([0x2; 32]);

            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(new_account);

            let _token4 = contract.mint(String::from("name4"), String::from("desc4"), String::from("image4")).unwrap();
            let token5 = contract.mint(String::from("name5"), String::from("desc5"), String::from("image5")).unwrap();

            let mut tokens = contract.get_tokens(10, 0, None);
            let mut tokens_unwrapped: Vec<NFT> = tokens.ok().unwrap();
            assert!(tokens_unwrapped.len() == 5);
            assert!(tokens_unwrapped[0].token_uri == "data:application/json;base64,eyJuYW1lIjoibmFtZTUiLCJkZXNjcmlwdGlvbiI6ImRlc2M1IiwiaW1hZ2UiOiJpbWFnZTUifQ==");
            assert!(tokens_unwrapped[0].id == token5);

            tokens = contract.get_tokens(10, 0, Some(operator_account));
            tokens_unwrapped = tokens.ok().unwrap();
            assert!(tokens_unwrapped.len() == 3);
            assert!(tokens_unwrapped[0].token_uri == "data:application/json;base64,eyJuYW1lIjoibmFtZTMiLCJkZXNjcmlwdGlvbiI6ImRlc2MzIiwiaW1hZ2UiOiJpbWFnZTMifQ==");
            assert!(tokens_unwrapped[0].id == token3);

            tokens = contract.get_tokens(10, 1, None);
            tokens_unwrapped = tokens.ok().unwrap();
            assert!(tokens_unwrapped.len() == 0);

            tokens = contract.get_tokens(2, 0, None);
            tokens_unwrapped = tokens.ok().unwrap();
            assert!(tokens_unwrapped.len() == 2);
            assert!(tokens_unwrapped[0].token_uri == "data:application/json;base64,eyJuYW1lIjoibmFtZTUiLCJkZXNjcmlwdGlvbiI6ImRlc2M1IiwiaW1hZ2UiOiJpbWFnZTUifQ==");
            assert!(tokens_unwrapped[0].id == token5);

            tokens = contract.get_tokens(2, 1, None);
            tokens_unwrapped = tokens.ok().unwrap();
            assert!(tokens_unwrapped.len() == 2);
            assert!(tokens_unwrapped[0].token_uri == "data:application/json;base64,eyJuYW1lIjoibmFtZTMiLCJkZXNjcmlwdGlvbiI6ImRlc2MzIiwiaW1hZ2UiOiJpbWFnZTMifQ==");
            assert!(tokens_unwrapped[0].id == token3);

            tokens = contract.get_tokens(2, 2, None);
            tokens_unwrapped = tokens.ok().unwrap();
            assert!(tokens_unwrapped.len() == 1);
            assert!(tokens_unwrapped[0].token_uri == "data:application/json;base64,eyJuYW1lIjoibmFtZTEiLCJkZXNjcmlwdGlvbiI6ImRlc2MxIiwiaW1hZ2UiOiJpbWFnZTEifQ==");
            assert!(tokens_unwrapped[0].id == token1);
        }
    }
}
