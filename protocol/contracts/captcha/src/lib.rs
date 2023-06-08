// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
#![cfg_attr(not(feature = "std"), no_std)]

pub use self::captcha::{Captcha, CaptchaRef};

#[allow(unused_macros)]
#[named_functions_macro::named_functions] // allows the use of the function_name!() macro
#[inject_self_macro::inject_self] // allows the use of the get_self!() macro
#[ink::contract]
pub mod captcha {

    use common::err;
    use common::err_fn;
    use common::lazy;
    use ink::env::debug_println as debug;
    use ink::env::hash::{Blake2x128, Blake2x256, CryptoHash, HashOutput};
    use ink::prelude::collections::btree_set::BTreeSet;
    use ink::prelude::vec;
    use ink::prelude::vec::Vec;
    use ink::storage::Lazy;
    #[allow(unused_imports)] // do not remove StorageLayout, it is used in derives
    use ink::storage::{traits::StorageLayout, Mapping};

    /// GovernanceStatus relates to DApps and Providers and determines if they are active or not
    #[derive(
        Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, PartialOrd, Ord,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum GovernanceStatus {
        Active, // active and available for use
        #[default]
        Inactive, // inactive and unavailable for use
    }

    /// CaptchaStatus is the status of a CaptchaSolutionCommitment, submitted by a DappUser
    #[derive(
        Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, PartialOrd, Ord,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum CaptchaStatus {
        Pending,
        Approved,
        #[default]
        Disapproved,
    }

    /// Payee is the recipient of any fees that are paid when a CaptchaSolutionCommitment is approved
    #[derive(
        Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, PartialOrd, Ord,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum Payee {
        Provider,
        #[default]
        Dapp,
    }

    /// Dapps must be able to filter Providers by their Payee when they are searching for a Provider
    #[derive(
        Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, PartialOrd, Ord,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum DappPayee {
        Provider,
        Dapp,
        #[default]
        Any,
    }

    impl TryFrom<DappPayee> for Payee {
        type Error = ();

        fn try_from(dapp_payee: DappPayee) -> Result<Self, Self::Error> {
            match dapp_payee {
                DappPayee::Provider => Ok(Payee::Provider),
                DappPayee::Dapp => Ok(Payee::Dapp),
                DappPayee::Any => Err(()),
            }
        }
    }

    impl TryFrom<Payee> for DappPayee {
        type Error = ();

        fn try_from(payee: Payee) -> Result<Self, Self::Error> {
            match payee {
                Payee::Provider => Ok(DappPayee::Provider),
                Payee::Dapp => Ok(DappPayee::Dapp),
            }
        }
    }

