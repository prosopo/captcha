// Copyright 2021-2024 Prosopo (UK) Ltd.
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
#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub use self::captcha::{Captcha, CaptchaRef};

#[ink::contract]
pub mod captcha {

    use common::common::check_is_admin;
    use common::common::config;
    use common::common::Error;
    use common::err;
    use common::err_fn;
    use common::lazy;
    use common::Math;
    use ink::env::hash::{Blake2x128, Blake2x256, CryptoHash, HashOutput};
    use ink::prelude::collections::btree_set::BTreeSet;
    use ink::prelude::vec;
    use ink::prelude::vec::Vec;
    use ink::storage::traits::{ManualKey, StorageKey};
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

    impl Provider {
        pub fn get_category(&self) -> ProviderCategory {
            ProviderCategory {
                payee: self.payee,
                status: self.status,
            }
        }
    }

    struct ProviderConfig {
        payee: Option<Payee>,
        fee: Option<u32>,
        url: Option<Vec<u8>>,
        dataset_id: Option<Hash>,
        dataset_id_content: Option<Hash>,
        deactivate: bool,
        should_exist: bool,
    }

    impl Default for ProviderConfig {
        fn default() -> Self {
            Self {
                payee: None,
                fee: None,
                url: None,
                dataset_id: None,
                dataset_id_content: None,
                deactivate: false,
                should_exist: true,
            }
        }
    }

    /// RandomProvider is selected randomly by the contract for the client side application
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct RandomProvider {
        provider_account: AccountId,
        provider: Provider,
        block_number: BlockNumber,
    }

    /// CaptchaData contains the hashed root of a Provider's dataset and is used to verify that
    /// the captchas received by a DappUser did belong to the Provider's original dataset
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct CaptchaData {
        provider_account: AccountId,
        dataset_id: Hash,
        dataset_id_content: Hash,
    }

    /// Commits are submitted by DAppUsers upon completion of one or more
    /// Captchas. They serve as proof of captcha completion to the outside world and can be used
    /// in dispute resolution.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Commit {
        id: Hash,                    // the commitment id
        user_account: AccountId,     // the user who submitted the commitment
        dataset_id: Hash,            // the dataset id
        status: CaptchaStatus,       // the status of the commitment
        dapp_contract: AccountId,    // the dapp which the user completed the captcha on
        provider_account: AccountId, // the provider who supplied the challenge
        requested_at: BlockNumber,   // the block number at which the captcha was requested
        completed_at: BlockNumber,   // the block number at which the captcha was completed
        user_signature: [u8; 64],    // the user's signature of the commitment
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

    struct DappConfig {
        contract: AccountId,
        payee: Option<DappPayee>,
        owner: Option<AccountId>,
        deactivate: bool,
        should_exist: bool,
    }

    impl Default for DappConfig {
        fn default() -> Self {
            Self {
                contract: AccountId::from([0u8; 32]),
                payee: None,
                owner: None,
                deactivate: false,
                should_exist: true,
            }
        }
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
        pub before: BlockNumber, // the number of blocks before the current block that the last correct captcha was completed
        pub dapp_contract: AccountId,
    }

    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderCategory {
        pub status: GovernanceStatus,
        pub payee: Payee,
    }

    // Contract storage
    #[derive(Default)]
    #[ink(storage)]
    pub struct Captcha<KEY: StorageKey = ManualKey<0xABCDEF01>> {
        providers: Mapping<AccountId, Provider>,
        provider_accounts: Mapping<ProviderCategory, BTreeSet<AccountId>>,
        urls: Mapping<Hash, AccountId>, // url hash mapped to provider account
        dapps: Mapping<AccountId, Dapp>,
        dapp_contracts: Lazy<BTreeSet<AccountId>>,
        commits: Mapping<Hash, Commit>, // the commitments submitted by DappUsers
        users: Mapping<AccountId, User>,
        user_accounts: Lazy<BTreeSet<AccountId>>,
    }

    impl Captcha {
        /// Constructor
        #[ink(constructor, payable)]
        pub fn new() -> Result<Self, Error> {
            let result = Self::new_unguarded();
            let author = Self::get_admin(&result);
            let caller = Self::env().caller();
            if caller != author {
                return Err(Error::NotAuthor);
            }
            Ok(result)
        }

        #[ink(constructor)]
        pub fn new_panic() -> Self {
            let result = Self::new();
            if let Err(e) = result {
                panic!("{:?}", e);
            }
            result.unwrap()
        }

        fn new_unguarded() -> Self {
            Self {
                providers: Default::default(),
                provider_accounts: Default::default(),
                urls: Default::default(),
                users: Default::default(),
                dapps: Default::default(),
                dapp_contracts: Default::default(),
                user_accounts: Default::default(),
                commits: Default::default(),
            }
        }

        /// Get the git commit id from when this contract was built
        #[ink(message)]
        pub fn get_git_commit_id(&self) -> [u8; 20] {
            config::get_git_commit_id()
        }

        /// the admin which can control this contract. set to author/instantiator by default
        #[ink(message)]
        pub fn get_admin(&self) -> AccountId {
            config::get_admin()
        }

        /// Get all payee options
        #[ink(message)]
        pub fn get_payees(&self) -> Vec<Payee> {
            vec![Payee::Dapp, Payee::Provider]
        }

        /// Get all dapp payee options
        #[ink(message)]
        pub fn get_dapp_payees(&self) -> Vec<DappPayee> {
            vec![DappPayee::Dapp, DappPayee::Provider, DappPayee::Any]
        }

        /// Get all status options
        #[ink(message)]
        pub fn get_statuses(&self) -> Vec<GovernanceStatus> {
            vec![GovernanceStatus::Active, GovernanceStatus::Inactive]
        }

        /// Get contract provider minimum stake default.
        #[ink(message)]
        pub fn get_provider_stake_threshold(&self) -> Balance {
            let env_provider_stake_threshold: Balance = 1000000000000000000;
            env_provider_stake_threshold
        }

        /// Get contract dapp minimum stake default.
        #[ink(message)]
        pub fn get_dapp_stake_threshold(&self) -> Balance {
            let env_dapp_stake_threshold: Balance = 1000000000000000000;
            env_dapp_stake_threshold
        }

