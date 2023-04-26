#![cfg_attr(not(feature = "std"), no_std)]
#![feature(min_specialization)]

mod nfts;

#[brush::contract]
pub mod demo_nft_contract {
    use base64;
    use serde_json_core as serde_json;

    use brush::{
        contracts::{
            ownable::*,
            psp34::extensions::{enumerable::*, metadata::*},
        },
        modifiers,
    };

    use ink_prelude::format;
    use ink_prelude::{string::String, vec::Vec};
    use ink_storage::traits::SpreadAllocate;

    use prosopo::ProsopoRef;

    use crate::nfts::{self, *};

    #[derive(
        Default,
        SpreadAllocate,
        PSP34Storage,
        PSP34MetadataStorage,
        PSP34EnumerableStorage,
        OwnableStorage,
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
        #[OwnableStorageField]
        ownable: OwnableData,
        // / The address of the prosopo bot protection contract
        prosopo_account: AccountId,
    }

    #[derive(scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct NFT {
        id: Id,
        owner: AccountId,
        token_uri: String,
        on_sale: bool,
        price: u128,
    }

    enum Attribute {
        TokenUri,
        OnSale,
        Price,
    }

    impl Attribute {
        pub fn to_key(&self) -> Vec<u8> {
            let key = match self {
                Attribute::TokenUri => "token_uri",
                Attribute::OnSale => "on_sale",
                Attribute::Price => "price",
            };

            String::from(key).into_bytes()
        }
    }

    pub const HUMAN_THRESHOLD: u8 = 50;
    pub const RECENCY: u32 = 5 * 60 * 1000; // 5 mins

    fn bool_to_bytes(value: bool) -> Vec<u8> {
        match value {
            true => Vec::from([1]),
            false => Vec::from([0]),
        }
    }

    fn bytes_to_bool(value: Vec<u8>) -> bool {
        value.last().unwrap().to_be() == 1
    }

    impl PSP34 for DemoNFT {}

    impl PSP34Metadata for DemoNFT {}
    impl PSP34Enumerable for DemoNFT {}
    impl Ownable for DemoNFT {}

    impl DemoNFT {
        #[ink(constructor)]
        pub fn new(prosopo_account: AccountId) -> Self {
            ink_lang::codegen::initialize_contract(|instance: &mut Self| {
                let caller = instance.env().caller();
                instance._init_with_owner(caller);
                instance.prosopo_account = prosopo_account;
                instance.mint_all();
            })
        }

        #[ink(message)]
        #[modifiers(only_owner)]
        pub fn mint_all(&mut self) -> Result<(), PSP34Error> {
            for ele in nfts::Nfts::get_list() {
                self.mint(ele.name, ele.description, ele.image);
            }
            Ok(())
        }

        #[ink(message)]
        #[modifiers(only_owner)]
        pub fn mint(
            &mut self,
            name: String,
            description: String,
            image: String,
        ) -> Result<Id, PSP34Error> {
            let id = Id::U8(self.next_id);
            self._mint_to(self.env().caller(), id.clone())?;
            self.next_id += 1;
            let metadata = Metadata {
                name,
                description,
                image,
            };
            let stringified = serde_json::to_string::<Metadata, 256>(&metadata).unwrap();
            let encoded = base64::encode(stringified);

            let token_uri = format!("data:application/json;base64,{}", encoded);
            self._set_attribute(
                id.clone(),
                Attribute::TokenUri.to_key(),
                token_uri.into_bytes(),
            );
            self._set_attribute(id.clone(), Attribute::OnSale.to_key(), bool_to_bytes(true));
            self._set_attribute(
                id.clone(),
                Attribute::Price.to_key(),
                Vec::from(Nfts::PRICE.to_be_bytes()),
            );

            Ok(id)
        }

        #[ink(message)]
        pub fn token_uri(&self, token: Id) -> String {
            let token_uri_attribute = self
                .get_attribute(token, Attribute::TokenUri.to_key())
                .unwrap();
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

        #[ink(message)]
        pub fn on_sale(&self, token: Id) -> bool {
            let on_sale_attribute = self
                .get_attribute(token, Attribute::OnSale.to_key())
                .unwrap();
            bytes_to_bool(on_sale_attribute)
        }

        #[ink(message)]
        pub fn price(&self, token: Id) -> u128 {
            let price_attribute = self
                .get_attribute(token, Attribute::Price.to_key())
                .unwrap();
            u128::from_be_bytes(price_attribute.try_into().unwrap())
        }

        /// Calls the `Prosopo` contract to check if `user` is human
        #[ink(message)]
        pub fn is_human(&self, user: AccountId) -> Result<bool, PSP34Error> {
            let prosopo_instance: ProsopoRef =
                ink_env::call::FromAccountId::from_account_id(self.prosopo_account);
            let is_human = prosopo_instance.dapp_operator_is_human_user(user, HUMAN_THRESHOLD);
            // check that the captcha was completed within the last X seconds
            let last_correct_captcha = prosopo_instance.dapp_operator_last_correct_captcha(user);

            if is_human.is_err() || last_correct_captcha.is_err() {
                return Ok(false);
            }

            return Ok(last_correct_captcha.unwrap().before_ms <= RECENCY && is_human.unwrap());
        }

        #[ink(message, payable)]
        pub fn buy(&mut self, token: Id) -> Result<(), PSP34Error> {
            let token_owner = self.owner_of(token.clone());

            let amount_sent: Balance = self.env().transferred_value();
            let caller = self.env().caller();

            let is_human = self.is_human(caller);

            let res = match is_human {
                Ok(true) => Ok(()),
                Ok(false) => Err(PSP34Error::Custom(String::from(
                    "User not considered human",
                ))),
                Err(x) => Err(x),
            };

            if res.is_err() {
                return res;
            }

            if amount_sent < Nfts::PRICE {
                self.env().transfer(caller, amount_sent).ok();
                return Err(PSP34Error::Custom(String::from("Amount sent too low.")));
            } else if amount_sent > Nfts::PRICE {
                self.env().transfer(caller, amount_sent - Nfts::PRICE).ok();
            }

            if token_owner.is_none() {
                self.env().transfer(caller, amount_sent).ok();
                return Err(PSP34Error::Custom(String::from("Token not found.")));
            }

            let owner = token_owner.unwrap();

            if !self.on_sale(token.clone()) {
                self.env().transfer(caller, amount_sent).ok();
                return Err(PSP34Error::Custom(String::from("Token not for sale.")));
            }

            self.psp34
                .operator_approvals
                .insert((owner.clone(), caller.clone(), Some(token.clone())), &());

            self.transfer(caller, token.clone(), Vec::new());

            self._set_attribute(token, Attribute::OnSale.to_key(), bool_to_bytes(false));

            self.env().transfer(owner, amount_sent).ok();

            Ok(())
        }

        /// Fetches newest tokens
        #[ink(message)]
        pub fn get_tokens(
            &self,
            page_size: Option<u8>,
            offset: Option<u128>,
            owner: Option<AccountId>,
        ) -> Result<Vec<NFT>, PSP34Error> {
            let size: u128 = page_size.unwrap_or(20).into();

            if size == 0 {
                return Err(PSP34Error::Custom(String::from(
                    "Invalid page size! Must be 1 or greater.",
                )));
            }

            let mut tokens = Vec::new();

            let _offset = if offset.is_some() { offset.unwrap() } else { 0 };
            let balance: u128 = if owner.is_some() {
                self.balance_of(owner.unwrap()).into()
            } else {
                self.total_supply()
            };

            if balance <= _offset {
                return Ok(tokens);
            }

            let mut i = balance - _offset - 1;
            let end = if balance > _offset + size {
                balance - _offset - size
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
                let on_sale = self.on_sale(token.clone());
                let price = self.price(token.clone());

                tokens.push(NFT {
                    id,
                    owner,
                    token_uri,
                    on_sale,
                    price,
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
    }
}