    /// Providers are suppliers of human verification methods (captchas, etc.) to DappUsers, either
    /// paying or receiving a fee for this service.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Provider {
        status: GovernanceStatus,
        balance: Balance,
        // an amount in the base unit of the default parachain token (e.g. Planck on chains using DOT)
        fee: u32,
        payee: Payee,
        url: Vec<u8>,
        dataset_id: Hash,
        dataset_id_content: Hash,
    }

    /// RandomProvider is selected randomly by the contract for the client side application
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct RandomProvider {
        provider_id: AccountId,
        provider: Provider,
        block_number: BlockNumber,
        dataset_id_content: Hash,
    }

    /// CaptchaData contains the hashed root of a Provider's dataset and is used to verify that
    /// the captchas received by a DappUser did belong to the Provider's original dataset
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct CaptchaData {
        provider: AccountId,
        dataset_id: Hash,
        dataset_id_content: Hash,
    }

    /// Commits are submitted by DAppUsers upon completion of one or more
    /// Captchas. They serve as proof of captcha completion to the outside world and can be used
    /// in dispute resolution.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Commit {
        id: Hash,                       // the commitment id
        user: AccountId,                // the user who submitted the commitment
        dataset_id: Hash,               // the dataset id
        status: CaptchaStatus,          // the status of the commitment
        dapp: AccountId,                // the dapp which the user completed the captcha on
        provider: AccountId,            // the provider who supplied the challenge
        requested_at: BlockNumber,      // the block number at which the captcha was requested
        completed_at: BlockNumber,      // the block number at which the captcha was completed
        user_signature_part1: [u8; 32], // the user's signature of the commitment
        user_signature_part2: [u8; 32],
    }

    /// DApps are distributed apps who want their users to be verified by Providers, either paying
    /// or receiving a fee for this service.
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Dapp {
        status: GovernanceStatus,
        balance: Balance,
        owner: AccountId,
        payee: DappPayee,
    }

    /// Users are the users of DApps that are required to be verified as human before they are
    /// allowed to interact with the DApps' contracts.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct User {
        // the last n commitment hashes in chronological order (most recent first)
        history: Vec<Hash>, // lookup the commitment in commitments
    }

    /// The summary of a user's captcha history using the n most recent captcha results limited by age and number of captcha results
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct UserHistorySummary {
        pub correct: u16,
        pub incorrect: u16,
        pub score: u8,
    }

    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct LastCorrectCaptcha {
        pub before: BlockNumber,
        pub dapp_id: AccountId,
    }

    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderState {
        pub status: GovernanceStatus,
        pub payee: Payee,
    }

    // Contract storage
    #[ink(storage)]
    pub struct Captcha {
        admin: AccountId, // the admin in control of this contract
        providers: Mapping<AccountId, Provider>,
        provider_accounts: Mapping<ProviderState, BTreeSet<AccountId>>,
        urls: Mapping<Hash, AccountId>, // url hash mapped to provider account
        datasets: Mapping<Hash, AccountId>,
        provider_stake_threshold: Balance,
        dapp_stake_threshold: Balance,
        dapps: Mapping<AccountId, Dapp>,
        dapp_accounts: Lazy<BTreeSet<AccountId>>,
        captcha_solution_commitments: Mapping<Hash, Commit>, // the commitments submitted by DappUsers
        dapp_users: Mapping<AccountId, User>,
        user_accounts: Lazy<BTreeSet<AccountId>>,
        max_user_history_len: u16, // the max number of captcha results to store in history for a user
        max_user_history_age: u16, // the max age, in blocks, of captcha results to store in history for a user
        min_num_active_providers: u16, // the minimum number of active providers required to allow captcha services
        max_provider_fee: Balance,
    }

    /// The error types
    ///
    #[derive(
        Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, PartialOrd, Ord,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum Error {
        /// Returned if calling account is not authorised to perform action
        NotAuthorised,
        /// Returned when the contract to address transfer fails
        ContractTransferFailed,
        /// Returned if provider exists when it shouldn't
        ProviderExists,
        /// Returned if provider does not exist when it should
        ProviderDoesNotExist,
        /// Returned if provider has insufficient funds to operate
        ProviderInsufficientFunds,
        /// Returned if provider is inactive and trying to use the service
        ProviderInactive,
        /// Returned if url is already used by another provider
        ProviderUrlUsed,
        /// Returned if dapp exists when it shouldn't
        DappExists,
        /// Returned if dapp does not exist when it should
        DappDoesNotExist,
        /// Returned if dapp is inactive and trying to use the service
        DappInactive,
        /// Returned if dapp has insufficient funds to operate
        DappInsufficientFunds,
        /// Returned if captcha data does not exist
        CaptchaDataDoesNotExist,
        /// Returned if solution commitment does not exist when it should
        CommitDoesNotExist,
        /// Returned if dapp user does not exist when it should
        DappUserDoesNotExist,
        /// Returned if there are no active providers
        NoActiveProviders,
        /// Returned if the dataset ID and dataset ID with solutions are identical
        DatasetIdSolutionsSame,
        /// CodeNotFound ink env error
        CodeNotFound,
        /// An unknown ink env error has occurred
        #[default]
        Unknown,
        /// Invalid contract
        InvalidContract,
        /// Invalid payee. Returned when the payee value does not exist in the enum
        InvalidPayee,
        /// Returned if not all captcha statuses have been handled
        InvalidCaptchaStatus,
        /// No correct captchas in history (either history is empty or all captchas are incorrect)
        NoCorrectCaptcha,
        /// Returned if not enough providers are active
        NotEnoughActiveProviders,
        /// Returned if provider fee is too high
        ProviderFeeTooHigh,
        /// Returned if the commitment already exists
        CommitAlreadyExists,
        CaptchaSolutionCommitmentAlreadyExists,
        /// Returned if verification of a signature fails (could be for many reasons, e.g. invalid public key, invalid payload, invalid signature)
        VerifyFailed,
    }

    impl Captcha {
        /// Constructor
        #[ink(constructor, payable)]
        pub fn new(
            provider_stake_threshold: Balance,
            dapp_stake_threshold: Balance,
            max_user_history_len: u16,
            max_user_history_age: u16,
            min_num_active_providers: u16,
            max_provider_fee: Balance,
        ) -> Self {
            let instantiator = AccountId::from([
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ]); // alice
            if Self::env().caller() != instantiator {
                panic!("Not authorised to instantiate this contract");
            }
            Self::new_unguarded(
                provider_stake_threshold,
                dapp_stake_threshold,
                max_user_history_len,
                max_user_history_age,
                min_num_active_providers,
                max_provider_fee,
            )
        }

        fn new_unguarded(
            provider_stake_threshold: Balance,
            dapp_stake_threshold: Balance,
            max_user_history_len: u16,
            max_user_history_age: u16,
            min_num_active_providers: u16,
            max_provider_fee: Balance,
        ) -> Self {
            Self {
                admin: Self::env().caller(),
                providers: Default::default(),
                provider_accounts: Default::default(),
                urls: Default::default(),
                datasets: Default::default(),
                dapp_users: Default::default(),
                provider_stake_threshold,
                dapp_stake_threshold,
                dapps: Default::default(),
                dapp_accounts: Default::default(),
                user_accounts: Default::default(),
                max_user_history_len,
                max_user_history_age,
                captcha_solution_commitments: Default::default(),
                min_num_active_providers,
                max_provider_fee,
            }
        }

        /// Verify a signature. The payload is a blake128 hash of the payload wrapped in the Byte tag. E.g.
        ///     message=hello
        ///     hash=blake128(message) // 0x1234... (32 bytes)
        ///     payload=<Bytes>0x1234...</Bytes> (32 bytes + 15 bytes (tags) + 2 bytes (multihash notation) = 49 bytes)
        ///
        /// Read more about multihash notation here https://w3c-ccg.github.io/multihash/index.xml#mh-example (adds two bytes to identify type and length of hash function)
        ///
        /// Note the signature must be sr25519 type.
        #[ink(message)]
        pub fn verify_sr25519(&self, signature: [u8; 64], payload: [u8; 49]) -> Result<(), Error> {
            let caller = self.env().caller();
            let mut caller_bytes = [0u8; 32];
            let caller_ref: &[u8] = caller.as_ref();
            caller_bytes.copy_from_slice(&caller_ref[..32]);

            let res = self
                .env()
                .sr25519_verify(&signature, &payload, &caller_bytes);

            if res.is_err() {
                return Err(Error::VerifyFailed);
            }

            Ok(())
        }

        #[ink(message)]
        pub fn get_caller(&self) -> AccountId {
            debug!("caller: {:?}", self.env().caller());
            self.env().caller()
        }

        /// Print and return an error
        fn print_err(&self, err: Error, fn_name: &str) -> Error {
            debug!(
                "ERROR in {}() at block {} with caller {:?}\n'{:?}'",
                fn_name,
                self.env().block_number(),
                self.env().caller(),
                err
            );
            err
        }

        #[ink(message)]
        pub fn get_payees(&self) -> Vec<Payee> {
            vec![Payee::Dapp, Payee::Provider]
        }

        #[ink(message)]
        pub fn get_dapp_payees(&self) -> Vec<DappPayee> {
            vec![DappPayee::Dapp, DappPayee::Provider, DappPayee::Any]
        }

        #[ink(message)]
        pub fn get_statuses(&self) -> Vec<GovernanceStatus> {
            vec![GovernanceStatus::Active, GovernanceStatus::Inactive]
        }

        /// Get contract provider minimum stake default.
        #[ink(message)]
        pub fn get_provider_stake_threshold(&self) -> Balance {
            self.provider_stake_threshold
        }

        /// Get contract dapp minimum stake default.
        #[ink(message)]
        pub fn get_dapp_stake_threshold(&self) -> Balance {
            self.dapp_stake_threshold
        }

        /// Convert a vec of u8 into a Hash
        fn hash_vec_u8(&self, data: &Vec<u8>) -> Hash {
            let slice = data.as_slice();
            let mut hash_output = <Blake2x256 as HashOutput>::Type::default();
            <Blake2x256 as CryptoHash>::hash(slice, &mut hash_output);

            Hash::from(hash_output)
        }

        fn check_provider_fee(&self, fee: u32) -> Result<(), Error> {
            if fee as u128 > self.max_provider_fee {
                return err!(Error::ProviderFeeTooHigh);
            }
            Ok(())
        }

        /// Configure a provider
        fn provider_configure(
            &mut self,
            url: Option<Vec<u8>>,
            fee: Option<u32>,
            payee: Option<Payee>,
            deactivate: bool,
            dataset_id: Option<Hash>,
            dataset_id_content: Option<Hash>,
        ) -> Result<(), Error> {
            if fee.is_some() {
                self.check_provider_fee(fee.unwrap())?;
            }

            let default_dataset_id = Hash::default();
            let provider_account = self.env().caller();
            let lookup = self.get_provider(provider_account);
            let new = lookup.is_err();
            let old_provider = if new {
                Provider {
                    status: GovernanceStatus::Inactive,
                    balance: 0,
                    fee: 0,
                    url: Vec::new(),
                    dataset_id: default_dataset_id,
                    payee: Payee::Provider,
                    dataset_id_content: default_dataset_id,
                }
            } else {
                lookup.unwrap()
            };
            if new {
                self.provider_state_insert(&old_provider, &provider_account)?;
            }
            let mut new_provider = old_provider.clone();

            // update the config
            new_provider.url = url.unwrap_or(old_provider.url.clone());
            new_provider.fee = fee.unwrap_or(old_provider.fee);
            new_provider.payee = payee.unwrap_or(old_provider.payee);
            new_provider.balance += self.env().transferred_value();
            new_provider.dataset_id = dataset_id.unwrap_or(old_provider.dataset_id);
            new_provider.dataset_id_content =
                dataset_id_content.unwrap_or(old_provider.dataset_id_content);

            // proceed only if there has been a change
            if old_provider == new_provider {
                // no need to update anything
                return Ok(());
            }

            // dataset content id cannot be equal to dataset id
            if new_provider.dataset_id != default_dataset_id
                && new_provider.dataset_id_content == new_provider.dataset_id
            {
                return err!(Error::DatasetIdSolutionsSame);
            }

            // update the dataset mapping to provider
            // remove old mapping
            self.datasets.remove(old_provider.dataset_id);
            if new_provider.dataset_id != default_dataset_id {
                // insert new mapping if not the default hash, as this is used as a placeholder value
                self.datasets
                    .insert(new_provider.dataset_id, &provider_account);
            }

            // if the provider is
            // not deactivating
            // has a balance >= provider_stake_threshold
            // has a dataset_id
            // has a dataset_id_content
            new_provider.status = if new_provider.balance >= self.provider_stake_threshold
                && new_provider.dataset_id != default_dataset_id
                && new_provider.dataset_id_content != default_dataset_id
                && !deactivate
            {
                // then set the status to active
                GovernanceStatus::Active
            } else {
                // else set the status to deactivated
                GovernanceStatus::Inactive
            };

            let old_url_hash = self.hash_vec_u8(&old_provider.url);
            let new_url_hash = self.hash_vec_u8(&new_provider.url);
            if old_url_hash != new_url_hash {
                // updating the url, so check whether the new origin is available
                if self.urls.contains(new_url_hash) {
                    return err!(Error::ProviderUrlUsed);
                } // else available

                self.urls.remove(old_url_hash);
                // don't record the default hash of the url as this is a special placeholder hash which is used elsewhere, e.g. in testing / setting up a dummy or default provider, so multiple providers may have this hash set
                if new_url_hash != default_dataset_id {
                    self.urls.insert(new_url_hash, &provider_account);
                }
            }

            self.providers.insert(provider_account, &new_provider);

            // update the category if status or payee has changed
            if old_provider.status != new_provider.status
                || old_provider.payee != new_provider.payee
            {
                self.provider_state_remove(&old_provider, &provider_account)?;
                self.provider_state_insert(&new_provider, &provider_account)?;
            }

            Ok(())
        }

        /// Remove the provider from their state
        fn provider_state_remove(
            &mut self,
            provider: &Provider,
            provider_account: &AccountId,
        ) -> Result<(), Error> {
            let category = ProviderState {
                status: provider.status,
                payee: provider.payee,
            };
            let mut set = self.provider_accounts.get(category).unwrap_or_default();
            let removed = set.remove(provider_account);
            if !removed {
                // expected provider to be in set
                return err!(Error::ProviderDoesNotExist);
            }
            self.provider_accounts.insert(category, &set);

            Ok(())
        }

        /// Add a provider to their state
        fn provider_state_insert(
            &mut self,
            provider: &Provider,
            provider_account: &AccountId,
        ) -> Result<(), Error> {
            let category = ProviderState {
                status: provider.status,
                payee: provider.payee,
            };
            let mut set = self.provider_accounts.get(category).unwrap_or_default();
            let inserted = set.insert(*provider_account);
            if !inserted {
                // expected provider to not already be in set
                return err!(Error::ProviderExists);
            }
            self.provider_accounts.insert(category, &set);

            Ok(())
        }

        /// Register a provider, their url and fee
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_register(
            &mut self,
            url: Vec<u8>,
            fee: u32,
            payee: Payee,
        ) -> Result<(), Error> {
            // this function is for registration only
            if self.get_provider(self.env().caller()).is_ok() {
                return err!(Error::ProviderExists);
            }

            self.provider_configure(Some(url), Some(fee), Some(payee), true, None, None)
        }

        /// Update an existing provider, their url, fee and deposit funds
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_update(
            &mut self,
            url: Vec<u8>,
            fee: u32,
            payee: Payee,
        ) -> Result<(), Error> {
            // this function is for updating only, not registering
            if self.providers.get(self.env().caller()).is_none() {
                return err!(Error::ProviderDoesNotExist);
            }

            self.provider_configure(Some(url), Some(fee), Some(payee), false, None, None)
        }

        /// De-activate a provider by setting their status to Deactivated
        #[ink(message)]
        pub fn provider_deactivate(&mut self) -> Result<(), Error> {
            // Change status to deactivated
            self.provider_configure(None, None, None, true, None, None)
        }

        /// Unstake and deactivate the provider's service, returning stake
        #[ink(message)]
        pub fn provider_deregister(&mut self) -> Result<(), Error> {
            let provider_account = self.env().caller();

            let provider = self.get_provider(provider_account)?;

            // remove the provider
            self.providers.remove(provider_account);

            // remove the provider from their category
            self.provider_state_remove(&provider, &provider_account)?;

            // return the stake
            let balance = provider.balance;
            if balance > 0 {
                self.env()
                    .transfer(provider_account, balance)
                    .map_err(|_| Error::ContractTransferFailed)?;
            }

            Ok(())
        }

        fn get_provider(&self, account: AccountId) -> Result<Provider, Error> {
            self.providers
                .get(account)
                .ok_or_else(err_fn!(Error::ProviderDoesNotExist))
        }

        #[ink(message)]
        #[ink(payable)]
        pub fn provider_fund(&mut self) -> Result<(), Error> {
            if self.env().transferred_value() > 0 {
                return self.provider_configure(None, None, None, false, None, None);
            }
            Ok(())
        }

        /// Add a new data set
        #[ink(message)]
        pub fn provider_set_dataset(
            &mut self,
            dataset_id: Hash,
            dataset_id_content: Hash,
        ) -> Result<(), Error> {
            self.provider_configure(
                None,
                None,
                None,
                false,
                Some(dataset_id),
                Some(dataset_id_content),
            )
        }

        /// Check the contract is a contract
        fn check_is_contract(&self, contract: AccountId) -> Result<(), Error> {
            if !self.env().is_contract(&contract) {
                return err!(Error::InvalidContract);
            }

            Ok(())
        }

        /// Get an existing dapp
        fn get_dapp(&self, contract: AccountId) -> Result<Dapp, Error> {
            self.dapps
                .get(contract)
                .ok_or_else(err_fn!(Error::DappDoesNotExist))
        }

        /// Check a dapp is missing / non-existent
        fn check_dapp_does_not_exist(&self, contract: AccountId) -> Result<(), Error> {
            if self.dapps.get(contract).is_some() {
                return err!(Error::DappExists);
            }

            Ok(())
        }

        /// Check a dapp is owned by the caller
        fn check_dapp_owner_is_caller(&self, contract: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            let dapp = self.get_dapp(contract)?;
            if dapp.owner != caller {
                return err!(Error::NotAuthorised);
            }

            Ok(())
        }

        /// Configure a dapp (existing or new)
        fn dapp_configure(
            &mut self,
            contract: AccountId,
            payee: Option<DappPayee>,
            owner: Option<AccountId>,
            deactivate: bool,
        ) -> Result<(), Error> {
            self.check_is_contract(contract)?;

            let dapp_lookup = self.dapps.get(contract);
            let new = dapp_lookup.is_none();
            let old_dapp = dapp_lookup.unwrap_or(Dapp {
                owner: owner.unwrap_or(self.env().caller()),
                balance: 0,
                status: GovernanceStatus::Inactive,
                payee: payee.unwrap_or(DappPayee::Provider),
            });
            let mut new_dapp = old_dapp;

            // check current contract for ownership
            if !new {
                self.check_dapp_owner_is_caller(contract)?;
            }

            if let Some(payee) = payee {
                new_dapp.payee = payee;
            }
            if let Some(owner) = owner {
                new_dapp.owner = owner;
            }

            // update the dapp funds
            new_dapp.balance += self.env().transferred_value();

            // update the dapp status
            new_dapp.status = if new_dapp.balance >= self.dapp_stake_threshold && !deactivate {
                GovernanceStatus::Active
            } else {
                GovernanceStatus::Inactive
            };

            if !new && old_dapp == new_dapp {
                // nothing to do as no change
                return Ok(());
            }

            // owner of the dapp cannot be an admin
            self.check_not_admin(new_dapp.owner)?;

            // if the dapp is new then add it to the list of dapps
            if new {
                lazy!(self.dapp_accounts, insert, contract);
            }

            // update the dapp in the mapping
            self.dapps.insert(contract, &new_dapp);

            Ok(())
        }

        /// Register a dapp
        #[ink(message)]
        #[ink(payable)]
        pub fn dapp_register(
            &mut self,
            contract: AccountId,
            payee: DappPayee,
        ) -> Result<(), Error> {
            // expect dapp to be new
            self.check_dapp_does_not_exist(contract)?;

            // configure the new dapp
            self.dapp_configure(
                contract,
                Some(payee),
                None, // the caller is made the owner of the contract
                false,
            )
        }

        /// Update a dapp with new funds, setting status as appropriate
        #[ink(message)]
        #[ink(payable)]
        pub fn dapp_update(
            &mut self,
            contract: AccountId,
            payee: DappPayee,
            owner: AccountId,
        ) -> Result<(), Error> {
            // expect dapp to exist
            self.get_dapp(contract)?;

            // configure the dapp
            self.dapp_configure(contract, Some(payee), Some(owner), false)
        }

        /// Fund dapp account to pay for services, if the Dapp caller is registered in self.dapps
        #[ink(message)]
        #[ink(payable)]
        pub fn dapp_fund(&mut self, contract: AccountId) -> Result<(), Error> {
            if self.env().transferred_value() == 0 {
                return Ok(());
            }

            self.get_dapp(contract)?; // only existing dapps can be used

            self.dapp_configure(contract, None, None, false)
        }

        /// Cancel services as a dapp, returning remaining tokens
        #[ink(message)]
        pub fn dapp_deregister(&mut self, contract: AccountId) -> Result<(), Error> {
            let dapp = self.get_dapp(contract)?;

            // check current contract for ownership
            self.check_dapp_owner_is_caller(contract)?;

            let balance = dapp.balance;
            if balance > 0 {
                self.env()
                    .transfer(dapp.owner, balance)
                    .map_err(|_| Error::ContractTransferFailed)?;
            }

            // remove the dapp
            self.dapps.remove(contract);
            lazy!(self.dapp_accounts, remove, &contract);

            Ok(())
        }

        /// Deactivate a dapp, leaving stake intact
        #[ink(message)]
        pub fn dapp_deactivate(&mut self, contract: AccountId) -> Result<(), Error> {
            self.get_dapp(contract)?;

            self.dapp_configure(contract, None, None, true)
        }

        /// Trim the user history to the max length and age.
        /// Returns the history and expired hashes.
        fn trim_user_history(&self, mut history: Vec<Hash>) -> (Vec<Hash>, Vec<Hash>) {
            let block_number = self.env().block_number();
            let max_age = if block_number < self.max_user_history_age as u32 {
                block_number
            } else {
                self.max_user_history_age as u32
            };
            let age_threshold = block_number - max_age;
            let mut expired = Vec::new();
            // trim the history down to max length
            while history.len() > self.max_user_history_len.into() {
                let hash = history.pop().unwrap();
                expired.push(hash);
            }
            // trim the history down to max age
            while !history.is_empty()
                && self
                    .captcha_solution_commitments
                    .get(history.last().unwrap())
                    .unwrap()
                    .completed_at
                    < age_threshold
            {
                let hash = history.pop().unwrap();
                expired.push(hash);
            }
            (history, expired)
        }

        /// Record a captcha result against a user, clearing out old captcha results as necessary.
        /// A minimum of 1 captcha result will remain irrelevant of max history length or age.
        fn record_commitment(&mut self, account: AccountId, hash: Hash, result: &Commit) {
            let mut user = self
                .dapp_users
                .get(account)
                .unwrap_or_else(|| self.create_new_dapp_user(account));
            // add the new commitment
            self.captcha_solution_commitments.insert(hash, result);
            user.history.insert(0, hash);

            // trim the user history by len and age, removing any expired commitments
            let (history, expired) = self.trim_user_history(user.history);
            // update the user history to the in age / length window set of commitment hashes
            user.history = history;
            // remove the expired commitments
            for hash in expired.iter() {
                self.captcha_solution_commitments.remove(hash);
            }

            self.dapp_users.insert(account, &user);
        }

        fn get_user_history_summary(
            &self,
            account: AccountId,
        ) -> Result<UserHistorySummary, Error> {
            let user = self.get_dapp_user(account)?;
            let (history, _expired) = self.trim_user_history(user.history);

            let mut summary = UserHistorySummary {
                correct: 0,
                incorrect: 0,
                score: 0,
            };
            for hash in history.iter() {
                let result = self.captcha_solution_commitments.get(hash).unwrap();
                if result.status == CaptchaStatus::Approved {
                    summary.correct += 1;
                } else if result.status == CaptchaStatus::Disapproved {
                    summary.incorrect += 1;
                } else {
                    return Err(Error::InvalidCaptchaStatus);
                }
            }

            if summary.correct + summary.incorrect == 0 {
                summary.score = 0;
            } else {
                // score is between 0 - 200, i.e. 0% - 100% in 0.5% increments
                let total: u16 = summary.correct + summary.incorrect;
                let correct: u16 = summary.correct * 200;
                summary.score = (correct / total) as u8;
            }

            Ok(summary)
        }

        /// Create a new dapp user if they do not already exist
        fn create_new_dapp_user(&mut self, account: AccountId) -> User {
            // create the user and add to our list of dapp users
            let lookup = self.dapp_users.get(account);
            if let Some(user) = lookup {
                return user;
            }

            let user = User {
                history: Default::default(),
            };
            self.dapp_users.insert(account, &user);
            let mut user_accounts = self.user_accounts.get_or_default();
            user_accounts.insert(account);
            self.user_accounts.set(&user_accounts);
            user
        }

        fn provider_record_commit(&mut self, commit: &Commit) -> Result<(), Error> {
            let caller = self.env().caller();

            // ensure the provider is active
            self.validate_provider_active(caller)?;
            // ensure the dapp is active
            self.validate_dapp(commit.dapp)?;

            // check commitment doesn't already exist
            if self.captcha_solution_commitments.get(commit.id).is_some() {
                return err!(Error::CommitAlreadyExists);
            }

            self.record_commitment(commit.user, commit.id, commit);

            self.pay_fee(&caller, &commit.dapp)?;

            Ok(())
        }

        #[ink(message)]
        pub fn provider_commit(&mut self, commit: Commit) -> Result<(), Error> {
            self.provider_record_commit(&commit)
        }

        /// Provider submits 0-many captcha solution commitments
        #[ink(message)]
        pub fn provider_commit_many(&mut self, commits: Vec<Commit>) -> Result<(), Error> {
            for commit in commits.iter() {
                self.provider_record_commit(commit)?;
            }

            Ok(())
        }

        /// Transfer a balance from a provider to a dapp or from a dapp to a provider,
        fn pay_fee(
            &mut self,
            provider_account: &AccountId,
            dapp_account: &AccountId,
        ) -> Result<(), Error> {
            let mut provider = self
                .providers
                .get(provider_account)
                .ok_or_else(err_fn!(Error::ProviderDoesNotExist))?;
            if provider.fee != 0 {
                let mut dapp = self
                    .dapps
                    .get(dapp_account)
                    .ok_or_else(err_fn!(Error::DappDoesNotExist))?;

                let fee = Balance::from(provider.fee);
                if provider.payee == Payee::Provider {
                    dapp.balance -= fee;
                    provider.balance += fee;
                }
                if provider.payee == Payee::Dapp {
                    provider.balance -= fee;
                    dapp.balance += fee;
                }
                self.providers.insert(*provider_account, &provider);
                self.dapps.insert(*dapp_account, &dapp);
            }
            Ok(())
        }

        /// Checks if the user is a human (true) as they have a solution rate higher than a % threshold or a bot (false)
        /// Threshold is decided by the calling user
        /// Threshold is between 0-200, i.e. 0-100% in 0.5% increments. E.g. 100 = 50%, 200 = 100%, 0 = 0%, 50 = 25%, etc.
        #[ink(message)]
        pub fn dapp_operator_is_human_user(
            &self,
            user: AccountId,
            threshold: u8,
        ) -> Result<bool, Error> {
            Ok(self.get_user_history_summary(user)?.score > threshold)
        }

        #[ink(message)]
        pub fn dapp_operator_last_correct_captcha(
            &self,
            user: AccountId,
        ) -> Result<LastCorrectCaptcha, Error> {
            let user = self.get_dapp_user(user)?;
            let (history, _expired) = self.trim_user_history(user.history);
            let mut last_correct_captcha = None;
            for hash in history {
                let entry = self.captcha_solution_commitments.get(hash).unwrap();
                if entry.status == CaptchaStatus::Approved {
                    last_correct_captcha = Some(entry);
                    break;
                }
            }

            if last_correct_captcha.is_none() {
                return Err(Error::NoCorrectCaptcha);
            }

            let last_correct_captcha = last_correct_captcha.unwrap();

            Ok(LastCorrectCaptcha {
                before: self.env().block_number() - last_correct_captcha.completed_at,
                dapp_id: last_correct_captcha.dapp,
            })
        }

        // Informational / Validation functions

        fn validate_provider_exists_and_has_funds(
            &self,
            provider_id: AccountId,
        ) -> Result<Provider, Error> {
            if self.providers.get(provider_id).is_none() {
                return err!(Error::ProviderDoesNotExist);
            }
            let provider = self.get_provider_details(provider_id)?;
            if provider.balance < self.provider_stake_threshold {
                return err!(Error::ProviderInsufficientFunds);
            }
            Ok(provider)
        }

        fn validate_provider_active(&self, provider_id: AccountId) -> Result<Provider, Error> {
            let provider = self.validate_provider_exists_and_has_funds(provider_id)?;
            if provider.status != GovernanceStatus::Active {
                return err!(Error::ProviderInactive);
            }
            Ok(provider)
        }

        fn validate_dapp(&self, contract: AccountId) -> Result<Dapp, Error> {
            // Guard against dapps using service that are not registered
            if self.dapps.get(contract).is_none() {
                return err!(Error::DappDoesNotExist);
            }
            // Guard against dapps using service that are Suspended or Deactivated
            let dapp = self.get_dapp_details(contract)?;
            if dapp.status != GovernanceStatus::Active {
                return err!(Error::DappInactive);
            }
            // Make sure the Dapp can pay the transaction fees of the user and potentially the
            // provider, if their fee > 0
            if dapp.balance < self.dapp_stake_threshold {
                return err!(Error::DappInsufficientFunds);
            }
            Ok(dapp)
        }

        /// Get a single captcha dataset
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_captcha_data(&self, dataset_id: Hash) -> Result<CaptchaData, Error> {
            let provider_account = self
                .datasets
                .get(dataset_id)
                .ok_or_else(err_fn!(Error::CaptchaDataDoesNotExist))?;
            let provider = self.get_provider(provider_account)?;
            Ok(CaptchaData {
                dataset_id,
                provider: provider_account,
                dataset_id_content: provider.dataset_id_content,
            })
        }

        /// Get a dapp user
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_dapp_user(&self, dapp_user_id: AccountId) -> Result<User, Error> {
            self.dapp_users
                .get(dapp_user_id)
                .ok_or_else(err_fn!(Error::DappUserDoesNotExist))
        }

        /// Get a single provider's details
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_provider_details(&self, accountid: AccountId) -> Result<Provider, Error> {
            self.providers
                .get(accountid)
                .ok_or_else(err_fn!(Error::ProviderDoesNotExist))
        }

        /// Get a single dapps details
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_dapp_details(&self, contract: AccountId) -> Result<Dapp, Error> {
            self.dapps
                .get(contract)
                .ok_or_else(err_fn!(Error::DappDoesNotExist))
        }

        /// Get a solution commitment
        ///
        /// Returns an error if the commitment does not exist
        #[ink(message)]
        pub fn get_captcha_solution_commitment(
            &self,
            captcha_solution_commitment_id: Hash,
        ) -> Result<Commit, Error> {
            if self
                .captcha_solution_commitments
                .get(captcha_solution_commitment_id)
                .is_none()
            {
                return err!(Error::CommitDoesNotExist);
            }
            let commitment = self
                .captcha_solution_commitments
                .get(captcha_solution_commitment_id)
                .ok_or_else(err_fn!(Error::CommitDoesNotExist))?;

            Ok(commitment)
        }

        /// Returns the account balance for the specified `dapp`.
        ///
        #[ink(message)]
        pub fn get_dapp_balance(&self, dapp: AccountId) -> Result<Balance, Error> {
            Ok(self.get_dapp_details(dapp)?.balance)
        }

        /// Returns the account balance for the specified `provider`.
        ///
        #[ink(message)]
        pub fn get_provider_balance(&self, provider: AccountId) -> Result<Balance, Error> {
            Ok(self.get_provider_details(provider)?.balance)
        }

        /// List providers given an array of account id
        ///
        /// Returns empty if none were matched
        #[ink(message)]
        pub fn list_providers_by_ids(
            &self,
            provider_ids: Vec<AccountId>,
        ) -> Result<Vec<Provider>, Error> {
            let mut providers = Vec::new();
            for provider_id in provider_ids {
                let provider = self.providers.get(provider_id);
                if provider.is_none() {
                    continue;
                }
                providers.push(provider.ok_or_else(err_fn!(Error::ProviderDoesNotExist))?);
            }
            Ok(providers)
        }

        /// List providers given an array of status
        ///
        /// Returns empty if none were matched
        #[ink(message)]
        pub fn list_providers_by_status(
            &self,
            statuses: Vec<GovernanceStatus>,
        ) -> Result<Vec<Provider>, Error> {
            let mut providers = Vec::<Provider>::new();
            for status in statuses {
                for payee in [Payee::Dapp, Payee::Provider] {
                    let providers_set = self.provider_accounts.get(ProviderState { status, payee });
                    if providers_set.is_none() {
                        continue;
                    }
                    let provider_ids = providers_set
                        .ok_or_else(err_fn!(Error::ProviderDoesNotExist))?
                        .into_iter()
                        .collect();
                    providers.append(&mut self.list_providers_by_ids(provider_ids)?);
                }
            }
            Ok(providers)
        }

        /// Get a random active provider
        ///
        /// Returns error if no active provider is found
        #[ink(message)]
        pub fn get_random_active_provider(
            &self,
            user_account: AccountId,
            dapp_contract_account: AccountId,
        ) -> Result<RandomProvider, Error> {
            let dapp = self.validate_dapp(dapp_contract_account)?;
            let status = GovernanceStatus::Active;
            let active_providers;
            let mut index: u128;
            if dapp.payee == DappPayee::Any {
                // Get the active providers for which the payee is dapp
                let active_providers_initial = self
                    .provider_accounts
                    .get(ProviderState {
                        status,
                        payee: Payee::Dapp,
                    })
                    .unwrap_or_default();
                let mut max = active_providers_initial.len();

                // Get the active providers for which the payee is provider
                let active_providers_secondary = self
                    .provider_accounts
                    .get(ProviderState {
                        status,
                        payee: Payee::Provider,
                    })
                    .unwrap_or_default();

                // The max length of the active providers is the sum of the two
                max += active_providers_secondary.len();

                // If the max is 0, then there are no active providers
                if max == 0 {
                    return err!(Error::NoActiveProviders);
                }

                if max < self.min_num_active_providers.into() {
                    return err!(Error::NotEnoughActiveProviders);
                }

                // Get a random number between 0 and max
                index = self.get_random_number(max as u128, user_account, dapp_contract_account);

                // Work out which BTreeset to get the provider from and modify the index accordingly
                if index < active_providers_initial.len() as u128 {
                    active_providers = active_providers_initial;
                } else {
                    index -= active_providers_initial.len() as u128;
                    active_providers = active_providers_secondary;
                }
            } else {
                let payee = Payee::try_from(dapp.payee).map_err(|_| Error::InvalidPayee)?;

                // Get the active providers based on the dapps payee field
                active_providers = self
                    .provider_accounts
                    .get(ProviderState { status, payee })
                    .unwrap_or_default();

                // If the length is 0, then there are no active providers
                if active_providers.is_empty() {
                    return err!(Error::NoActiveProviders);
                }

                if active_providers.len() < self.min_num_active_providers.into() {
                    return err!(Error::NotEnoughActiveProviders);
                }

                // Get a random number between 0 and the length of the active providers
                index = self.get_random_number(
                    active_providers.len() as u128,
                    user_account,
                    dapp_contract_account,
                );
            }

            let provider_id = active_providers.into_iter().nth(index as usize).unwrap();
            let provider = self
                .providers
                .get(provider_id)
                .ok_or_else(err_fn!(Error::ProviderDoesNotExist))?;

            let captcha_data = self.get_captcha_data(provider.dataset_id)?;
            let dataset_id_content = captcha_data.dataset_id_content;

            Ok(RandomProvider {
                provider_id,
                provider,
                block_number: self.env().block_number(),
                dataset_id_content,
            })
        }

        /// Get the AccountIds of all Providers ever registered
        ///
        /// Returns {Vec<AccountId>}
        #[ink(message)]
        pub fn get_all_provider_ids(&self) -> Result<Vec<AccountId>, Error> {
            let mut provider_ids = Vec::<AccountId>::new();
            for status in [GovernanceStatus::Active, GovernanceStatus::Inactive] {
                for payee in [Payee::Provider, Payee::Dapp] {
                    let providers_set = self.provider_accounts.get(ProviderState { status, payee });
                    if providers_set.is_none() {
                        continue;
                    }
                    provider_ids.append(&mut providers_set.unwrap().into_iter().collect());
                }
            }
            Ok(provider_ids)
        }

        /// Get a random number from 0 to `len` - 1 inclusive. The user account is added to the seed for additional random entropy.
        #[ink(message)]
        pub fn get_random_number(
            &self,
            len: u128,
            user_account: AccountId,
            dapp_account: AccountId,
        ) -> u128 {
            if len == 0 {
                panic!("Cannot generate a random number for a length of 0 or less");
            }
            // build a random seed from user account, block number, block timestamp and (TODO) block hash
            const BLOCK_NUMBER_SIZE: usize = 4;
            const BLOCK_TIMESTAMP_SIZE: usize = 8;
            const ACCOUNT_SIZE: usize = 32;
            let block_number: u32 = self.env().block_number();
            let block_timestamp: u64 = self.env().block_timestamp();
            let user_account_bytes: &[u8; ACCOUNT_SIZE] = user_account.as_ref();
            let dapp_account_bytes: &[u8; ACCOUNT_SIZE] = dapp_account.as_ref();
            // pack all the data into a single byte array
            let block_number_arr: [u8; BLOCK_NUMBER_SIZE] = block_number.to_le_bytes();
            let block_timestamp_arr: [u8; BLOCK_TIMESTAMP_SIZE] = block_timestamp.to_le_bytes();
            let mut bytes: [u8; BLOCK_TIMESTAMP_SIZE
                + BLOCK_NUMBER_SIZE
                + ACCOUNT_SIZE
                + ACCOUNT_SIZE] =
                [0x0; BLOCK_TIMESTAMP_SIZE + BLOCK_NUMBER_SIZE + ACCOUNT_SIZE + ACCOUNT_SIZE];
            bytes[0..BLOCK_NUMBER_SIZE].copy_from_slice(&block_number_arr);
            bytes[BLOCK_NUMBER_SIZE..BLOCK_NUMBER_SIZE + BLOCK_TIMESTAMP_SIZE]
                .copy_from_slice(&block_timestamp_arr);
            bytes[BLOCK_NUMBER_SIZE + BLOCK_TIMESTAMP_SIZE
                ..BLOCK_NUMBER_SIZE + BLOCK_TIMESTAMP_SIZE + ACCOUNT_SIZE]
                .copy_from_slice(user_account_bytes);
            bytes[BLOCK_TIMESTAMP_SIZE + BLOCK_NUMBER_SIZE + ACCOUNT_SIZE..]
                .copy_from_slice(dapp_account_bytes);
            // hash to ensure small changes (e.g. in the block timestamp) result in large change in the seed
            let mut hash_output = <Blake2x128 as HashOutput>::Type::default();
            <Blake2x128 as CryptoHash>::hash(&bytes, &mut hash_output);
            // the random number can be derived from the hash
            let next = u128::from_le_bytes(hash_output);
            // use modulo to get a number between 0 (inclusive) and len (exclusive)
            // e.g. if len = 10 then range would be 0-9

            next % len
        }

        /// Terminate this contract and return any/all funds in this contract to the destination
        #[ink(message)]
        pub fn terminate(&mut self) -> Result<(), Error> {
            self.check_caller_admin()?;
            self.env().terminate_contract(self.env().caller());
        }

        /// Withdraw some funds from the contract to the specified destination
        #[ink(message)]
        pub fn withdraw(&mut self, amount: Balance) -> Result<(), Error> {
            self.check_caller_admin()?;
            let transfer_result =
                ink::env::transfer::<ink::env::DefaultEnvironment>(self.env().caller(), amount);
            if transfer_result.is_err() {
                return err!(Error::ContractTransferFailed);
            }
            Ok(())
        }

        /// Set the code hash for this contract
        #[ink(message)]
        pub fn set_code_hash(&mut self, code_hash: [u8; 32]) -> Result<(), Error> {
            self.check_caller_admin()?;
            let set_code_hash_result = ink::env::set_code_hash(&code_hash);
            if let Err(e) = set_code_hash_result {
                match e {
                    ink::env::Error::CodeNotFound => {
                        return err!(Error::CodeNotFound);
                    }
                    _ => {
                        return err!(Error::Unknown);
                    }
                }
            }
            Ok(())
        }

        /// Set the admin for this contract
        #[ink(message)]
        pub fn set_admin(&mut self, new_admin: AccountId) -> Result<(), Error> {
            self.check_caller_admin()?;
            self.admin = new_admin;
            Ok(())
        }

        /// Is the caller the admin for this contract?
        fn check_caller_admin(&self) -> Result<(), Error> {
            self.check_admin(self.env().caller())
        }

        /// Is the specified account the admin for this contract?
        fn check_admin(&self, acc: AccountId) -> Result<(), Error> {
            if self.admin != acc {
                return err!(Error::NotAuthorised);
            }
            Ok(())
        }

        fn check_not_admin(&self, acc: AccountId) -> Result<(), Error> {
            if self.admin == acc {
                err!(Error::NotAuthorised)
            } else {
                Ok(())
            }
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// ************** READ BEFORE TESTING *******************
    /// The below code is technically just normal Rust code.
    /// Therefore you can use println!() as usual, but by default stdout is only shown for tests which fail.
    /// Run the tests via `cargo test` (no need for `cargo contract`!)
    /// *********************************
    #[cfg(test)]
    #[cfg_attr(
        debug_assertions,
        allow(
            dead_code,
            unused_imports,
            unused_variables,
            unused_mut,
            unused_must_use,
            non_upper_case_globals,
            non_shorthand_field_patterns
        )
    )]
    mod tests {
        use ink;
        use ink::codegen::Env;
        use ink::env::hash::Blake2x256;
        use ink::env::hash::CryptoHash;
        use ink::env::hash::HashOutput;

        use crate::captcha::Error::{ProviderInactive, ProviderInsufficientFunds};

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        type Event = <Captcha as ::ink::reflect::ContractEventBase>::Type;

        const STAKE_THRESHOLD: u128 = 1000000000000;

        const set_caller: fn(AccountId) =
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>;
        const get_account_balance: fn(AccountId) -> Result<u128, ink::env::Error> =
            ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>;
        const set_account_balance: fn(AccountId, u128) =
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>;
        const set_callee: fn(AccountId) =
            ink::env::test::set_callee::<ink::env::DefaultEnvironment>;
        const default_accounts: fn() -> ink::env::test::DefaultAccounts<
            ink::env::DefaultEnvironment,
        > = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>;

        const ADMIN_ACCOUNT_PREFIX: u8 = 0x01;
        const DAPP_ACCOUNT_PREFIX: u8 = 0x02;
        const PROVIDER_ACCOUNT_PREFIX: u8 = 0x03;
        const USER_ACCOUNT_PREFIX: u8 = 0x04;
        const CONTRACT_ACCOUNT_PREFIX: u8 = 0x05;
        const CODE_HASH_PREFIX: u8 = 0x06;

        mod tests_inner {

            /// Imports all the definitions from the outer scope so we can use them here.
            use super::*;

            // unused account is 0x00 - do not use this, it will be the default caller, so could get around caller checks accidentally
            fn get_unused_account() -> AccountId {
                AccountId::from([0x00; 32])
            }

            // build an account. Accounts have the first byte set to the type of account and the next 16 bytes are the index of the account
            fn get_account_bytes(account_type: u8, index: u128) -> [u8; 32] {
                let mut bytes = [0x00; 32];
                bytes[0] = account_type;
                bytes[1..17].copy_from_slice(&index.to_le_bytes());
                bytes
            }

            fn get_account(account_type: u8, index: u128) -> AccountId {
                let account = AccountId::from(get_account_bytes(account_type, index));
                // fund the account so it exists if not already
                let balance = get_account_balance(account);
                if balance.is_err() {
                    // account doesn't have the existential deposit so doesn't exist
                    // give it funds to create it
                    set_account_balance(account, 1);
                }
                account
            }

            /// get the nth admin account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
            fn get_admin_account(index: u128) -> AccountId {
                get_account(ADMIN_ACCOUNT_PREFIX, index)
            }

            /// get the nth provider account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
            fn get_provider_account(index: u128) -> AccountId {
                get_account(PROVIDER_ACCOUNT_PREFIX, index)
            }

            /// get the nth dapp account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
            fn get_dapp_account(index: u128) -> AccountId {
                get_account(DAPP_ACCOUNT_PREFIX, index)
            }

            /// get the nth user account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
            fn get_user_account(index: u128) -> AccountId {
                get_account(USER_ACCOUNT_PREFIX, index)
            }

            /// get the nth contract account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
            fn get_contract_account(index: u128) -> AccountId {
                get_account(CONTRACT_ACCOUNT_PREFIX, index)
            }

            /// get the nth code hash. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
            fn get_code_hash(index: u128) -> [u8; 32] {
                get_account_bytes(CODE_HASH_PREFIX, index)
            }

            /// get the nth contract. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
            fn get_contract(index: u128) -> Captcha {
                let account = get_account(CONTRACT_ACCOUNT_PREFIX, index); // the account for the contract
                                                                           // make sure the contract gets allocated the above account
                set_callee(account);
                // give the contract account some funds
                set_account_balance(account, 1);
                // set the caller to the first admin
                set_caller(get_admin_account(0));
                // now construct the contract instance
                let mut contract =
                    Captcha::new_unguarded(STAKE_THRESHOLD, STAKE_THRESHOLD, 10, 255, 0, 1000);
                // set the caller back to the unused acc
                set_caller(get_unused_account());
                // check the contract was created with the correct account
                assert_eq!(contract.env().account_id(), account);
                contract
            }

            #[ink::test]
            fn test_ctor_guard_pass() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                // only able to instantiate from the alice account
                set_caller(AccountId::from([
                    212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
                    44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
                ]));
                let contract = Captcha::new(STAKE_THRESHOLD, STAKE_THRESHOLD, 10, 255, 0, 1000);
                // should construct successfully
            }

            #[ink::test]
            #[should_panic]
            fn test_ctor_guard_fail() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                // only able to instantiate from the alice account
                set_caller(default_accounts().bob);
                let contract = Captcha::new(STAKE_THRESHOLD, STAKE_THRESHOLD, 10, 255, 0, 1000);
                // should fail to construct and panic
            }

            #[ink::test]
            fn test_ctor() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // ctor params should be set
                assert_eq!(contract.provider_stake_threshold, STAKE_THRESHOLD);
                assert_eq!(contract.dapp_stake_threshold, STAKE_THRESHOLD);
                assert_eq!(contract.admin, get_admin_account(0));
                assert_eq!(contract.max_user_history_len, 10);
                assert_eq!(contract.max_user_history_age, 255);
                assert_eq!(contract.min_num_active_providers, 0);
                assert_eq!(contract.max_provider_fee, 1000);

                // default state should be set
                for payee in contract.get_payees().iter() {
                    for status in contract.get_statuses().iter() {
                        assert_eq!(
                            contract.provider_accounts.get(ProviderState {
                                payee: *payee,
                                status: *status
                            }),
                            None
                        );
                    }
                }
                assert_eq!(contract.dapp_accounts.get(), None);
                assert_eq!(contract.user_accounts.get(), None);
            }

            /// Test accounts are funded with existential deposit
            #[ink::test]
            fn test_accounts_funded() {
                for func in vec![
                    get_admin_account,
                    get_provider_account,
                    get_dapp_account,
                    get_user_account,
                    get_contract_account,
                ]
                .iter()
                {
                    for i in 0..10 {
                        let account = func(i);
                        // check the account has funds. Will panic if not as no existential deposit == account not found
                        get_account_balance(account).unwrap();
                    }
                }

                // same for contracts
                for i in 0..10 {
                    let contract = get_contract(i);
                    // check the account has funds. Will panic if not as no existential deposit == account not found
                    get_account_balance(contract.env().account_id()).unwrap();
                }
            }

            /// Are the unit test accounts unique, i.e. make sure there's no collisions in accounts destined for different roles, as this would invalidate any caller guards
            #[ink::test]
            fn test_accounts_unique() {
                let mut set: std::collections::HashSet<[u8; 32]> = std::collections::HashSet::new();

                // for each method of generating an account
                for func in vec![
                    get_admin_account,
                    get_provider_account,
                    get_dapp_account,
                    get_user_account,
                    get_contract_account,
                ]
                .iter()
                {
                    // try the first 10 accounts
                    for i in 0..10 {
                        let account = func(i);
                        assert!(
                            set.insert(*AsRef::<[u8; 32]>::as_ref(&account)),
                            "Duplicate account ID found: {:?}",
                            account
                        );
                    }
                }

                // do the same for non-account based IDs
                for func in vec![get_code_hash].iter() {
                    // try the first 10 accounts
                    for i in 0..10 {
                        let account = func(i);
                        assert!(
                            set.insert(account),
                            "Duplicate account ID found: {:?}",
                            account
                        );
                    }
                }
            }

            /// Are the unit test contracts unique, i.e. make sure there's no collisions in contract accounts as two contracts with the same account could work around funding tests as utilising the same account
            #[ink::test]
            fn test_contracts_unique() {
                let mut set: std::collections::HashSet<[u8; 32]> = std::collections::HashSet::new();

                // for the first 10 contracts
                for i in 0..9 {
                    let contract = get_contract(i);
                    let account = contract.env().account_id();
                    assert!(
                        set.insert(*AsRef::<[u8; 32]>::as_ref(&account)),
                        "Duplicate account ID found: {:?}",
                        account
                    );
                }
            }

            // #[ink::test]
            // fn test_set_code_hash() {

            //     // always set the caller to the unused account to start, avoid any mistakes with caller checks
            //     set_caller(get_unused_account());
            //

            //     let mut contract = get_contract(0);

            //     let new_code_hash = get_code_hash(1);
            //     let old_code_hash = contract.env().own_code_hash().unwrap();
            //     assert_ne!(Hash::from(new_code_hash), old_code_hash);

            //     set_caller(get_admin_account(0)); // an account which does have permission to call set code hash

            //     assert_eq!(contract.set_code_hash(new_code_hash), Ok(()));

            //     assert_eq!(contract.env().own_code_hash().unwrap(), Hash::from(new_code_hash));
            // }

            #[ink::test]
            fn test_set_code_hash_unauthorised() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                set_caller(get_user_account(0)); // an account which does not have permission to call set code hash

                let new_code_hash = get_code_hash(1);
                assert_eq!(
                    contract.set_code_hash(new_code_hash),
                    Err(Error::NotAuthorised)
                );
            }

            #[ink::test]
            fn test_terminate() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                set_caller(get_admin_account(0)); // an account which does have permission to call terminate

                let contract_account = contract.env().account_id();
                let bal = get_account_balance(contract_account).unwrap();
                let admin = get_admin_account(0);
                let should_terminate = move || contract.terminate().unwrap();
                ink::env::test::assert_contract_termination::<ink::env::DefaultEnvironment, _>(
                    should_terminate,
                    get_admin_account(0),
                    bal,
                );
            }

            #[ink::test]
            fn test_terminate_unauthorised() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                set_caller(get_user_account(0)); // an account which does not have permission to call terminate

                assert_eq!(contract.terminate().unwrap_err(), Error::NotAuthorised);
            }

            #[ink::test]
            fn test_withdraw() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                println!("contract {:?}", contract.env().account_id());

                // give the contract funds
                set_account_balance(contract.env().account_id(), 10000000000);
                set_caller(get_admin_account(0)); // use the admin acc
                let admin_bal: u128 = get_account_balance(get_admin_account(0)).unwrap();
                let contract_bal: u128 = get_account_balance(contract.env().account_id()).unwrap();
                let withdraw_amount: u128 = 1;
                contract.withdraw(withdraw_amount).unwrap();
                assert_eq!(
                    get_account_balance(get_admin_account(0)).unwrap(),
                    admin_bal + withdraw_amount
                );
                assert_eq!(
                    get_account_balance(contract.env().account_id()).unwrap(),
                    contract_bal - withdraw_amount
                );
            }

            #[ink::test]
            #[should_panic]
            fn test_withdraw_insufficient_funds() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                set_caller(get_admin_account(0)); // use the admin acc
                let admin_bal = get_account_balance(get_admin_account(0)).unwrap();
                let contract_bal = get_account_balance(contract.env().account_id()).unwrap();
                contract.withdraw(contract_bal + 1); // panics as bal would go below existential deposit
            }

            #[ink::test]
            fn test_withdraw_unauthorised() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // give the contract funds
                set_caller(get_user_account(0)); // use the admin acc
                assert_eq!(contract.withdraw(1), Err(Error::NotAuthorised));
            }

            #[ink::test]
            fn test_check_admin() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                // try the first 10 accounts
                for i in 0..9 {
                    let acc = get_admin_account(i);
                    if acc == contract.admin {
                        assert!(contract.check_admin(acc).is_ok());
                        assert!(contract.check_not_admin(acc).is_err());
                        set_caller(acc);
                        assert!(contract.check_caller_admin().is_ok());
                    } else {
                        assert!(contract.check_admin(acc).is_err());
                        assert!(contract.check_not_admin(acc).is_ok());
                        set_caller(acc);
                        assert!(contract.check_caller_admin().is_err());
                    }
                }
            }

            #[ink::test]
            fn test_set_admin() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let old_admin = contract.admin;
                let new_admin = get_admin_account(1);
                assert_ne!(old_admin, new_admin);

                contract.check_admin(old_admin).unwrap();
                contract.check_not_admin(new_admin).unwrap();

                set_caller(old_admin);
                contract.set_admin(new_admin).unwrap();

                contract.check_admin(new_admin).unwrap();
                contract.check_not_admin(old_admin).unwrap();
            }

            #[ink::test]
            fn test_set_admin_unauthorised() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let old_admin = contract.admin;
                let new_admin = get_admin_account(1);
                assert_ne!(old_admin, new_admin);

                contract.check_admin(old_admin).unwrap();
                contract.check_not_admin(new_admin).unwrap();

                // can only call set_admin from the current admin account (old admin)
                set_caller(new_admin);
                contract.set_admin(new_admin).unwrap_err();
            }

            #[ink::test]
            fn test_ctor_caller_admin() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // check the caller is admin
                assert_eq!(contract.admin, get_admin_account(0));
            }

            /// Assert contract provider minimum stake default set from constructor.
            #[ink::test]
            pub fn test_provider_stake_threshold() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let provider_stake_threshold: u128 = contract.get_provider_stake_threshold();
                assert!(STAKE_THRESHOLD.eq(&provider_stake_threshold));
            }

            /// Assert contract dapp minimum stake default set from constructor.
            #[ink::test]
            pub fn test_dapp_stake_threshold() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let dapp_stake_threshold: u128 = contract.get_dapp_stake_threshold();
                assert!(STAKE_THRESHOLD.eq(&dapp_stake_threshold));
            }

            /// Test provider register
            #[ink::test]
            fn test_provider_register() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let provider_account = AccountId::from([0x2; 32]);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                // give provider some funds, but not enough to be above the minimum stake
                set_account_balance(provider_account, 1);
                let url: Vec<u8> = vec![1, 2, 3];
                let fee: u32 = 100;
                contract.provider_register(url, fee, Payee::Dapp);
                assert!(contract.providers.get(provider_account).is_some());
                println!(
                    "{}",
                    contract
                        .provider_accounts
                        .get(ProviderState {
                            status: GovernanceStatus::Inactive,
                            payee: Payee::Provider
                        })
                        .unwrap_or_default()
                        .contains(&provider_account)
                );

                assert!(contract
                    .provider_accounts
                    .get(ProviderState {
                        status: GovernanceStatus::Inactive,
                        payee: Payee::Dapp
                    })
                    .unwrap_or_default()
                    .contains(&provider_account));
            }

            /// Test provider deregister
            #[ink::test]
            fn test_provider_deactivate() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let provider_account = AccountId::from([0x2; 32]);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let url: Vec<u8> = vec![1, 2, 3];
                let fee: u32 = 100;
                contract.provider_register(url, fee, Payee::Dapp);
                assert!(contract.providers.get(provider_account).is_some());
                contract.provider_deactivate();
                let provider_record = contract.providers.get(provider_account).unwrap();
                assert!(provider_record.status == GovernanceStatus::Inactive);
            }

            /// Test list providers
            #[ink::test]
            fn test_list_providers_by_ids() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let provider_account = AccountId::from([0x2; 32]);
                let url: Vec<u8> = vec![1, 2, 3];
                let fee: u32 = 100;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract.provider_register(url, fee, Payee::Dapp);
                let registered_provider_account = contract.providers.get(provider_account);
                assert!(registered_provider_account.is_some());
                let returned_list = contract
                    .list_providers_by_ids(vec![provider_account])
                    .unwrap();
                assert!(returned_list == vec![registered_provider_account.unwrap()]);
            }

            // test get random number with zero length, i.e. no range to pick from
            #[ink::test]
            #[should_panic]
            fn test_get_random_number_zero_len() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                contract.get_random_number(0, get_unused_account(), get_unused_account());
            }

            // Test get random number
            #[ink::test]
            fn test_get_random_number() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let acc1 = AccountId::from([0x1; 32]);
                let acc2 = AccountId::from([0x2; 32]);
                const len: usize = 10;
                let mut arr = [0; len];
                // get several random numbers, one per block
                for item in arr.iter_mut().take(len) {
                    let number = contract.get_random_number(100, acc1, acc2);
                    *item = number;
                    println!(
                        "{:?} {:?} {:?}",
                        number,
                        ink::env::block_number::<ink::env::DefaultEnvironment>(),
                        ink::env::block_timestamp::<ink::env::DefaultEnvironment>()
                    );
                    ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
                }
                // check that the random numbers match precomputed values
                assert_eq!(&[29, 95, 86, 92, 88, 24, 59, 73, 96, 53], &arr);
            }

            /// Helper function for converting string to Hash
            fn str_to_hash(str: String) -> Hash {
                let mut result = Hash::default();
                let len_result = result.as_ref().len();
                let mut hash_output = <<Blake2x256 as HashOutput>::Type as Default>::default();
                <Blake2x256 as CryptoHash>::hash(str.as_ref(), &mut hash_output);
                let copy_len = core::cmp::min(hash_output.len(), len_result);
                result.as_mut()[0..copy_len].copy_from_slice(&hash_output[0..copy_len]);
                result
            }

            /// Provider Register Helper
            fn generate_provider_data(id: u8, port: &str, fee: u32) -> (AccountId, Vec<u8>, u32) {
                let provider_account = AccountId::from([id; 32]);
                let url = port.as_bytes().to_vec();

                (provider_account, url, fee)
            }

            /// Test provider register and update
            #[ink::test]
            fn test_provider_register_and_update() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let (provider_account, url, fee) = generate_provider_data(0x2, "2424", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract.provider_register(url, fee, Payee::Dapp).unwrap();
                assert!(contract.providers.get(provider_account).is_some());
                assert!(contract
                    .provider_accounts
                    .get(ProviderState {
                        status: GovernanceStatus::Inactive,
                        payee: Payee::Dapp
                    })
                    .unwrap()
                    .contains(&provider_account));

                let url: Vec<u8> = vec![1, 2, 3];
                let fee: u32 = 100;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let balance = 20000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url.clone(), fee, Payee::Dapp);
                assert!(contract
                    .provider_accounts
                    .get(ProviderState {
                        status: GovernanceStatus::Inactive,
                        payee: Payee::Dapp
                    })
                    .unwrap()
                    .contains(&provider_account));
                let provider = contract.providers.get(provider_account).unwrap();
                assert_eq!(provider.url, url);
                assert_eq!(provider.fee, fee);
                assert_eq!(provider.payee, Payee::Dapp);
                assert_eq!(provider.balance, balance);
                assert_eq!(provider.status, GovernanceStatus::Inactive);
            }

            /// Test provider register with url error
            #[ink::test]
            fn test_provider_register_with_url_error() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // try creating the second provider and make sure the error is correct and that it doesn't exist
                let (provider_account, _, _) = generate_provider_data(0x3, "4242", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                println!("{:?}", contract.providers.get(provider_account));
                match contract.provider_register(url, fee, Payee::Dapp) {
                    Result::Err(Error::ProviderUrlUsed) => {}
                    _ => {
                        unreachable!();
                    }
                }
                println!("{:?}", contract.providers.get(provider_account));
                assert!(contract.providers.get(provider_account).is_none());
                assert!(!contract
                    .provider_accounts
                    .get(ProviderState {
                        status: GovernanceStatus::Inactive,
                        payee: Payee::Dapp
                    })
                    .unwrap()
                    .contains(&provider_account));
            }

            /// Test provider update with url error
            #[ink::test]
            fn test_provider_update_with_url_error() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract.provider_register(url, fee, Payee::Dapp).unwrap();

                let (provider_account, url, fee) = generate_provider_data(0x3, "2424", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract.provider_register(url, fee, Payee::Dapp).unwrap();

                let (_, url, fee) = generate_provider_data(0x3, "4242", 100);

                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let balance = 20000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

                // try updating the second provider and make sure the error is correct and that it didn't change
                match contract.provider_update(url.clone(), fee, Payee::Dapp) {
                    Result::Err(Error::ProviderUrlUsed) => {}
                    _ => {
                        unreachable!();
                    }
                }

                let provider = contract.providers.get(provider_account).unwrap();
                assert_ne!(provider.url, url);
                assert_ne!(provider.fee, fee);
                assert_ne!(provider.balance, balance);
                assert_ne!(provider.status, GovernanceStatus::Active);
            }

            /// Test provider unstake
            #[ink::test]
            fn test_provider_deregister() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                // give the contract some funds
                set_account_balance(contract.env().account_id(), 1000000000);
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                let balance: u128 = 10;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .ok();
                ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                    provider_account,
                    balance,
                );
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider);
                contract.provider_deregister().ok();
            }

            /// Test provider add data set
            #[ink::test]
            fn test_provider_set_dataset() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                let balance: u128 = 2000000000000;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .ok();
                ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                    provider_account,
                    balance,
                );
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider);
                let root1 = str_to_hash("merkle tree".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                contract.provider_set_dataset(root1, root2).ok();
            }

            /// Test dapp register with zero balance transfer
            #[ink::test]
            fn test_dapp_register_zero_balance_transfer() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let caller = AccountId::from([0x2; 32]);
                let dapp_contract = AccountId::from([0x3; 32]);
                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
                // Don't transfer anything with the call
                let balance = 0;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

                contract.dapp_register(dapp_contract, DappPayee::Dapp);
                assert!(contract.dapps.get(dapp_contract).is_some());
                let dapp = contract.dapps.get(dapp_contract).unwrap();
                assert_eq!(dapp.owner, caller);

                // account is marked as suspended as zero tokens have been paid
                assert_eq!(dapp.status, GovernanceStatus::Inactive);
                assert_eq!(dapp.balance, balance);
                assert!(contract
                    .dapp_accounts
                    .get()
                    .unwrap()
                    .contains(&dapp_contract));
            }

            /// Test dapp register with positive balance transfer
            #[ink::test]
            fn test_dapp_register_positive_balance_transfer() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let caller = AccountId::from([0x2; 32]);
                let dapp_contract = AccountId::from([0x3; 32]);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

                // Transfer tokens with the call
                let balance = STAKE_THRESHOLD;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

                // register the dapp
                contract.dapp_register(dapp_contract, DappPayee::Dapp);
                // check the dapp exists in the hashmap
                assert!(contract.dapps.get(dapp_contract).is_some());

                // check the various attributes are correct
                let dapp = contract.dapps.get(dapp_contract).unwrap();
                assert_eq!(dapp.owner, caller);

                // account is marked as active as balance is now positive
                assert_eq!(dapp.status, GovernanceStatus::Active);
                assert_eq!(dapp.balance, balance);
                assert!(contract
                    .dapp_accounts
                    .get()
                    .unwrap()
                    .contains(&dapp_contract));
            }

            #[ink::test]
            fn test_verify_sr25519_valid() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let data = "hello";
                let mut data_hash = [0u8; 16];
                Blake2x128::hash(data.as_bytes(), &mut data_hash);
                println!("data_hash: {:?}", data_hash);
                let data_hex = hex::encode(data_hash);
                println!("data_hex: {:?}", data_hex);
                // hex of prefix + hex of message hash + hex of suffix make the payload
                let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
                println!("payload: {}", payload);
                let payload_hex = hex::encode(payload);
                println!("payload_hex: {}", payload_hex);
                // put payload into bytes
                let mut payload_bytes = [0u8; 49];
                payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

                // Test against a known signature
                // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
                let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
                println!("signature: {}", signature_hex);
                let mut signature_bytes = [0u8; 64];
                signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

                const ALICE: [u8; 32] = [
                    212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
                    44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
                ];
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

                // verify the signature
                contract
                    .verify_sr25519(signature_bytes, payload_bytes)
                    .unwrap();
            }

            #[ink::test]
            fn test_verify_sr25519_invalid_signature() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let data = "hello";
                let mut data_hash = [0u8; 16];
                Blake2x128::hash(data.as_bytes(), &mut data_hash);
                println!("data_hash: {:?}", data_hash);
                let data_hex = hex::encode(data_hash);
                println!("data_hex: {:?}", data_hex);
                // hex of prefix + hex of message hash + hex of suffix make the payload
                let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
                println!("payload: {}", payload);
                let payload_hex = hex::encode(payload);
                println!("payload_hex: {}", payload_hex);
                // put payload into bytes
                let mut payload_bytes = [0u8; 49];
                payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

                // Test against a known signature
                // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
                let signature_hex = "1a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
                println!("signature: {}", signature_hex);
                let mut signature_bytes = [0u8; 64];
                signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

                const ALICE: [u8; 32] = [
                    212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
                    44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
                ];
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

                // verify the signature
                contract
                    .verify_sr25519(signature_bytes, payload_bytes)
                    .unwrap_err();
            }

            #[ink::test]
            #[should_panic]
            fn test_verify_sr25519_invalid_public_key() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let data = "hello";
                let mut data_hash = [0u8; 16];
                Blake2x128::hash(data.as_bytes(), &mut data_hash);
                println!("data_hash: {:?}", data_hash);
                let data_hex = hex::encode(data_hash);
                println!("data_hex: {:?}", data_hex);
                // hex of prefix + hex of message hash + hex of suffix make the payload
                let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
                println!("payload: {}", payload);
                let payload_hex = hex::encode(payload);
                println!("payload_hex: {}", payload_hex);
                // put payload into bytes
                let mut payload_bytes = [0u8; 49];
                payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

                // Test against a known signature
                // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
                let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
                println!("signature: {}", signature_hex);
                let mut signature_bytes = [0u8; 64];
                signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

                const ALICE: [u8; 32] = [
                    213, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
                    44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
                ];
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

                // verify the signature
                let valid = contract.verify_sr25519(signature_bytes, payload_bytes);
            }

            #[ink::test]
            fn test_verify_sr25519_invalid_data() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let data = "hello2";
                let mut data_hash = [0u8; 16];
                Blake2x128::hash(data.as_bytes(), &mut data_hash);
                println!("data_hash: {:?}", data_hash);
                let data_hex = hex::encode(data_hash);
                println!("data_hex: {:?}", data_hex);
                // hex of prefix + hex of message hash + hex of suffix make the payload
                let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
                println!("payload: {}", payload);
                let payload_hex = hex::encode(payload);
                println!("payload_hex: {}", payload_hex);
                // put payload into bytes
                let mut payload_bytes = [0u8; 49];
                payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

                // Test against a known signature
                // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
                let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
                println!("signature: {}", signature_hex);
                let mut signature_bytes = [0u8; 64];
                signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

                const ALICE: [u8; 32] = [
                    212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
                    44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
                ];
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

                // verify the signature
                contract
                    .verify_sr25519(signature_bytes, payload_bytes)
                    .unwrap_err();
            }

            #[ink::test]
            fn test_verify_sr25519_invalid_payload() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                let data = "hello";
                let mut data_hash = [0u8; 16];
                Blake2x128::hash(data.as_bytes(), &mut data_hash);
                println!("data_hash: {:?}", data_hash);
                let data_hex = hex::encode(data_hash);
                println!("data_hex: {:?}", data_hex);
                // hex of prefix + hex of message hash + hex of suffix make the payload
                let payload = "<Aytes>0x".to_string() + &data_hex + "</Bytes>";
                println!("payload: {}", payload);
                let payload_hex = hex::encode(payload);
                println!("payload_hex: {}", payload_hex);
                // put payload into bytes
                let mut payload_bytes = [0u8; 49];
                payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

                // Test against a known signature
                // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
                let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
                println!("signature: {}", signature_hex);
                let mut signature_bytes = [0u8; 64];
                signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

                const ALICE: [u8; 32] = [
                    212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
                    44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
                ];
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

                // verify the signature
                contract
                    .verify_sr25519(signature_bytes, payload_bytes)
                    .unwrap_err();
            }

            /// Test dapp register and then update
            #[ink::test]
            fn test_dapp_register_and_update() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let caller = AccountId::from([0x2; 32]);
                let dapp_contract_account = AccountId::from([0x3; 32]);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

                // Transfer tokens with the call
                let balance_1 = STAKE_THRESHOLD;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_1);

                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // register the dapp
                contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

                // check the dapp exists in the hashmap
                assert!(contract.dapps.get(dapp_contract_account).is_some());

                // check the various attributes are correct
                let dapp = contract.dapps.get(dapp_contract_account).unwrap();
                assert_eq!(dapp.owner, caller);

                // account is marked as active as tokens have been paid
                assert_eq!(dapp.status, GovernanceStatus::Active);
                assert_eq!(dapp.balance, balance_1);

                // Transfer tokens with the call
                let balance_2 = STAKE_THRESHOLD;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);

                // run the register function again for the same (caller, contract) pair, adding more
                // tokens
                contract.dapp_update(dapp_contract_account, DappPayee::Any, caller);

                // check the various attributes are correct
                let dapp = contract.dapps.get(dapp_contract_account).unwrap();

                // account is marked as active as tokens have been paid
                assert_eq!(dapp.status, GovernanceStatus::Active);
                assert_eq!(dapp.balance, balance_1 + balance_2);
                assert!(contract
                    .dapp_accounts
                    .get()
                    .unwrap()
                    .contains(&dapp_contract_account));
            }

            /// Test dapp fund account
            #[ink::test]
            fn test_dapp_fund() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let caller = AccountId::from([0x2; 32]);
                let dapp_contract = AccountId::from([0x3; 32]);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

                // Transfer tokens with the register call
                let balance_1 = 100;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_1);

                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

                // register the dapp
                contract.dapp_register(dapp_contract, DappPayee::Dapp);

                // Transfer tokens with the fund call
                let balance_2 = 200;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);
                contract.dapp_fund(dapp_contract);

                // check the total account balance is correct
                let dapp = contract.dapps.get(dapp_contract).unwrap();
                assert_eq!(dapp.balance, balance_1 + balance_2);
            }

            /// Test dapp cancel
            #[ink::test]
            fn test_dapp_cancel() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                // give the contract some funds
                set_account_balance(contract.env().account_id(), 1000000000);
                let caller = AccountId::from([0x2; 32]);
                let contract_account = AccountId::from([0x3; 32]);
                let callers_initial_balance =
                    ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>(caller)
                        .unwrap();

                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(contract_account);

                // Make sure the dapp account is a contract
                let result =
                    ink::env::test::is_contract::<ink::env::DefaultEnvironment>(contract_account);
                assert!(result);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

                // Transfer tokens with the register call
                let balance = 200;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

                // register the dapp
                contract.dapp_register(contract_account, DappPayee::Dapp);

                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

                // Transfer tokens with the fund call
                contract.dapp_deregister(contract_account).ok();

                // check the dapp has been removed
                assert!(contract.dapps.get(contract_account).is_none());

                // Make sure the funds are returned to the caller
                let callers_balance =
                    ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>(caller)
                        .unwrap();
                assert_eq!(callers_initial_balance + balance, callers_balance);
            }

            /// Test provider approve
            #[ink::test]
            fn test_provider_approve() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // Register the provider
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 1);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // Call from the provider account to add data and stake tokens
                let balance = 2000000000000;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider);
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

                let provider = contract.providers.get(provider_account).unwrap();
                // can only add data set after staking
                contract.provider_set_dataset(root1, root2).ok();

                // Register the dapp
                let dapp_caller_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
                // Give the dap a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

                //Dapp User commit
                let dapp_user_account = AccountId::from([0x5; 32]);
                let user_root = str_to_hash("user merkle tree root".to_string());

                // Call from the provider account to mark the solution as approved
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let solution_id = user_root;
                contract.provider_commit(Commit {
                    dapp: dapp_contract_account,
                    dataset_id: user_root,
                    status: CaptchaStatus::Approved,
                    provider: provider_account,
                    user: dapp_user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_id,
                    user_signature_part1: [0x0; 32],
                    user_signature_part2: [0x0; 32],
                });
                let commitment = contract
                    .captcha_solution_commitments
                    .get(solution_id)
                    .unwrap();
                assert_eq!(commitment.status, CaptchaStatus::Approved);
                let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account).unwrap();
                let new_provider_balance = contract.get_provider_balance(provider_account).unwrap();
                assert_eq!(balance - Balance::from(fee), new_dapp_balance);
                assert_eq!(balance + Balance::from(fee), new_provider_balance);

                // Now make sure that the provider cannot later set the solution to disapproved and make
                // sure that the dapp balance is unchanged

                contract.provider_commit(Commit {
                    dapp: dapp_contract_account,
                    dataset_id: user_root,
                    status: CaptchaStatus::Disapproved,
                    provider: provider_account,
                    user: dapp_user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_id,
                    user_signature_part1: [0x0; 32],
                    user_signature_part2: [0x0; 32],
                });
                let commitment = contract
                    .captcha_solution_commitments
                    .get(solution_id)
                    .unwrap();
                assert_eq!(commitment.status, CaptchaStatus::Approved);
                assert_eq!(
                    balance - Balance::from(fee),
                    contract.get_dapp_balance(dapp_contract_account).unwrap()
                );
                assert_eq!(
                    balance + Balance::from(fee),
                    contract.get_provider_balance(provider_account).unwrap()
                );
            }

            /// Test provider cannot approve invalid solution id
            #[ink::test]
            fn test_provider_approve_invalid_id() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // Register the provider
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // Call from the provider account to add data and stake tokens
                let balance = 2000000000000;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider);
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

                // can only add data set after staking
                contract.provider_set_dataset(root1, root2).ok();

                // Register the dapp
                let dapp_caller_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
                // Give the dap a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.dapp_register(dapp_contract_account, DappPayee::Dapp);
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

                //Dapp User commit
                let dapp_user_account = AccountId::from([0x5; 32]);
                let user_root = str_to_hash("user merkle tree root".to_string());

                // Call from the provider account to mark the wrong solution as approved
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let solution_id = str_to_hash("id that does not exist".to_string());

                let result = contract.provider_commit(Commit {
                    dapp: dapp_contract_account,
                    dataset_id: user_root,
                    status: CaptchaStatus::Approved,
                    provider: provider_account,
                    user: dapp_user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_id,
                    user_signature_part1: [0x0; 32],
                    user_signature_part2: [0x0; 32],
                });
            }

            /// Test provider disapprove
            #[ink::test]
            fn test_provider_disapprove() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // Register the provider
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 1);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // Call from the provider account to add data and stake tokens
                let balance = 2000000000000;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider).unwrap();
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
                // can only add data set after staking
                contract.provider_set_dataset(root1, root2).unwrap();
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

                // Register the dapp
                let dapp_caller_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
                // Give the dap a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract
                    .dapp_register(dapp_contract_account, DappPayee::Dapp)
                    .unwrap();

                //Dapp User commit
                let dapp_user_account = AccountId::from([0x5; 32]);
                let user_root = str_to_hash("user merkle tree root".to_string());

                // Call from the provider account to mark the solution as disapproved
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let solution_id = user_root;
                contract
                    .provider_commit(Commit {
                        dapp: dapp_contract_account,
                        dataset_id: user_root,
                        status: CaptchaStatus::Disapproved,
                        provider: provider_account,
                        user: dapp_user_account,
                        completed_at: 0,
                        requested_at: 0,
                        id: solution_id,
                        user_signature_part1: [0x0; 32],
                        user_signature_part2: [0x0; 32],
                    })
                    .unwrap();
                let commitment = contract
                    .captcha_solution_commitments
                    .get(solution_id)
                    .unwrap();
                assert_eq!(commitment.status, CaptchaStatus::Disapproved);
                let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account).unwrap();
                let new_provider_balance = contract.get_provider_balance(provider_account).unwrap();
                assert_eq!(balance - Balance::from(fee), new_dapp_balance);
                assert_eq!(balance + Balance::from(fee), new_provider_balance);

                // Now make sure that the provider cannot later set the solution to approved
                contract.provider_commit(Commit {
                    dapp: dapp_contract_account,
                    dataset_id: user_root,
                    status: CaptchaStatus::Approved,
                    provider: provider_account,
                    user: dapp_user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_id,
                    user_signature_part1: [0x0; 32],
                    user_signature_part2: [0x0; 32],
                });
                let commitment = contract
                    .captcha_solution_commitments
                    .get(solution_id)
                    .unwrap();
                assert_eq!(commitment.status, CaptchaStatus::Disapproved);
                assert_eq!(
                    balance - Balance::from(fee),
                    contract.get_dapp_balance(dapp_contract_account).unwrap()
                );
                assert_eq!(
                    balance + Balance::from(fee),
                    contract.get_provider_balance(provider_account).unwrap()
                );
            }

            /// Test dapp user is human
            #[ink::test]
            fn test_dapp_operator_is_human_user() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // Register the provider
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // Call from the provider account to add data and stake tokens
                let balance = 2000000000000;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider).unwrap();
                // can only add data set after staking
                contract.provider_set_dataset(root1, root2);

                // Register the dapp
                let dapp_caller_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
                // Give the dap a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract
                    .dapp_register(dapp_contract_account, DappPayee::Dapp)
                    .unwrap();

                //Dapp User commit
                let dapp_user_account = AccountId::from([0x5; 32]);
                // Call from the Dapp User Account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);
                let user_root = str_to_hash("user merkle tree root".to_string());

                // Call from the provider account to mark the solution as disapproved
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let solution_id = user_root;
                contract.provider_commit(Commit {
                    dapp: dapp_contract_account,
                    dataset_id: user_root,
                    status: CaptchaStatus::Disapproved,
                    provider: provider_account,
                    user: dapp_user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_id,
                    user_signature_part1: [0x0; 32],
                    user_signature_part2: [0x0; 32],
                });
                let commitment = contract
                    .captcha_solution_commitments
                    .get(solution_id)
                    .unwrap();
                assert_eq!(commitment.status, CaptchaStatus::Disapproved);

                // Now make sure that the dapp user does not pass the human test
                let result = contract.dapp_operator_is_human_user(dapp_user_account, 80 * 2);
                assert!(!result.unwrap());
            }

            /// Test non-existent dapp account has zero balance
            #[ink::test]
            fn test_non_existent_dapp_account_has_zero_balance() {
                let dapp_account = AccountId::from([0x2; 32]);
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                contract.get_dapp_balance(dapp_account).unwrap_err();
            }

            /// Test non-existent provider account has zero balance
            #[ink::test]
            fn test_non_existent_provider_account_has_zero_balance() {
                let provider_account = AccountId::from([0x2; 32]);
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                contract.get_provider_balance(provider_account).unwrap_err();
            }

            // // Test get random provider
            #[ink::test]
            fn test_get_random_active_provider() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let provider_account = AccountId::from([0x2; 32]);
                let url: Vec<u8> = vec![1, 2, 3];
                let fee: u32 = 100;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract.provider_register(url.clone(), fee, Payee::Dapp);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let balance = 20000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Dapp);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                contract.provider_set_dataset(root1, root2);
                let registered_provider_account = contract.providers.get(provider_account);
                // Register the dapp
                let dapp_caller_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
                // Give the dap a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.dapp_register(dapp_contract_account, DappPayee::Dapp);
                let selected_provider =
                    contract.get_random_active_provider(provider_account, dapp_contract_account);
                assert!(
                    selected_provider.unwrap().provider == registered_provider_account.unwrap()
                );
            }

            // // Test get random provider
            #[ink::test]
            fn test_get_random_active_provider_dapp_any() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                let provider_account = AccountId::from([0x2; 32]);
                let dapp_user_account = AccountId::from([0x30; 32]);
                let url: Vec<u8> = vec![1, 2, 3];
                let fee: u32 = 100;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract.provider_register(url.clone(), fee, Payee::Provider);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let balance = 20000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url.clone(), fee, Payee::Provider);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                contract.provider_set_dataset(root1, root2);

                // Register the dapp
                let dapp_caller_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
                // Give the dapp a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.dapp_register(dapp_contract_account, DappPayee::Any);

                // Call from the dapp_user_account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);

                // Call as dapp user and get a random provider
                let selected_provider =
                    contract.get_random_active_provider(dapp_user_account, dapp_contract_account);
                assert_eq!(selected_provider.unwrap().provider_id, provider_account);

                // Switch the provider payee to Dapp
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract.provider_update(url, fee, Payee::Dapp);

                // Call from the dapp_user_account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);

                // Call as dapp user and get a random provider. Ensure that the provider is still
                // selected despite the payee change
                let selected_provider =
                    contract.get_random_active_provider(dapp_user_account, dapp_contract_account);
                assert_eq!(selected_provider.unwrap().provider_id, provider_account);
            }

            /// Test provider can supply a dapp user commit for themselves and approve or disapprove it
            #[ink::test]
            fn test_provider_commit_and_approve_and_disapprove() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // Register the provider
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // Call from the provider account to add data and stake tokens
                let balance = 2000000000000;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider);
                // can only add data set after staking
                contract.provider_set_dataset(root1, root2).ok();

                // Register the dapp
                let dapp_caller_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
                // Give the dap a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

                // Call from the provider account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);

                //Dapp User commit and approve
                let dapp_user_account = AccountId::from([0x5; 32]);
                let user_root1 = str_to_hash("user merkle tree root to approve".to_string());
                contract.provider_commit(Commit {
                    dapp: dapp_contract_account,
                    dataset_id: user_root1,
                    status: CaptchaStatus::Approved,
                    provider: provider_account,
                    user: dapp_user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: user_root1,
                    user_signature_part1: [0x0; 32],
                    user_signature_part2: [0x0; 32],
                });

                // Get the commitment and make sure it is approved
                let commitment = contract
                    .get_captcha_solution_commitment(user_root1)
                    .unwrap();
                assert_eq!(commitment.status, CaptchaStatus::Approved);

                //Dapp User commit and disapprove
                let dapp_user_account = AccountId::from([0x5; 32]);
                let user_root2 = str_to_hash("user merkle tree root to disapprove".to_string());
                contract.provider_commit(Commit {
                    dapp: dapp_contract_account,
                    dataset_id: root2,
                    status: CaptchaStatus::Disapproved,
                    provider: provider_account,
                    user: dapp_user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: user_root2,
                    user_signature_part1: [0x0; 32],
                    user_signature_part2: [0x0; 32],
                });

                // Get the commitment and make sure it is disapproved
                let commitment = contract
                    .get_captcha_solution_commitment(user_root2)
                    .unwrap();
                assert_eq!(commitment.status, CaptchaStatus::Disapproved);
            }

            /// Test provider cannot supply a dapp user commit for a different Provider
            #[ink::test]
            fn test_provider_cannot_supply_commit_for_a_different_provider() {
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);

                // Register the provider
                let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // Call from the provider account to add data and stake tokens
                let balance = 2000000000000;
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider);
                // can only add data set after staking
                contract.provider_set_dataset(root1, root2).ok();

                // Register the dapp
                let dapp_user_account = AccountId::from([0x3; 32]);
                let dapp_contract_account = AccountId::from([0x4; 32]);
                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

                // Call from the dapp_contract_account
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_contract_account);
                // Give the dap a balance
                let balance = 2000000000000;
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

                // Register a second provider
                let (provider_account2, url, fee) = generate_provider_data(0x5, "2424", 0);
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account2);
                contract
                    .provider_register(url.clone(), fee, Payee::Dapp)
                    .unwrap();

                // Call from the provider account to add data and stake tokens
                let balance = 2000000000000;
                let root1 = str_to_hash("merkle tree1".to_string());
                let root2 = str_to_hash("merkle tree2".to_string());
                ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
                contract.provider_update(url, fee, Payee::Provider);
                // can only add data set after staking
                contract.provider_set_dataset(root1, root2).ok();

                // Call from dapp_user_commit from provider_account2 to supply a commit for provider_account
                // Should not be authorised
                let dapp_user_account = AccountId::from([0x6; 32]);
                let user_root = str_to_hash("user merkle tree root".to_string());
            }

            /// Get some operator accounts as a vector
            fn get_operator_accounts() -> Vec<AccountId> {
                let operator_account1 = AccountId::from([0x1; 32]);
                let operator_account2 = AccountId::from([0x10; 32]);
                let mut operator_accounts = vec![operator_account1, operator_account2];
                operator_accounts
            }

            fn setup_contract() -> (AccountId, AccountId, Vec<AccountId>, Captcha) {
                let op1 = AccountId::from([0x1; 32]);
                let op2 = AccountId::from([0x2; 32]);
                let ops = vec![op1, op2];
                // initialise the contract
                // always set the caller to the unused account to start, avoid any mistakes with caller checks
                set_caller(get_unused_account());

                let mut contract = get_contract(0);
                (op1, op2, ops, contract)
            }

            /// Test dapp cannot register if existing dapp in place
            #[ink::test]
            fn test_dapp_register_existing() {
                let (op1, op2, ops, mut contract) = setup_contract();
                let dapp_contract = AccountId::from([0x4; 32]);

                // Mark the the dapp account as being a contract on-chain
                ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

                // the caller should be someone who isn't an operator
                ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(
                    [0x3; 32],
                ));

                contract
                    .dapp_register(dapp_contract, DappPayee::Dapp)
                    .unwrap();
                assert_eq!(
                    Error::DappExists,
                    contract
                        .dapp_register(dapp_contract, DappPayee::Dapp)
                        .unwrap_err()
                );
            }
        }
    }
}