        /// the maximum fee a provider can charge for a commit
        #[ink(message)]
        pub fn get_max_provider_fee(&self) -> u32 {
            let env_max_provider_fee: u32 = 1000000;
            env_max_provider_fee
        }

        /// the minimum number of providers needed for the contract to function
        #[ink(message)]
        pub fn get_min_num_active_providers(&self) -> u16 {
            let env_min_num_active_providers: u16 = 0;
            env_min_num_active_providers
        }

        /// the time to complete a block, 6 seconds by default
        #[ink(message)]
        pub fn get_block_time(&self) -> u16 {
            let env_block_time: u16 = 6;
            env_block_time
        }

        /// the max age of a commit for a user before it is removed from the history, in seconds
        #[ink(message)]
        pub fn get_max_user_history_age_seconds(&self) -> u32 {
            let env_max_user_history_age_seconds: u32 =
                30_u32.wrapping_mul(24).wrapping_mul(60).wrapping_mul(60); // 30 days in seconds
            env_max_user_history_age_seconds
        }

        /// the max number of commits stored for a single user
        #[ink(message)]
        pub fn get_max_user_history_len(&self) -> u16 {
            let env_max_user_history_len: u16 = 10;
            env_max_user_history_len
        }

        /// the max age of a commit for a user before it is removed from the history, in blocks
        #[ink(message)]
        pub fn get_max_user_history_age_blocks(&self) -> u32 {
            let env_max_user_history_age_blocks: u32 = Math::add_panic(
                Math::div_panic(
                    self.get_max_user_history_age_seconds(),
                    self.get_block_time() as u32,
                ),
                1,
            );
            env_max_user_history_age_blocks
        }

        /// Convert a vec of u8 into a Hash
        fn hash_vec_u8(&self, data: &Vec<u8>) -> Hash {
            let slice = data.as_slice();
            let mut hash_output = <Blake2x256 as HashOutput>::Type::default();
            <Blake2x256 as CryptoHash>::hash(slice, &mut hash_output);

            Hash::from(hash_output)
        }

        fn default_provider(&self) -> Provider {
            Provider {
                balance: Default::default(),
                url: Default::default(),
                fee: Default::default(),
                payee: Default::default(),
                dataset_id: Default::default(),
                dataset_id_content: Default::default(),
                status: Default::default(),
            }
        }

        fn default_dapp(&self) -> Dapp {
            Dapp {
                payee: Default::default(),
                status: Default::default(),
                owner: self.env().caller(),
                balance: Default::default(),
            }
        }

        /// Configure a provider
        fn provider_configure(&mut self, config: ProviderConfig) -> Result<(), Error> {
            let provider_account = self.env().caller();
            let lookup = self.providers.get(provider_account);
            let new = lookup.is_none();

            if new && config.should_exist {
                // error if the provider should already exist, but doesn't
                return err!(self, Error::ProviderDoesNotExist);
            }
            if !new && !config.should_exist {
                // error if the provider should not exist but does
                return err!(self, Error::ProviderExists);
            }

            let default_dataset_id = Hash::default();
            let old_provider = lookup.unwrap_or_else(|| self.default_provider());

            // setup the new provider with updated fields
            let mut new_provider = Provider {
                url: config.url.unwrap_or(old_provider.url.clone()),
                fee: config.fee.unwrap_or(old_provider.fee),
                payee: config.payee.unwrap_or(old_provider.payee),
                dataset_id: config.dataset_id.unwrap_or(old_provider.dataset_id),
                dataset_id_content: config
                    .dataset_id_content
                    .unwrap_or(old_provider.dataset_id_content),
                ..old_provider
            };

            // update the balance
            new_provider.balance += self.env().transferred_value();

            // if the provider is
            // not deactivating
            // has a balance >= provider_stake_threshold
            // has a dataset_id
            // has a dataset_id_content
            new_provider.status = if new_provider.balance >= self.get_provider_stake_threshold()
                && new_provider.dataset_id != default_dataset_id
                && new_provider.dataset_id_content != default_dataset_id
                && !config.deactivate
            {
                // then set the status to active
                GovernanceStatus::Active
            } else {
                // else set the status to deactivated
                GovernanceStatus::Inactive
            };

            // by here the new provider has been configured

            // proceed only if there has been a change
            if !new && old_provider == new_provider {
                // no need to update anything
                return Ok(());
            }

            // dataset content id cannot be equal to dataset id
            if new_provider.dataset_id != default_dataset_id
                && new_provider.dataset_id_content == new_provider.dataset_id
            {
                return err!(self, Error::DatasetIdSolutionsSame);
            }

            // check the fee is not too high
            if new_provider.fee > self.get_max_provider_fee() {
                return err!(self, Error::ProviderFeeTooHigh);
            }

            let old_url_hash = self.hash_vec_u8(&old_provider.url);
            let new_url_hash = self.hash_vec_u8(&new_provider.url);
            if old_url_hash != new_url_hash {
                // updating the url, so check whether the new origin is available
                if self.urls.contains(new_url_hash) {
                    return err!(self, Error::ProviderUrlUsed);
                } // else available

                self.urls.remove(old_url_hash);
                // don't record the default hash of the url as this is a special placeholder hash which is used elsewhere, e.g. in testing / setting up a dummy or default provider, so multiple providers may have this hash set
                if new_url_hash != default_dataset_id {
                    self.urls.insert(new_url_hash, &provider_account);
                }
            }

            self.providers.insert(provider_account, &new_provider);

            // update the category if status or payee has changed
            if new {
                self.provider_category_add(&new_provider, &provider_account)?;
            } else {
                let old_provider_category = old_provider.get_category();
                let new_provider_category = new_provider.get_category();
                if old_provider_category != new_provider_category {
                    self.provider_category_remove(&old_provider, &provider_account)?;
                    self.provider_category_add(&new_provider, &provider_account)?;
                }
            }

            Ok(())
        }

        /// Remove the provider from their state
        fn provider_category_remove(
            &mut self,
            provider: &Provider,
            provider_account: &AccountId,
        ) -> Result<(), Error> {
            let category = provider.get_category();
            let mut set = self.provider_accounts.get(category).unwrap_or_default();
            let removed = set.remove(provider_account);
            if !removed {
                // expected provider to be in set
                return err!(self, Error::ProviderAccountDoesNotExist);
            }
            self.provider_accounts.insert(category, &set);

            Ok(())
        }

        /// Add a provider to their state
        fn provider_category_add(
            &mut self,
            provider: &Provider,
            provider_account: &AccountId,
        ) -> Result<(), Error> {
            let category = provider.get_category();
            let mut set = self.provider_accounts.get(category).unwrap_or_default();
            let inserted = set.insert(*provider_account);
            if !inserted {
                // expected provider to not already be in set
                return err!(self, Error::ProviderAccountExists);
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
            self.provider_configure(ProviderConfig {
                url: Some(url),
                fee: Some(fee),
                payee: Some(payee),
                should_exist: false,
                ..Default::default()
            })
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
            self.provider_configure(ProviderConfig {
                url: Some(url),
                fee: Some(fee),
                payee: Some(payee),
                should_exist: true,
                ..Default::default()
            })
        }

        /// De-activate a provider by setting their status to Deactivated
        #[ink(message)]
        pub fn provider_deactivate(&mut self) -> Result<(), Error> {
            self.provider_configure(ProviderConfig {
                should_exist: true,
                deactivate: true,
                ..Default::default()
            })
        }

        /// Unstake and deactivate the provider's service, returning stake
        #[ink(message)]
        pub fn provider_deregister(&mut self) -> Result<(), Error> {
            let provider_account = self.env().caller();

            let provider = self.get_provider(provider_account)?;

            // remove the provider
            self.providers.remove(provider_account);

            // remove the provider from their category
            self.provider_category_remove(&provider, &provider_account)?;

            // return the stake
            let balance = provider.balance;
            if balance > 0 {
                self.env()
                    .transfer(provider_account, balance)
                    .map_err(|_| Error::TransferFailed)?;
            }

            Ok(())
        }

        /// Get an existing provider
        #[ink(message)]
        pub fn get_provider(&self, account: AccountId) -> Result<Provider, Error> {
            self.providers
                .get(account)
                .ok_or_else(err_fn!(self, Error::ProviderDoesNotExist))
        }

        /// Fund a provider
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_fund(&mut self) -> Result<(), Error> {
            self.provider_configure(ProviderConfig {
                should_exist: true,
                ..Default::default()
            })
        }

        /// Add a new data set
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_set_dataset(
            &mut self,
            dataset_id: Hash,
            dataset_id_content: Hash,
        ) -> Result<(), Error> {
            self.provider_configure(ProviderConfig {
                dataset_id: Some(dataset_id),
                dataset_id_content: Some(dataset_id_content),
                should_exist: true,
                ..Default::default()
            })
        }

        /// Get an existing dapp
        #[ink(message)]
        pub fn get_dapp(&self, contract: AccountId) -> Result<Dapp, Error> {
            self.dapps
                .get(contract)
                .ok_or_else(err_fn!(self, Error::DappDoesNotExist))
        }

        /// Check a dapp is owned by the caller
        fn check_dapp_owner_is_caller(&self, dapp: &Dapp) -> Result<(), Error> {
            let caller = self.env().caller();
            if dapp.owner != caller {
                return err!(self, Error::NotAuthorised);
            }

            Ok(())
        }

        /// Configure a dapp (existing or new)
        fn dapp_configure(&mut self, config: DappConfig) -> Result<(), Error> {
            let dapp_lookup = self.dapps.get(config.contract);
            let new = dapp_lookup.is_none();

            if new && config.should_exist {
                return err!(self, Error::DappDoesNotExist);
            }
            if !new && !config.should_exist {
                return err!(self, Error::DappExists);
            }

            let old_dapp = dapp_lookup.unwrap_or_else(|| self.default_dapp());
            let mut new_dapp = Dapp {
                payee: config.payee.unwrap_or(old_dapp.payee),
                owner: config.owner.unwrap_or(old_dapp.owner),
                ..old_dapp
            };

            // update the dapp funds
            new_dapp.balance += self.env().transferred_value();

            // update the dapp status
            new_dapp.status =
                if new_dapp.balance >= self.get_dapp_stake_threshold() && !config.deactivate {
                    GovernanceStatus::Active
                } else {
                    GovernanceStatus::Inactive
                };

            // by here the new dapp has been configured

            if !new && old_dapp == new_dapp {
                // nothing to do as no change
                return Ok(());
            }

            // check current contract for ownership
            if !new {
                self.check_dapp_owner_is_caller(&new_dapp)?;
            }

            // if the dapp is new then add it to the list of dapps
            if new {
                lazy!(self.dapp_contracts, insert, config.contract);
            }

            // update the dapp in the mapping
            self.dapps.insert(config.contract, &new_dapp);

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
            self.dapp_configure(DappConfig {
                contract,
                payee: Some(payee),
                should_exist: false,
                ..Default::default()
            })
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
            self.dapp_configure(DappConfig {
                contract,
                payee: Some(payee),
                owner: Some(owner),
                should_exist: true,
                ..Default::default()
            })
        }

        /// Fund dapp account to pay for services, if the Dapp caller is registered in self.dapps
        #[ink(message)]
        #[ink(payable)]
        pub fn dapp_fund(&mut self, contract: AccountId) -> Result<(), Error> {
            self.dapp_configure(DappConfig {
                contract,
                should_exist: true,
                ..Default::default()
            })
        }

        /// Cancel services as a dapp, returning remaining tokens
        #[ink(message)]
        pub fn dapp_deregister(&mut self, contract: AccountId) -> Result<(), Error> {
            let dapp = self.get_dapp(contract)?;

            // check current contract for ownership
            self.check_dapp_owner_is_caller(&dapp)?;

            let balance = dapp.balance;
            if balance > 0 {
                self.env()
                    .transfer(dapp.owner, balance)
                    .map_err(|_| Error::TransferFailed)?;
            }

            // remove the dapp
            self.dapps.remove(contract);
            lazy!(self.dapp_contracts, remove, &contract);

            Ok(())
        }

        /// Deactivate a dapp, leaving stake intact
        #[ink(message)]
        pub fn dapp_deactivate(&mut self, contract: AccountId) -> Result<(), Error> {
            self.dapp_configure(DappConfig {
                contract,
                deactivate: true,
                should_exist: true,
                ..Default::default()
            })
        }

        /// Trim the user history to the max length and age.
        /// Returns the history and expired hashes.
        fn trim_user_history(&self, mut history: Vec<Hash>) -> (Vec<Hash>, Vec<Hash>) {
            let block_number = self.env().block_number();
            let max_age = if block_number < self.get_max_user_history_age_blocks() {
                block_number
            } else {
                self.get_max_user_history_age_blocks()
            };
            let age_threshold = Math::sub_panic(block_number, max_age);
            let mut expired = Vec::new();
            // trim the history down to max length
            while history.len() > self.get_max_user_history_len().into() {
                let hash = history.pop().unwrap();
                expired.push(hash);
            }
            // trim the history down to max age
            while !history.is_empty()
                && self
                    .commits
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
        fn record_commitment(&mut self, user_account: AccountId, hash: Hash, result: &Commit) {
            let mut user = self.get_user_or_create(user_account);
            // add the new commitment
            self.commits.insert(hash, result);
            user.history.insert(0, hash);

            // trim the user history by len and age, removing any expired commitments
            let (history, expired) = self.trim_user_history(user.history);
            // update the user history to the in age / length window set of commitment hashes
            user.history = history;
            // remove the expired commitments
            for hash in expired.iter() {
                self.commits.remove(hash);
            }

            self.users.insert(user_account, &user);
        }

        #[ink(message)]
        pub fn get_user_history_summary(
            &self,
            user_account: AccountId,
        ) -> Result<UserHistorySummary, Error> {
            let user = self.get_user(user_account)?;
            let (history, _expired) = self.trim_user_history(user.history);

            let mut summary = UserHistorySummary {
                correct: 0,
                incorrect: 0,
                score: 0,
            };
            for hash in history.iter() {
                let result = self.commits.get(hash).unwrap();
                if result.status == CaptchaStatus::Approved {
                    summary.correct += 1;
                } else if result.status == CaptchaStatus::Disapproved {
                    summary.incorrect += 1;
                } else {
                    return Err(Error::InvalidCaptchaStatus);
                }
            }

            if Math::add(summary.correct, summary.incorrect)? == 0 {
                summary.score = 0;
            } else {
                // score is between 0 - 200, i.e. 0% - 100% in 0.5% increments
                let total: u16 = Math::add(summary.correct, summary.incorrect)?;
                let correct: u16 = Math::mul(summary.correct, 200)?;
                summary.score = Math::div(correct, total)? as u8;
            }

            Ok(summary)
        }

        /// Create a new dapp user if they do not already exist
        fn get_user_or_create(&mut self, user_account: AccountId) -> User {
            // return if already exists
            let lookup = self.users.get(user_account);
            if let Some(user) = lookup {
                return user;
            }

            // else build new
            let user = User {
                history: Default::default(),
            };
            self.users.insert(user_account, &user);
            lazy!(self.user_accounts, insert, user_account);
            user
        }

        /// Record a commit from a provider and user
        fn provider_record_commit(&mut self, commit: &Commit) -> Result<(), Error> {
            let caller = self.env().caller();
            let provider = self.get_provider(caller)?;
            let dapp = self.get_dapp(commit.dapp_contract)?;

            // ensure the provider is active
            self.check_provider_active(&provider)?;

            // ensure the dapp is active
            self.check_dapp_active(&dapp)?;

            // check commitment doesn't already exist
            if self.commits.get(commit.id).is_some() {
                return err!(self, Error::CommitAlreadyExists);
            }

            self.record_commitment(commit.user_account, commit.id, commit);

            self.pay_fee(caller, commit.dapp_contract)?;

            Ok(())
        }

        /// Provider submits a captcha solution commitment
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
            provider_account: AccountId,
            dapp_contract: AccountId,
        ) -> Result<(), Error> {
            // error if the provider is not found
            let mut provider = self.get_provider(provider_account)?;
            // error if the dapp is not found
            let mut dapp = self.get_dapp(dapp_contract)?;

            if provider.fee != 0 {
                let fee = Balance::from(provider.fee);
                if provider.payee == Payee::Provider {
                    dapp.balance -= fee;
                    provider.balance += fee;
                }
                if provider.payee == Payee::Dapp {
                    provider.balance -= fee;
                    dapp.balance += fee;
                }
                self.providers.insert(provider_account, &provider);
                self.dapps.insert(dapp_contract, &dapp);
            }
            Ok(())
        }

        /// Checks if the user is a human (true) as they have a solution rate higher than a % threshold or a bot (false)
        /// Threshold is decided by the calling user
        /// Threshold is between 0-200, i.e. 0-100% in 0.5% increments. E.g. 100 = 50%, 200 = 100%, 0 = 0%, 50 = 25%, etc.
        #[ink(message)]
        pub fn dapp_operator_is_human_user(
            &self,
            user_account: AccountId,
            threshold: u8,
        ) -> Result<bool, Error> {
            Ok(self.get_user_history_summary(user_account)?.score > threshold)
        }

        /// Get the last correct captcha for a user
        #[ink(message)]
        pub fn dapp_operator_last_correct_captcha(
            &self,
            user_account: AccountId,
        ) -> Result<LastCorrectCaptcha, Error> {
            let user = self.get_user(user_account)?;
            let (history, _expired) = self.trim_user_history(user.history);
            let mut last_correct_captcha = None;
            for hash in history {
                let entry = self.commits.get(hash).unwrap();
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
                before: Math::sub(self.env().block_number(), last_correct_captcha.completed_at)?,
                dapp_contract: last_correct_captcha.dapp_contract,
            })
        }

        fn check_dapp_active(&self, dapp: &Dapp) -> Result<(), Error> {
            if dapp.status != GovernanceStatus::Active {
                return err!(self, Error::DappInactive);
            }
            // Make sure the Dapp can pay the transaction fees of the user and potentially the
            // provider, if their fee > 0
            if dapp.balance < self.get_dapp_stake_threshold() {
                return err!(self, Error::DappInsufficientFunds);
            }
            Ok(())
        }

        fn check_provider_active(&self, provider: &Provider) -> Result<(), Error> {
            if provider.status != GovernanceStatus::Active {
                return err!(self, Error::ProviderInactive);
            }
            if provider.balance < self.get_provider_stake_threshold() {
                return err!(self, Error::ProviderInsufficientFunds);
            }
            Ok(())
        }

        /// Get a dapp user
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_user(&self, user_account: AccountId) -> Result<User, Error> {
            self.users
                .get(user_account)
                .ok_or_else(err_fn!(self, Error::DappUserDoesNotExist))
        }

        /// Get a solution commitment
        ///
        /// Returns an error if the commitment does not exist
        #[ink(message)]
        pub fn get_commit(&self, commit_id: Hash) -> Result<Commit, Error> {
            self.commits
                .get(commit_id)
                .ok_or_else(err_fn!(self, Error::CommitDoesNotExist))
        }

        /// List providers given an array of account id
        ///
        /// Returns empty if none were matched
        #[ink(message)]
        pub fn list_providers_by_accounts(
            &self,
            provider_accounts: Vec<AccountId>,
        ) -> Result<Vec<Provider>, Error> {
            let mut providers = Vec::new();
            for provider_account in provider_accounts {
                let provider = self.providers.get(provider_account);
                if provider.is_none() {
                    continue;
                }
                providers.push(provider.unwrap());
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
                    let providers_set = self
                        .provider_accounts
                        .get(ProviderCategory { status, payee });
                    if providers_set.is_none() {
                        continue;
                    }
                    let provider_accounts = providers_set.unwrap().into_iter().collect();
                    providers.append(&mut self.list_providers_by_accounts(provider_accounts)?);
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
            dapp_contract: AccountId,
        ) -> Result<RandomProvider, Error> {
            let dapp = self.get_dapp(dapp_contract)?;
            self.check_dapp_active(&dapp)?;
            let status = GovernanceStatus::Active;
            let active_providers;
            let mut index: u128;
            if dapp.payee == DappPayee::Any {
                // Get the active providers for which the payee is dapp
                let active_providers_initial = self
                    .provider_accounts
                    .get(ProviderCategory {
                        status,
                        payee: Payee::Dapp,
                    })
                    .unwrap_or_default();
                let mut max = active_providers_initial.len();

                // Get the active providers for which the payee is provider
                let active_providers_secondary = self
                    .provider_accounts
                    .get(ProviderCategory {
                        status,
                        payee: Payee::Provider,
                    })
                    .unwrap_or_default();

                // The max length of the active providers is the sum of the two
                max += active_providers_secondary.len();

                // If the max is 0, then there are no active providers
                if max == 0 {
                    return err!(self, Error::NoActiveProviders);
                }

                if max < self.get_min_num_active_providers() as usize {
                    return err!(self, Error::NotEnoughActiveProviders);
                }

                // Get a random number between 0 and max
                index = self.get_random_number(max as u128, user_account, dapp_contract);

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
                    .get(ProviderCategory { status, payee })
                    .unwrap_or_default();

                // If the length is 0, then there are no active providers
                if active_providers.is_empty() {
                    return err!(self, Error::NoActiveProviders);
                }

                if active_providers.len() < self.get_min_num_active_providers() as usize {
                    return err!(self, Error::NotEnoughActiveProviders);
                }

                // Get a random number between 0 and the length of the active providers
                index = self.get_random_number(
                    active_providers.len() as u128,
                    user_account,
                    dapp_contract,
                );
            }

            let provider_account = active_providers.into_iter().nth(index as usize).unwrap();
            let provider = self.get_provider(provider_account)?;

            Ok(RandomProvider {
                provider_account,
                provider,
                block_number: self.env().block_number(),
            })
        }

        /// Get the AccountIds of all Providers ever registered
        ///
        /// Returns {Vec<AccountId>}
        #[ink(message)]
        pub fn get_all_provider_accounts(&self) -> Result<Vec<AccountId>, Error> {
            let mut provider_accounts = Vec::<AccountId>::new();
            for status in [GovernanceStatus::Active, GovernanceStatus::Inactive] {
                for payee in [Payee::Provider, Payee::Dapp] {
                    let providers_set = self
                        .provider_accounts
                        .get(ProviderCategory { status, payee });
                    if providers_set.is_none() {
                        continue;
                    }
                    provider_accounts.append(&mut providers_set.unwrap().into_iter().collect());
                }
            }
            Ok(provider_accounts)
        }

        /// Get a random number from 0 to `len` - 1 inclusive. The user account is added to the seed for additional random entropy.
        #[ink(message)]
        pub fn get_random_number(
            &self,
            len: u128,
            user_account: AccountId,
            dapp_contract: AccountId,
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
            let dapp_contract_bytes: &[u8; ACCOUNT_SIZE] = dapp_contract.as_ref();
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
                .copy_from_slice(dapp_contract_bytes);
            // hash to ensure small changes (e.g. in the block timestamp) result in large change in the seed
            let mut hash_output = <Blake2x128 as HashOutput>::Type::default();
            <Blake2x128 as CryptoHash>::hash(&bytes, &mut hash_output);
            // the random number can be derived from the hash
            let next = u128::from_le_bytes(hash_output);
            // use modulo to get a number between 0 (inclusive) and len (exclusive)
            // e.g. if len = 10 then range would be 0-9

            Math::rem_panic(next, len)
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
            let caller = self.env().caller();
            check_is_admin(caller)?;

            let transfer_result =
                ink::env::transfer::<ink::env::DefaultEnvironment>(caller, amount);
            if transfer_result.is_err() {
                return err!(self, Error::TransferFailed);
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
                        return err!(self, Error::CodeNotFound);
                    }
                    _ => {
                        return err!(self, Error::SetCodeHashFailed);
                    }
                }
            }
            Ok(())
        }

        /// Is the caller the admin for this contract?
        fn check_caller_admin(&self) -> Result<(), Error> {
            check_is_admin(self.env().caller())
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

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        const STAKE_THRESHOLD: u128 = 1000000000;

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
            let account = AccountId::from([
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ]);
            // fund the account so it exists if not already
            let balance = get_account_balance(account);
            if balance.is_err() {
                // account doesn't have the existential deposit so doesn't exist
                // give it funds to create it
                set_account_balance(account, 1);
            }
            account
        }

        /// get the nth provider account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_provider_account(index: u128) -> AccountId {
            get_account(PROVIDER_ACCOUNT_PREFIX, index)
        }

        /// get the nth dapp account. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_dapp_contract(index: u128) -> AccountId {
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
            let mut contract = Captcha::new_unguarded();
            // set the caller back to the unused acc
            set_caller(get_unused_account());
            // check the contract was created with the correct account
            assert_eq!(contract.env().account_id(), account);
            contract
        }

        #[ink::test]
        fn test_default_provider() {
            let contract = get_contract(0);
            let provider = contract.default_provider();
            assert_eq!(provider.payee, Payee::Dapp);
            assert_eq!(provider.status, GovernanceStatus::Inactive);
            assert_eq!(provider.fee, 0);
            assert_eq!(provider.balance, 0);
        }

        #[ink::test]
        fn test_default_dapp() {
            let contract = get_contract(0);
            let dapp = contract.default_dapp();
            assert_eq!(dapp.payee, DappPayee::Any);
            assert_eq!(dapp.status, GovernanceStatus::Inactive);
            assert_eq!(dapp.balance, 0);
        }

        #[ink::test]
        fn test_ctor_guard_pass() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            // only able to instantiate from the alice account
            set_caller(get_admin_account(0));
            let contract = Captcha::new();
            // should construct successfully
        }

        #[ink::test]
        fn test_ctor_guard_fail() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            // only able to instantiate from the alice account
            set_caller(default_accounts().bob);
            let contract = Captcha::new();
            assert_eq!(contract.unwrap_err(), Error::NotAuthor);
        }

        #[ink::test]
        fn test_ctor() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            // ctor params should be set
            assert_eq!(contract.get_provider_stake_threshold(), STAKE_THRESHOLD);
            assert_eq!(contract.get_dapp_stake_threshold(), STAKE_THRESHOLD);
            assert_eq!(contract.get_admin(), get_admin_account(0));
            assert_eq!(contract.get_max_user_history_len(), 10);
            assert_eq!(
                contract.get_max_user_history_age_seconds(),
                30 * 24 * 60 * 60
            ); // 30 days in seconds
            assert_eq!(
                contract.get_max_user_history_age_blocks(),
                30 * 24 * 60 * 60 / 6 + 1
            ); // 30 days in blocks
            assert_eq!(contract.get_block_time(), 6);
            assert_eq!(contract.get_min_num_active_providers(), 0);
            assert_eq!(contract.get_max_provider_fee(), 1000000);

            // default state should be set
            for payee in contract.get_payees().iter() {
                for status in contract.get_statuses().iter() {
                    assert_eq!(
                        contract.provider_accounts.get(ProviderCategory {
                            payee: *payee,
                            status: *status
                        }),
                        None
                    );
                }
            }
            assert_eq!(contract.dapp_contracts.get(), None);
            assert_eq!(contract.user_accounts.get(), None);
        }

        /// Test accounts are funded with existential deposit
        #[ink::test]
        fn test_accounts_funded() {
            let list: Vec<fn(u128) -> AccountId> = vec![
                get_admin_account,
                get_provider_account,
                get_dapp_contract,
                get_user_account,
                get_contract_account,
            ];
            for func in list.iter() {
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
            assert!(set.insert(*AsRef::<[u8; 32]>::as_ref(&get_admin_account(0))));

            // for each method of generating an account
            let list: Vec<fn(u128) -> AccountId> = vec![
                get_provider_account,
                get_dapp_contract,
                get_user_account,
                get_contract_account,
            ];
            for func in list.iter() {
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
            let admin = contract.get_admin();
            set_caller(admin); // an account which does have permission to call terminate

            let contract_account = contract.env().account_id();
            let bal = get_account_balance(contract_account).unwrap();
            let should_terminate = move || contract.terminate().unwrap();
            ink::env::test::assert_contract_termination::<ink::env::DefaultEnvironment, _>(
                should_terminate,
                admin,
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
            set_caller(contract.get_admin()); // use the admin acc
            let admin_bal: u128 = get_account_balance(contract.get_admin()).unwrap();
            let contract_bal: u128 = get_account_balance(contract.env().account_id()).unwrap();
            let withdraw_amount: u128 = 1;
            contract.withdraw(withdraw_amount).unwrap();
            assert_eq!(
                get_account_balance(contract.get_admin()).unwrap(),
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

            set_caller(contract.get_admin()); // use the admin acc
            let admin_bal = get_account_balance(contract.get_admin()).unwrap();
            let contract_bal = get_account_balance(contract.env().account_id()).unwrap();
            contract.withdraw(contract_bal + 1).unwrap(); // panics as bal would go below existential deposit
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
        fn test_ctor_caller_admin() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);

            // check the caller is admin
            assert_eq!(contract.get_admin(), get_admin_account(0));
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
            contract.provider_register(url, fee, Payee::Dapp).unwrap();
            assert!(contract.providers.get(provider_account).is_some());
            println!(
                "{}",
                contract
                    .provider_accounts
                    .get(ProviderCategory {
                        status: GovernanceStatus::Inactive,
                        payee: Payee::Provider
                    })
                    .unwrap_or_default()
                    .contains(&provider_account)
            );

            assert!(contract
                .provider_accounts
                .get(ProviderCategory {
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
            contract.provider_register(url, fee, Payee::Dapp).unwrap();
            assert!(contract.providers.get(provider_account).is_some());
            contract.provider_deactivate().unwrap();
            let provider_record = contract.providers.get(provider_account).unwrap();
            assert!(provider_record.status == GovernanceStatus::Inactive);
        }

        /// Test list providers
        #[ink::test]
        fn test_list_providers_by_accounts() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            let provider_account = AccountId::from([0x2; 32]);
            let url: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract.provider_register(url, fee, Payee::Dapp).unwrap();
            let registered_provider_account = contract.providers.get(provider_account);
            assert!(registered_provider_account.is_some());
            let returned_list = contract
                .list_providers_by_accounts(vec![provider_account])
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
        fn generate_provider_data(account: u8, port: &str, fee: u32) -> (AccountId, Vec<u8>, u32) {
            let provider_account = AccountId::from([account; 32]);
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
                .get(ProviderCategory {
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
            contract
                .provider_update(url.clone(), fee, Payee::Dapp)
                .unwrap();
            assert!(contract
                .provider_accounts
                .get(ProviderCategory {
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
                .get(ProviderCategory {
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
                .unwrap();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(url, fee, Payee::Provider).unwrap();
            contract.provider_deregister().unwrap();
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
                .unwrap();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(url, fee, Payee::Provider).unwrap();
            let root1 = str_to_hash("merkle tree".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            contract.provider_set_dataset(root1, root2).unwrap();
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

            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();
            assert!(contract.dapps.get(dapp_contract).is_some());
            let dapp = contract.dapps.get(dapp_contract).unwrap();
            assert_eq!(dapp.owner, caller);

            // account is marked as suspended as zero tokens have been paid
            assert_eq!(dapp.status, GovernanceStatus::Inactive);
            assert_eq!(dapp.balance, balance);
            assert!(contract
                .dapp_contracts
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
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();
            // check the dapp exists in the hashmap
            assert!(contract.dapps.get(dapp_contract).is_some());

            // check the various attributes are correct
            let dapp = contract.dapps.get(dapp_contract).unwrap();
            assert_eq!(dapp.owner, caller);

            // account is marked as active as balance is now positive
            assert_eq!(dapp.status, GovernanceStatus::Active);
            assert_eq!(dapp.balance, balance);
            assert!(contract
                .dapp_contracts
                .get()
                .unwrap()
                .contains(&dapp_contract));
        }

        /// Test dapp register and then update
        #[ink::test]
        fn test_dapp_register_and_update() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the call
            let balance_1 = STAKE_THRESHOLD;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_1);

            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // register the dapp
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();

            // check the dapp exists in the hashmap
            assert!(contract.dapps.get(dapp_contract).is_some());

            // check the various attributes are correct
            let dapp = contract.dapps.get(dapp_contract).unwrap();
            assert_eq!(dapp.owner, caller);

            // account is marked as active as tokens have been paid
            assert_eq!(dapp.status, GovernanceStatus::Active);
            assert_eq!(dapp.balance, balance_1);

            // Transfer tokens with the call
            let balance_2 = STAKE_THRESHOLD;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);

            // run the register function again for the same (caller, contract) pair, adding more
            // tokens
            contract
                .dapp_update(dapp_contract, DappPayee::Any, caller)
                .unwrap();

            // check the various attributes are correct
            let dapp = contract.dapps.get(dapp_contract).unwrap();

            // account is marked as active as tokens have been paid
            assert_eq!(dapp.status, GovernanceStatus::Active);
            assert_eq!(dapp.balance, balance_1 + balance_2);
            assert!(contract
                .dapp_contracts
                .get()
                .unwrap()
                .contains(&dapp_contract));
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
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();

            // Transfer tokens with the fund call
            let balance_2 = 200;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);
            contract.dapp_fund(dapp_contract).unwrap();

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

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the register call
            let balance = 200;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

            // register the dapp
            contract
                .dapp_register(contract_account, DappPayee::Dapp)
                .unwrap();

            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

            // Transfer tokens with the fund call
            contract.dapp_deregister(contract_account).unwrap();

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
            contract.provider_update(url, fee, Payee::Provider).unwrap();
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

            let provider = contract.providers.get(provider_account).unwrap();
            // can only add data set after staking
            contract.provider_set_dataset(root1, root2).unwrap();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();

            //Dapp User commit
            let user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());

            // Call from the provider account to mark the solution as approved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_account = user_root;
            contract
                .provider_commit(Commit {
                    dapp_contract,
                    dataset_id: user_root,
                    status: CaptchaStatus::Approved,
                    provider_account,
                    user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_account,
                    user_signature: [0x0; 64],
                })
                .unwrap();
            let commitment = contract.commits.get(solution_account).unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Approved);
            let new_dapp_balance = contract.get_dapp(dapp_contract).unwrap().balance;
            let new_provider_balance = contract.get_provider(provider_account).unwrap().balance;
            assert_eq!(balance - Balance::from(fee), new_dapp_balance);
            assert_eq!(balance + Balance::from(fee), new_provider_balance);

            // Now make sure that the provider cannot later set the solution to disapproved and make
            // sure that the dapp balance is unchanged

            let commit_result = contract.provider_commit(Commit {
                dapp_contract,
                dataset_id: user_root,
                status: CaptchaStatus::Disapproved,
                provider_account,
                user_account,
                completed_at: 0,
                requested_at: 0,
                id: solution_account,
                user_signature: [0x0; 64],
            });
            // expect to error due to duplicate solution id
            assert_eq!(commit_result, Err(Error::CommitAlreadyExists));
            let commitment = contract.commits.get(solution_account).unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Approved);
            assert_eq!(
                balance - Balance::from(fee),
                contract.get_dapp(dapp_contract).unwrap().balance
            );
            assert_eq!(
                balance + Balance::from(fee),
                contract.get_provider(provider_account).unwrap().balance
            );
        }

        /// Test provider cannot approve invalid solution id
        #[ink::test]
        fn test_provider_approve_invalid_account() {
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
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

            // can only add data set after staking
            contract.provider_set_dataset(root1, root2).unwrap();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

            //Dapp User commit
            let user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());

            // Call from the provider account to mark the wrong solution as approved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_account = str_to_hash("id that does not exist".to_string());

            let result = contract
                .provider_commit(Commit {
                    dapp_contract,
                    dataset_id: user_root,
                    status: CaptchaStatus::Approved,
                    provider_account,
                    user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_account,
                    user_signature: [0x0; 64],
                })
                .unwrap();
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
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();

            //Dapp User commit
            let user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());

            // Call from the provider account to mark the solution as disapproved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_account = user_root;
            contract
                .provider_commit(Commit {
                    dapp_contract,
                    dataset_id: user_root,
                    status: CaptchaStatus::Disapproved,
                    provider_account,
                    user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_account,
                    user_signature: [0x0; 64],
                })
                .unwrap();
            let commitment = contract.commits.get(solution_account).unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);
            let new_dapp_balance = contract.get_dapp(dapp_contract).unwrap().balance;
            let new_provider_balance = contract.get_provider(provider_account).unwrap().balance;
            assert_eq!(balance - Balance::from(fee), new_dapp_balance);
            assert_eq!(balance + Balance::from(fee), new_provider_balance);

            // Now make sure that the provider cannot later set the solution to approved
            let commit_result = contract.provider_commit(Commit {
                dapp_contract,
                dataset_id: user_root,
                status: CaptchaStatus::Approved,
                provider_account,
                user_account,
                completed_at: 0,
                requested_at: 0,
                id: solution_account,
                user_signature: [0x0; 64],
            }); // expect to error due to duplicate solution id
            assert_eq!(commit_result, Err(Error::CommitAlreadyExists));
            let commitment = contract.commits.get(solution_account).unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);
            assert_eq!(
                balance - Balance::from(fee),
                contract.get_dapp(dapp_contract).unwrap().balance
            );
            assert_eq!(
                balance + Balance::from(fee),
                contract.get_provider(provider_account).unwrap().balance
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
            contract.provider_set_dataset(root1, root2).unwrap();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();

            //Dapp User commit
            let user_account = AccountId::from([0x5; 32]);
            // Call from the Dapp User Account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(user_account);
            let user_root = str_to_hash("user merkle tree root".to_string());

            // Call from the provider account to mark the solution as disapproved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_account = user_root;
            contract
                .provider_commit(Commit {
                    dapp_contract,
                    dataset_id: user_root,
                    status: CaptchaStatus::Disapproved,
                    provider_account,
                    user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: solution_account,
                    user_signature: [0x0; 64],
                })
                .unwrap();
            let commitment = contract.commits.get(solution_account).unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);

            // Now make sure that the dapp user does not pass the human test
            let result = contract.dapp_operator_is_human_user(user_account, 80 * 2);
            assert!(!result.unwrap());
        }

        /// Test non-existent dapp account has zero balance
        #[ink::test]
        fn test_non_existent_dapp_contract_has_zero_balance() {
            let dapp_contract = AccountId::from([0x2; 32]);
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            contract.get_dapp(dapp_contract).unwrap_err();
        }

        /// Test non-existent provider account has zero balance
        #[ink::test]
        fn test_non_existent_provider_account_has_zero_balance() {
            let provider_account = AccountId::from([0x2; 32]);
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            contract.get_provider(provider_account).unwrap_err();
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
            contract
                .provider_register(url.clone(), fee, Payee::Dapp)
                .unwrap();
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(url, fee, Payee::Dapp).unwrap();
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            contract.provider_set_dataset(root1, root2).unwrap();
            let registered_provider_account = contract.providers.get(provider_account);
            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();
            let selected_provider =
                contract.get_random_active_provider(provider_account, dapp_contract);
            assert!(selected_provider.unwrap().provider == registered_provider_account.unwrap());
        }

        // // Test get random provider
        #[ink::test]
        fn test_get_random_active_provider_dapp_any() {
            // always set the caller to the unused account to start, avoid any mistakes with caller checks
            set_caller(get_unused_account());

            let mut contract = get_contract(0);
            let provider_account = AccountId::from([0x2; 32]);
            let user_account = AccountId::from([0x30; 32]);
            let url: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(url.clone(), fee, Payee::Provider)
                .unwrap();
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .provider_update(url.clone(), fee, Payee::Provider)
                .unwrap();
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            contract.provider_set_dataset(root1, root2).unwrap();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dapp a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Any)
                .unwrap();

            // Call from the user_account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(user_account);

            // Call as dapp user and get a random provider
            let selected_provider =
                contract.get_random_active_provider(user_account, dapp_contract);
            assert_eq!(
                selected_provider.unwrap().provider_account,
                provider_account
            );

            // Switch the provider payee to Dapp
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract.provider_update(url, fee, Payee::Dapp).unwrap();

            // Call from the user_account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(user_account);

            // Call as dapp user and get a random provider. Ensure that the provider is still
            // selected despite the payee change
            let selected_provider =
                contract.get_random_active_provider(user_account, dapp_contract);
            assert_eq!(
                selected_provider.unwrap().provider_account,
                provider_account
            );
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
            contract.provider_update(url, fee, Payee::Provider).unwrap();
            // can only add data set after staking
            contract.provider_set_dataset(root1, root2).unwrap();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();

            // Call from the provider account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);

            //Dapp User commit and approve
            let user_account = AccountId::from([0x5; 32]);
            let user_root1 = str_to_hash("user merkle tree root to approve".to_string());
            contract
                .provider_commit(Commit {
                    dapp_contract,
                    dataset_id: user_root1,
                    status: CaptchaStatus::Approved,
                    provider_account,
                    user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: user_root1,
                    user_signature: [0x0; 64],
                })
                .unwrap();

            // Get the commitment and make sure it is approved
            let commitment = contract.get_commit(user_root1).unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Approved);

            //Dapp User commit and disapprove
            let user_account = AccountId::from([0x5; 32]);
            let user_root2 = str_to_hash("user merkle tree root to disapprove".to_string());
            contract
                .provider_commit(Commit {
                    dapp_contract,
                    dataset_id: root2,
                    status: CaptchaStatus::Disapproved,
                    provider_account,
                    user_account,
                    completed_at: 0,
                    requested_at: 0,
                    id: user_root2,
                    user_signature: [0x0; 64],
                })
                .unwrap();

            // Get the commitment and make sure it is disapproved
            let commitment = contract.get_commit(user_root2).unwrap();
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
            contract.provider_update(url, fee, Payee::Provider).unwrap();
            // can only add data set after staking
            contract.provider_set_dataset(root1, root2).unwrap();

            // Register the dapp
            let user_account = AccountId::from([0x3; 32]);
            let dapp_contract = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

            // Call from the dapp_contract
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_contract);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract
                .dapp_register(dapp_contract, DappPayee::Dapp)
                .unwrap();

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
            contract.provider_update(url, fee, Payee::Provider).unwrap();
            // can only add data set after staking
            contract.provider_set_dataset(root1, root2).unwrap();

            // Call from user_commit from provider_account2 to supply a commit for provider_account
            // Should not be authorised
            let user_account = AccountId::from([0x6; 32]);
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
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from([0x3; 32]));

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
