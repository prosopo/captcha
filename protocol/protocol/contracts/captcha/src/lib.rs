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

/// Print and return an error in ink
macro_rules! print_err {
    ($self_:ident, $err:expr) => {{
        ink::env::debug_println!(
            "ERROR: 
    type: {:?}
    block: {:?}
    caller: {:?}
",
            $err,
            $self_.env().block_number(),
            $self_.env().caller(),
        );
        $err
    }};
}

macro_rules! err {
    ($self_:ident, $err:expr) => {{
        print_err!($self_, $err);
        Err($err)
    }};
}

macro_rules! err_fn {
    ($self_:ident, $err:expr) => {
        || print_err!($self_, $err)
    };
}

macro_rules! lazy {
    ($lazy:expr, $func:ident, $value:expr) => {
        let mut contents = $lazy.get_or_default();
        contents.$func($value);
        $lazy.set(&contents);
    };
}

#[ink::contract]
pub mod captcha {

    const AUTHOR: [u8; 32] = [
        212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133, 88,
        133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
    ];

    use ink::env::debug_println as debug;
    use ink::env::hash::{Blake2x128, Blake2x256, CryptoHash, HashOutput};
    use ink::prelude::collections::btree_map::BTreeMap;
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

    /// RandomActiveProvider is selected randomly by the contract for the client side application
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct RandomActiveProvider {
        provider_account: AccountId,
        provider: Provider,
        block_number: u32,
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
    /// Record of when a provider changes and at what block
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderRecord {
        pub provider: Option<Provider>, // the provider snapshot. None if deleted.
    }
    /// Record of when a dapp changes and at what block
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct DappRecord {
        pub dapp: Option<Dapp>, // the dapp snapshot. None if deleted.
    }
    /// Record of when a dapp changes and at what block
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct AccountBlockId {
        pub block: BlockNumber,
        pub account: AccountId,
    }

    pub type Seed = u128;
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
        max_user_history_age: BlockNumber, // the max age, in blocks, of captcha results to store in history for a user
        min_num_active_providers: u16, // the minimum number of active providers required to allow captcha services
        max_provider_fee: Balance,
        seed: Seed,                                  // the current seed for rng
        seed_at: BlockNumber,                        // the block at which the seed was set
        seed_log: Lazy<BTreeMap<BlockNumber, u128>>, // the history of seeds for rng
        rewind_window: u8, // the number of blocks in the past that the rng can be replayed/rewinded
        provider_account_log: Mapping<BlockNumber, BTreeSet<AccountId>>, // log of what accounts changed at which block
        provider_log: Mapping<AccountBlockId, ProviderRecord>, // log of provider changes for a given account
        dapp_account_log: Mapping<BlockNumber, BTreeSet<AccountId>>, // log of what accounts changed at which block
        dapp_log: Mapping<AccountBlockId, DappRecord>, // log of dapp changes for a given account
        logs_pruned_at: BlockNumber, // the last block that the provider logs were pruned
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
        /// Returned if block is in the future
        BlockInFuture,
        /// Returned if block is too far in the past
        BlockOutsideRewindWindow,
        /// Returned if the url is empty, which is not allowed
        UrlEmpty,
    }

    impl Captcha {
        /// Constructor
        #[ink(constructor, payable)]
        pub fn new(
            provider_stake_threshold: Balance,
            dapp_stake_threshold: Balance,
            max_user_history_len: u16,
            max_user_history_age: BlockNumber,
            min_num_active_providers: u16,
            max_provider_fee: Balance,
            rewind_window: u8,
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
                rewind_window,
            )
        }

        fn new_unguarded(
            provider_stake_threshold: Balance,
            dapp_stake_threshold: Balance,
            max_user_history_len: u16,
            max_user_history_age: BlockNumber,
            min_num_active_providers: u16,
            max_provider_fee: Balance,
            rewind_window: u8,
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
                seed_log: Default::default(),
                seed: 0,
                seed_at: 0,
                rewind_window,
                provider_account_log: Default::default(),
                provider_log: Default::default(),
                dapp_account_log: Default::default(),
                dapp_log: Default::default(),
                logs_pruned_at: 0,
            }
        }

        #[ink(message)]
        pub fn get_seeds(&self) -> BTreeMap<BlockNumber, Seed> {
            let mut seeds = self.seed_log.get_or_default().clone();
            seeds.insert(self.env().block_number(), self.seed);
            seeds
        }

        #[ink(message)]
        pub fn get_admin(&self) -> AccountId {
            self.admin
        }

        #[ink(message)]
        pub fn get_max_provider_fee(&self) -> u32 {
            self.max_provider_fee as u32
        }

        #[ink(message)]
        pub fn get_min_num_active_providers(&self) -> u16 {
            self.min_num_active_providers
        }

        #[ink(message)]
        pub fn get_rewind_window(&self) -> u8 {
            self.rewind_window
        }

        #[ink(message)]
        pub fn get_max_user_history_len(&self) -> u16 {
            self.max_user_history_len
        }

        #[ink(message)]
        pub fn get_max_user_history_age(&self) -> BlockNumber {
            self.max_user_history_age
        }

        #[ink(message)]
        pub fn get_random_active_provider(
            &self,
            user_account: AccountId,
            dapp_account: AccountId,
        ) -> Result<RandomActiveProvider, Error> {
            self.get_random_active_provider_at(
                user_account,
                dapp_account,
                self.env().block_number(),
            )
        }

        pub fn get_random_active_provider_at(
            &self,
            user_account: AccountId,
            dapp_account: AccountId,
            block: BlockNumber,
        ) -> Result<RandomActiveProvider, Error> {
            let account = self.get_random_active_provider_account_at(
                user_account,
                dapp_account,
                self.env().block_number(),
            )?;
            let provider = self.get_provider_at(account, self.env().block_number())?;
            Ok(RandomActiveProvider {
                provider_account: account,
                provider,
                block_number: block,
            })
        }

        /// Get a random active provider at a block given a user and dapp
        fn get_random_active_provider_account_at(
            &self,
            user_account: AccountId,
            dapp_account: AccountId,
            block: BlockNumber,
        ) -> Result<AccountId, Error> {
            // check if the dapp was active at the given block
            let dapp = self.get_dapp_at(dapp_account, block)?;
            if dapp.status != GovernanceStatus::Active {
                return err!(self, Error::DappInactive);
            }
            // get the seed which is based on the user, block, dapp and seed at the block
            let seed = self.get_seed_at_user_dapp(user_account, dapp_account, block)?;
            // get the providers which were active at the block
            let active_providers = self.get_active_providers_at(block);

            // pick a random provider from the active providers
            let mut active_provider_count = 0 as u128;
            for (_, group) in active_providers.iter() {
                active_provider_count += group.len() as u128;
            }
            let mut index = seed % active_provider_count;
            for (_, group) in active_providers.iter() {
                if index < group.len() as u128 {
                    let account = group.iter().nth(index as usize).unwrap();
                    return Ok(*account);
                }
                index -= group.len() as u128;
            }
            return err!(self, Error::NoActiveProviders);
        }

        /// Get a seed for a user and dapp at a block
        fn get_seed_at_user_dapp(
            &self,
            user_account: AccountId,
            dapp_account: AccountId,
            block: BlockNumber,
        ) -> Result<u128, Error> {
            let seed = self.get_seed_at(block)?;

            // hash the account, block and seed
            let seed_value_bytes: [u8; 16] = seed.to_le_bytes();
            let block_number_bytes: [u8; 4] = block.to_le_bytes();
            let user_account_bytes: &[u8; 32] = user_account.as_ref();
            let dapp_account_bytes: &[u8; 32] = dapp_account.as_ref();
            // pack all the data into a single byte array
            let mut bytes: [u8; 16 + 4 + 32 + 32] = [0u8; 16 + 4 + 32 + 32];
            bytes[0..16].copy_from_slice(&seed_value_bytes[..]);
            bytes[16..20].copy_from_slice(&block_number_bytes[..]);
            bytes[20..52].copy_from_slice(&user_account_bytes[..]);
            bytes[52..74].copy_from_slice(&dapp_account_bytes[..]);
            // hash to ensure small changes (e.g. in the block timestamp) result in large change in the seed
            let mut hash_output = <Blake2x128 as HashOutput>::Type::default();
            <Blake2x128 as CryptoHash>::hash(&bytes, &mut hash_output);
            // the random number can be derived from the hash
            Ok(u128::from_le_bytes(hash_output))
        }

        /// Rewind the providers to a given block
        ///
        /// Returns the active providers mapped by their payee type. The values are housed in a set to ensure account ids are sorted. The account ids may become out of order when applying changes from a past block, hence the need to store them in a stored fashion.
        fn get_active_providers_at(
            &self,
            block: BlockNumber,
        ) -> BTreeMap<Payee, BTreeSet<AccountId>> {
            // make a mapping of payee to provider accounts
            let mut result: BTreeMap<Payee, BTreeSet<AccountId>> = BTreeMap::new();
            for payee in self.get_payees().iter() {
                result.insert(*payee, BTreeSet::new());
            }
            // go through the rewind window from the target block to the current block looking for the version of provider closest to the target block
            // we want to get the version of provider closest to the target block. E.g. if we have versions of provider for blocks 7, 11 and 19 and the target block is 9, we want the version at block 11. The version at block 7 is too early so we ignore it. The version at block 19 is too late so we ignore it. The version at block 11 is the version which was the state of the provider in block 9.
            let current_block = self.env().block_number();
            let mut found: BTreeSet<AccountId> = BTreeSet::new();
            for at_block in block..=current_block {
                // get the list of provider accounts that changed in this block
                let mut accounts = self.provider_account_log.get(&at_block).unwrap_or_default();
                // remove any accounts we've already found a version for
                accounts.retain(|account| !found.contains(account));
                // for each provider which changed
                for account in accounts.iter() {
                    // get the provider at this block
                    let record = self
                        .provider_log
                        .get(&AccountBlockId {
                            account: *account,
                            block: at_block,
                        })
                        .unwrap();
                    if let Some(provider) = record.provider {
                        // use the provider status to put it into the right group by payee
                        if provider.status == GovernanceStatus::Active {
                            result.get_mut(&provider.payee).unwrap().insert(*account);
                        }
                    } // else provider was deleted, so do not add to a group
                      // tick off that we've found a version of this provider for the block target
                    found.insert(*account);
                }
            }

            // any provider accounts which have not been found in the logs need to use the current version of the provider
            for payee in self.get_payees().iter() {
                let mut accounts = self
                    .provider_accounts
                    .get(ProviderState {
                        payee: *payee,
                        status: GovernanceStatus::Active,
                    })
                    .unwrap_or_default();
                // remove any accounts we've already found a version for
                accounts.retain(|account| !found.contains(account));
                for account in accounts.iter() {
                    // else use the current version of this provider
                    let provider = self.providers.get(account).unwrap();
                    if provider.status == GovernanceStatus::Active {
                        // now we have found a version of the provider from the current block
                        result.get_mut(&provider.payee).unwrap().insert(*account);
                    }
                }
            }

            // at this point, all providers which we active between the target block and the current block have been found and added to the found map. Likewise, all providers which were active and have stayed active, thus having no log records, have also been added.

            return result;
        }

        /// Get the block at which the rewind window begins
        fn get_rewind_window_start(&self) -> BlockNumber {
            let block = self.env().block_number();
            let window = self.rewind_window as BlockNumber;
            if block > window {
                block - window
            } else {
                0
            }
        }

        fn get_provider_at(
            &self,
            account: AccountId,
            block: BlockNumber,
        ) -> Result<Provider, Error> {
            self.check_inside_rewind_window(block)?;

            // start with the current state of the provider as the most recent record
            let mut result: ProviderRecord = ProviderRecord {
                provider: self.providers.get(&account),
            };
            let current_block = self.env().block_number();

            // go back through the records in newest to oldest order
            for at_block in (block..=current_block).rev() {
                let record = self.provider_log.get(AccountBlockId {
                    account,
                    block: at_block,
                });
                if let Some(record) = record {
                    // found a record of the provider
                    result = record;
                }
            }

            result.provider.clone().ok_or(Error::ProviderDoesNotExist)
        }

        fn get_dapp_at(&self, account: AccountId, block: BlockNumber) -> Result<Dapp, Error> {
            self.check_inside_rewind_window(block)?;

            // start with the current state of the provider as the most recent record
            let mut result: DappRecord = DappRecord {
                dapp: self.dapps.get(&account),
            };
            let current_block = self.env().block_number();

            // go back through the records in newest to oldest order
            for at_block in (block..=current_block).rev() {
                let record = self.dapp_log.get(AccountBlockId {
                    account,
                    block: at_block,
                });
                if let Some(record) = record {
                    // found a record of the dapp
                    result = record;
                }
            }

            result.dapp.ok_or(Error::DappDoesNotExist)
        }

        fn check_inside_rewind_window(&self, block_number: BlockNumber) -> Result<(), Error> {
            let start = self.get_rewind_window_start();
            if block_number < start {
                return Err(Error::BlockOutsideRewindWindow);
            } else if block_number > self.env().block_number() {
                return Err(Error::BlockInFuture);
            }
            Ok(())
        }

        fn get_seed_at(&self, block_number: BlockNumber) -> Result<u128, Error> {
            self.check_inside_rewind_window(block_number)?;

            let mut result = &self.seed;

            let seed_log = self.seed_log.get_or_default();
            // loop through log from most recent to oldest
            for (block, seed) in seed_log.iter().rev() {
                if block <= &block_number {
                    // update result if within block threshold
                    result = seed;
                } else {
                    // hit block threshold, stop looping
                    break;
                }
            }
            Ok(*result)
        }

        fn get_seed(&self) -> u128 {
            self.seed
        }

        /// Update the seed
        #[ink(message)]
        pub fn update_seed(&mut self) -> Result<bool, Error> {
            let block_number = self.env().block_number();

            let seed_at = self.seed_at;
            if seed_at == block_number {
                // seed already updated for this block
                // disallow updating the seed for the same block twice to avoid spamming
                return Ok(false);
            }
            // else seed has not been updated for the current block

            let caller = self.env().caller();

            // only providers or admin can call this function
            if self.admin != caller {
                let provider = self.providers.get(caller).ok_or_else(err_fn!(self, Error::NotAuthorised))?;
                // only active providers can call this method
                if provider.status != GovernanceStatus::Active {
                    return err!(self, Error::ProviderInactive);
                }
            }

            // put the old seed into the log
            let mut seed_log = self.seed_log.get_or_default();
            // prune the seed log as old entries may have become too old and land outside the rewind_window window
            // split the tree into two parts, one with elements older than the threshold block and the other with elements newer than (or equal to) the threshold block
            // retain the newer elements
            seed_log = seed_log.split_off(&self.get_rewind_window_start());

            // add the current seed to the log
            let seed = self.seed;
            seed_log.insert(seed_at, seed);

            // then compute new seed value
            // what to use in the seed?
            // block number - different value for each block
            // block timestamp - unpredictable until the block is mined (but can be predicted by miners)
            // caller - unpredictable, we don't know who's going to update the seed and when
            // old seed - build upon the old seed

            // hash all of these together to get the new seed value
            let block_timestamp = self.env().block_timestamp();
            let mut input = [0u8; 60];
            let caller_bytes: &[u8; 32] = AsRef::<[u8; 32]>::as_ref(&caller);
            input[0..32].copy_from_slice(&caller_bytes[..]);
            input[32..36].copy_from_slice(&block_number.to_le_bytes()[..]);
            input[36..44].copy_from_slice(&block_timestamp.to_le_bytes()[..]);
            input[44..60].copy_from_slice(&seed.to_le_bytes()[..]);

            let hash = self.env().hash_bytes::<Blake2x128>(&input);
            // convert hash to u128 for the new seed value
            let new_seed_value = u128::from_le_bytes(hash);

            // update seed and history
            self.seed = new_seed_value;
            self.seed_at = block_number;

            self.seed_log.set(&seed_log);

            Ok(true)
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

        fn account_id_bytes<'a>(&'a self, account: &'a AccountId) -> &[u8; 32] {
            AsRef::<[u8; 32]>::as_ref(account)
        }

        fn validate_commit(&self, commit: &Commit) -> Result<(), Error> {
            // pull out commit fields into a byte array (the payload)
            // field sizes:
            // pub struct Commit {
            //     id: Hash, // 32
            //     user: AccountId, //32
            //     dataset_id: Hash, // 32
            //     status: CaptchaStatus, // 1
            //     dapp: AccountId, // 32
            //     provider: AccountId, // 32
            //     requested_at: BlockNumber, // 4
            //     completed_at: BlockNumber, // 4
            //     user_signature_part1: [u8; 32], // ignored
            //     user_signature_part2: [u8; 32], // ignored
            // }
            let mut payload = [0u8;
                32 // id
                + 32 // user_account
                + 32 // dataset_id
                + 1 // status
                + 32 // dapp_account
                + 32 // provider_account
                + 4 // requested_at
                + 4 // completed_at
            ];
            payload[..32].copy_from_slice(&commit.id.as_ref()[..]);
            payload[32..64].copy_from_slice(self.account_id_bytes(&commit.user));
            payload[64..96].copy_from_slice(&commit.dataset_id.as_ref()[..]);
            payload[96] = commit.status as u8;
            payload[97..129].copy_from_slice(self.account_id_bytes(&commit.dapp));
            payload[129..161].copy_from_slice(self.account_id_bytes(&commit.provider));
            payload[161..165].copy_from_slice(&commit.requested_at.to_le_bytes());
            payload[165..169].copy_from_slice(&commit.completed_at.to_le_bytes());

            // concat the user signature
            let mut user_signature = [0u8; 64];
            user_signature[..32].copy_from_slice(&commit.user_signature_part1);
            user_signature[32..64].copy_from_slice(&commit.user_signature_part2);

            // verify the user signature against the payload, i.e. ensure the user accepted the commitment data (e.g. that it was approved / disapproved), signed it, and returned it to the provider
            let mut user_account_bytes = [0u8; 32];
            user_account_bytes.copy_from_slice(self.account_id_bytes(&commit.user));

            let res = self
                .env()
                .sr25519_verify(&user_signature, &payload, &user_account_bytes);

            if res.is_err() {
                return err!(self, Error::VerifyFailed);
            }

            Ok(())
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
                return err!(self, Error::ProviderFeeTooHigh);
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
            let lookup = self.providers.get(provider_account);
            let new = lookup.is_none();
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

            // setup the new provider with updated fields
            if new {
                self.provider_state_insert(&old_provider, &provider_account)?;
            }
            let mut new_provider = Provider {
                url: url.unwrap_or(old_provider.url.clone()),
                fee: fee.unwrap_or(old_provider.fee),
                payee: payee.unwrap_or(old_provider.payee),
                dataset_id: dataset_id.unwrap_or(old_provider.dataset_id),
                dataset_id_content: dataset_id_content
                    .unwrap_or(old_provider.dataset_id_content),
                ..old_provider
            };

            new_provider.balance += self.env().transferred_value();

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

            // by here the new provider has been configured

            // proceed only if there has been a change
            if !new && old_provider == new_provider {
                // no need to update anything
                return Ok(());
            }

            // url cannot be empty
            if new_provider.url.is_empty() {
                return err!(self, Error::UrlEmpty);
            }

            // dataset content id cannot be equal to dataset id
            if new_provider.dataset_id != default_dataset_id
                && new_provider.dataset_id_content == new_provider.dataset_id
            {
                return err!(self, Error::DatasetIdSolutionsSame);
            }

            // update the dataset mapping to provider
            // remove old mapping
            self.datasets.remove(old_provider.dataset_id);
            if new_provider.dataset_id != default_dataset_id {
                // insert new mapping if not the default hash, as this is used as a placeholder value
                self.datasets
                    .insert(new_provider.dataset_id, &provider_account);
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
            if old_provider.status != new_provider.status
                || old_provider.payee != new_provider.payee
            {
                self.provider_state_remove(&old_provider, &provider_account)?;
                self.provider_state_insert(&new_provider, &provider_account)?;
            }

            // record the old provider in the log
            self.log_provider(
                provider_account,
                if new { None } else { Some(old_provider) },
            );

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
                return err!(self, Error::ProviderDoesNotExist);
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
                return err!(self, Error::ProviderExists);
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
            if self.providers.get(self.env().caller()).is_some() {
                return err!(self, Error::ProviderExists);
            }

            let result = self.provider_configure(Some(url), Some(fee), Some(payee), true, None, None);

            // update the seed
            self.update_seed()?;

            result
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
                return err!(self, Error::ProviderDoesNotExist);
            }

            let result = self.provider_configure(Some(url), Some(fee), Some(payee), false, None, None);

            // update the seed
            self.update_seed()?;

            result
        }

        /// De-activate a provider by setting their status to Deactivated
        #[ink(message)]
        pub fn provider_deactivate(&mut self) -> Result<(), Error> {
            // Change status to deactivated
            let result = self.provider_configure(None, None, None, true, None, None);

            // update the seed
            self.update_seed()?;

            result
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

            // update the log
            self.log_provider(provider_account, None);

            // update the seed
            self.update_seed()?;

            Ok(())
        }

        fn log_provider(&mut self, account: AccountId, provider: Option<Provider>) {
            // prune the logs before adding to them
            self.prune_logs();
            // add the provider record
            self.provider_log.insert(
                AccountBlockId {
                    account,
                    block: self.env().block_number(),
                },
                &ProviderRecord { provider },
            );
            // record that this account has changed
            let mut group = self
                .provider_account_log
                .get(self.env().block_number())
                .unwrap_or_default();
            group.insert(account);
            self.provider_account_log
                .insert(self.env().block_number(), &group);
        }

        fn log_dapp(&mut self, account: AccountId, dapp: Option<Dapp>) {
            // prune the logs before adding to them
            self.prune_logs();
            // add the dapp record
            self.dapp_log.insert(
                AccountBlockId {
                    account,
                    block: self.env().block_number(),
                },
                &DappRecord { dapp },
            );
            // record that this account has changed
            let mut group = self
                .dapp_account_log
                .get(self.env().block_number())
                .unwrap_or_default();
            group.insert(account);
            self.dapp_account_log
                .insert(self.env().block_number(), &group);
        }

        fn prune_logs(&mut self) {
            let last = self.logs_pruned_at;
            let start = self.get_rewind_window_start();
            // for all records which land outside the rewind window, remove them. E.g. between the last prune and the start of the rewind window
            for block in last..start {
                let provider_accounts = self.provider_account_log.take(block).unwrap_or_default();
                let dapp_accounts = self.dapp_account_log.take(block).unwrap_or_default();
                for account in provider_accounts {
                    self.provider_log.remove(AccountBlockId { account, block });
                }
                for account in dapp_accounts {
                    self.dapp_log.remove(AccountBlockId { account, block });
                }
            }
            self.logs_pruned_at = self.env().block_number();
        }

        fn get_provider(&self, account: AccountId) -> Result<Provider, Error> {
            self.providers
                .get(account)
                .ok_or_else(err_fn!(self, Error::ProviderDoesNotExist))
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
                return err!(self, Error::InvalidContract);
            }

            Ok(())
        }

        /// Get an existing dapp
        fn get_dapp(&self, contract: AccountId) -> Result<Dapp, Error> {
            self.dapps
                .get(contract)
                .ok_or_else(err_fn!(self, Error::DappDoesNotExist))
        }

        /// Check a dapp is missing / non-existent
        fn check_dapp_does_not_exist(&self, contract: AccountId) -> Result<(), Error> {
            if self.dapps.get(contract).is_some() {
                return err!(self, Error::DappExists);
            }

            Ok(())
        }

        /// Check a dapp is owned by the caller
        fn check_dapp_owner_is_caller(&self, contract: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            let dapp = self.get_dapp(contract)?;
            if dapp.owner != caller {
                return err!(self, Error::NotAuthorised);
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
            let mut new_dapp = Dapp {
                payee: payee.unwrap_or(old_dapp.payee),
                owner: owner.unwrap_or(old_dapp.owner),
                ..old_dapp
            };

            // update the dapp funds
            new_dapp.balance += self.env().transferred_value();

            // update the dapp status
            new_dapp.status = if new_dapp.balance >= self.dapp_stake_threshold && !deactivate {
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
                self.check_dapp_owner_is_caller(contract)?;
            }

            // if the dapp is new then add it to the list of dapps
            if new {
                lazy!(self.dapp_accounts, insert, contract);
            }

            // update the dapp in the mapping
            self.dapps.insert(contract, &new_dapp);

            // update the log with the old dapp
            self.log_dapp(contract, if new { None } else { Some(old_dapp) });

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

            // update the log
            self.log_dapp(contract, None);

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
            let max_age = if block_number < self.max_user_history_age {
                block_number
            } else {
                self.max_user_history_age
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
                summary.score =
                    ((summary.correct * 200) / (summary.correct + summary.incorrect)) as u8;
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

            // validate the commit
            // self.validate_commit(commit)?;

            // ensure the provider is active
            self.validate_provider_active(caller)?;
            // ensure the dapp is active
            self.validate_dapp(commit.dapp)?;

            // check commitment doesn't already exist
            if self.captcha_solution_commitments.get(commit.id).is_some() {
                return err!(self, Error::CommitAlreadyExists);
            }

            self.record_commitment(commit.user, commit.id, commit);

            self.pay_fee(&caller, &commit.dapp)?;

            Ok(())
        }

        #[ink(message)]
        pub fn provider_commit(&mut self, commit: Commit) -> Result<(), Error> {
            self.provider_record_commit(&commit)?;

            // update the seed
            self.update_seed()?;

            Ok(())
        }

        /// Provider submits 0-many captcha solution commitments
        #[ink(message)]
        pub fn provider_commit_many(&mut self, commits: Vec<Commit>) -> Result<(), Error> {
            for commit in commits.iter() {
                self.provider_record_commit(commit)?;
            }

            // update the seed
            self.update_seed()?;

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
                .ok_or_else(err_fn!(self, Error::ProviderDoesNotExist))?;
            if provider.fee != 0 {
                let mut dapp = self
                    .dapps
                    .get(dapp_account)
                    .ok_or_else(err_fn!(self, Error::DappDoesNotExist))?;

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
                return err!(self, Error::ProviderDoesNotExist);
            }
            let provider = self.get_provider_details(provider_id)?;
            if provider.balance < self.provider_stake_threshold {
                return err!(self, Error::ProviderInsufficientFunds);
            }
            Ok(provider)
        }

        fn validate_provider_active(&self, provider_id: AccountId) -> Result<Provider, Error> {
            let provider = self.validate_provider_exists_and_has_funds(provider_id)?;
            if provider.status != GovernanceStatus::Active {
                return err!(self, Error::ProviderInactive);
            }
            Ok(provider)
        }

        fn validate_dapp(&self, contract: AccountId) -> Result<Dapp, Error> {
            // Guard against dapps using service that are not registered
            if self.dapps.get(contract).is_none() {
                return err!(self, Error::DappDoesNotExist);
            }
            // Guard against dapps using service that are Suspended or Deactivated
            let dapp = self.get_dapp_details(contract)?;
            if dapp.status != GovernanceStatus::Active {
                return err!(self, Error::DappInactive);
            }
            // Make sure the Dapp can pay the transaction fees of the user and potentially the
            // provider, if their fee > 0
            if dapp.balance < self.dapp_stake_threshold {
                return err!(self, Error::DappInsufficientFunds);
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
                .ok_or_else(err_fn!(self, Error::CaptchaDataDoesNotExist))?;
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
                .ok_or_else(err_fn!(self, Error::DappUserDoesNotExist))
        }

        /// Get a single provider's details
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_provider_details(&self, accountid: AccountId) -> Result<Provider, Error> {
            self.providers
                .get(accountid)
                .ok_or_else(err_fn!(self, Error::ProviderDoesNotExist))
        }

        /// Get a single dapps details
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_dapp_details(&self, contract: AccountId) -> Result<Dapp, Error> {
            self.dapps
                .get(contract)
                .ok_or_else(err_fn!(self, Error::DappDoesNotExist))
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
                return err!(self, Error::CommitDoesNotExist);
            }
            let commitment = self
                .captcha_solution_commitments
                .get(captcha_solution_commitment_id)
                .ok_or_else(err_fn!(self, Error::CommitDoesNotExist))?;

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
                providers.push(provider.ok_or_else(err_fn!(self, Error::ProviderDoesNotExist))?);
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
                        .ok_or_else(err_fn!(self, Error::ProviderDoesNotExist))?
                        .into_iter()
                        .collect();
                    providers.append(&mut self.list_providers_by_ids(provider_ids)?);
                }
            }
            Ok(providers)
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
                return err!(self, Error::ContractTransferFailed);
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
                        return err!(self, Error::Unknown);
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
                return err!(self, Error::NotAuthorised);
            }
            Ok(())
        }

        fn check_not_admin(&self, acc: AccountId) -> Result<(), Error> {
            if self.admin == acc {
                err!(self, Error::NotAuthorised)
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
        use ink::env::DefaultEnvironment;

        use crate::captcha::Error::{ProviderInactive, ProviderInsufficientFunds};

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        type Event = <Captcha as ::ink::reflect::ContractEventBase>::Type;

        const set_contract: fn(AccountId) = ink::env::test::set_contract::<DefaultEnvironment>;
        const set_caller: fn(AccountId) = ink::env::test::set_caller::<DefaultEnvironment>;
        const set_account_balance: fn(AccountId, Balance) =
            ink::env::test::set_account_balance::<DefaultEnvironment>;
        const set_callee: fn(AccountId) = ink::env::test::set_callee::<DefaultEnvironment>;
        const get_account_balance: fn(AccountId) -> Result<Balance, ink::env::Error> =
            ink::env::test::get_account_balance::<DefaultEnvironment>;
        const is_contract: fn(AccountId) -> bool =
            ink::env::test::is_contract::<DefaultEnvironment>;
        const callee: fn() -> AccountId = ink::env::test::callee::<DefaultEnvironment>;
        const advance_block: fn() = ink::env::test::advance_block::<DefaultEnvironment>;
        const set_value_transferred: fn(Balance) = ink::env::test::set_value_transferred::<
            DefaultEnvironment>;

        fn increment_block(inc: u32) {
            for _ in 0..inc {
                advance_block();
            }
        }

        const STAKE_THRESHOLD: u128 = 1000000000000;

        const ADMIN_ACCOUNT_PREFIX: u8 = 0x01;
        const DAPP_ACCOUNT_PREFIX: u8 = 0x02;
        const PROVIDER_ACCOUNT_PREFIX: u8 = 0x03;
        const USER_ACCOUNT_PREFIX: u8 = 0x04;
        const CONTRACT_ACCOUNT_PREFIX: u8 = 0x05;
        const CODE_HASH_PREFIX: u8 = 0x06;
        const DAPP_CONTRACT_ACCOUNT_PREFIX: u8 = 0x07;
        const DATASET_ID_PREFIX: u8 = 0x08;
        const DATASET_ID_CONTENT_PREFIX: u8 = 0x09;

        // unused account is 0x00 - do not use this, it will be the default caller, so could get around caller checks accidentally
        fn get_unused_account() -> AccountId {
            AccountId::from([0x00; 32])
        }

        // reset the callee
        fn reset_callee() {
            set_callee(get_unused_account());
        }

        // reset the caller
        fn reset_caller() {
            set_caller(get_unused_account());
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

            // check the account has a balance of >0
            assert!(get_account_balance(account).unwrap() > 0);
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
            let account = get_account(CONTRACT_ACCOUNT_PREFIX, index);
            // mark the account as a contract
            set_callee(account);
            set_contract(account);
            reset_callee();
            account
        }

        /// get the nth code hash. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_code_hash(index: u128) -> [u8; 32] {
            get_account_bytes(CODE_HASH_PREFIX, index)
        }

        /// get the nth contract. This ensures against account collisions, e.g. 1 account being both a provider and an admin, which can obviously cause issues with caller guards / permissions in the contract.
        fn get_contract(index: u128) -> Captcha {
            let account = get_contract_account(index); // the account for the contract
            set_callee(account);
            // set the caller to the matching admin at index
            set_caller(get_admin_account(index));
            set_value_transferred(STAKE_THRESHOLD);
            // now construct the contract instance
            let mut contract =
                Captcha::new_unguarded(STAKE_THRESHOLD, STAKE_THRESHOLD, 10, 1000000, 0, 1000, 50);

            // check the contract was created with the correct account
            assert_eq!(contract.env().account_id(), account);
            reset_callee();
            contract
        }

        fn get_provider_url(index: u128) -> Vec<u8> {
            index.to_le_bytes().to_vec()
        }

        fn get_provider_fee() -> u32 {
            1000
        }

        fn get_provider_payee() -> Payee {
            Payee::Provider
        }

        fn get_provider_dataset_id(index: u128) -> Hash {
            let mut bytes = [DATASET_ID_PREFIX; 32];
            bytes[0..16].copy_from_slice(&index.to_le_bytes());
            bytes.into()
        }

        fn get_provider_dataset_id_content(index: u128) -> Hash {
            let mut bytes = [DATASET_ID_CONTENT_PREFIX; 32];
            bytes[0..16].copy_from_slice(&index.to_le_bytes());
            bytes.into()
        }

        fn get_dapp_payee() -> DappPayee {
            DappPayee::Provider
        }

        fn get_dapp_contract_account(index: u128) -> AccountId {
            let account = get_account(DAPP_CONTRACT_ACCOUNT_PREFIX, index);
            // mark the account as a contract
            set_callee(account);
            set_contract(account);
            reset_callee();
            account
        }

        fn register_provider(contract: &mut Captcha, index: u128) {
            // set the caller to the provider account
            set_caller(get_provider_account(index));
            set_callee(contract.env().account_id());
            // register the provider
            set_value_transferred(contract.get_provider_stake_threshold());
            contract
                .provider_register(
                    get_provider_url(index),
                    get_provider_fee(),
                    get_provider_payee(),
                )
                .unwrap();
            set_value_transferred(0);
            // set the dataset for the provider
            contract.provider_set_dataset(
                get_provider_dataset_id(index),
                get_provider_dataset_id_content(index),
            ).unwrap();
            // advance the block, as in production the provider would not be seen until block rollover
            advance_block();

            // avoid accidentally reusing caller
            reset_caller();
            reset_callee();
        }

        fn register_dapp(contract: &mut Captcha, index: u128) {
            // set the caller to the dapp account
            set_caller(get_dapp_account(index));
            set_callee(contract.env().account_id());
            set_value_transferred(contract.get_dapp_stake_threshold());
            // register the dapp
            contract
                .dapp_register(get_dapp_contract_account(index), get_dapp_payee())
                .unwrap();
            set_value_transferred(0);
            // advance the block, as in production the dapp would not be seen until block rollover
            advance_block();

            // avoid accidentally reusing caller
            reset_caller();
            reset_callee();
        }

        fn get_contract_populated(index: u128, size: u128) -> Captcha {
            let mut contract = get_contract(index);
            for i in 0..size {
                // register the provider
                register_provider(&mut contract, i);
                // register the dapp
                register_dapp(&mut contract, i);
            }
            contract
        }

        #[ink::test]
        fn test_get_payees() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());

            assert_eq!(contract.get_payees(), vec![Payee::Dapp, Payee::Provider]);
        }

        #[ink::test]
        fn test_get_dapp_payees() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());

            assert_eq!(
                contract.get_dapp_payees(),
                vec![DappPayee::Dapp, DappPayee::Provider, DappPayee::Any]
            );
        }

        #[ink::test]
        fn test_get_statuses() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());

            assert_eq!(
                contract.get_statuses(),
                vec![GovernanceStatus::Active, GovernanceStatus::Inactive]
            );
        }

        // #[ink::test]
        // fn test_get_seed_at() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract_populated(0, 1);

        //     let admin_account = get_admin_account(0);
        //     // set the caller to the provider account
        //     set_caller(admin_account);

        //     // make sure the rewind window >0
        //     assert!(contract.get_rewind_window() > 0);

        //     // for many more blocks than the rewind window, check that the seed is recorded on every change per block
        //     let mut seeds: Vec<u128> = vec![contract.get_seed()];
        //     let (limit, overflow) = contract.get_rewind_window().overflowing_mul(3);
        //     assert!(!overflow);

        //     for i in 0..limit {

        //         println!("{:#?}", seeds);
        //         println!("{:#?}", contract.get_seeds());

        //         // check most recent seed
        //         assert_eq!(contract.get_seed(), seeds.last().unwrap().clone());

        //         // check that the seeds in the rewind window are correct
        //         let window = contract.get_rewind_window() as BlockNumber;
        //         let block = contract.env().block_number();
        //         let range = if window > block { block } else { window };
        //         for j in 0..=range {
        //             let at = contract.env().block_number() - (j as BlockNumber);
        //             let a = contract.get_seed_at(at).unwrap();
        //             let b = seeds[j as usize];
        //             assert_eq!(a, b);
        //         }

        //         // add the seed for this block to our history
        //         seeds.push(contract.get_seed());

        //         if contract.get_rewind_window_start() > 0 {
        //             seeds.remove(0);
        //         }

        //         // update the seed for this block (which should log the previous in the history)
        //         contract.update_seed().unwrap();

        //         // advance to the next block
        //         advance_block();
        //     }
        // }

        #[ink::test]
        fn test_get_seed_at_beyond_rewind_window() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());
            let admin_account = get_admin_account(0);
            set_caller(admin_account);

            // advance the block past the rewind window
            increment_block(contract.get_rewind_window() as u32 + 1);

            // check that going back further than the rewind window hits an error
            let result = contract.get_seed_at((contract.get_rewind_window_start() - 1));
            assert_eq!(result, Err(Error::BlockOutsideRewindWindow));
        }

        #[ink::test]
        fn test_get_seed_at_future_block() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());
            let admin_account = get_admin_account(0);
            set_caller(admin_account);

            // check that going to the future block hits an error
            let result = contract.get_seed_at((contract.env().block_number() + 1));
            assert_eq!(result, Err(Error::BlockInFuture));
        }

        #[ink::test]
        fn test_get_provider_at_beyond_rewind_window() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract_populated(0, 1);
            set_callee(contract.env().account_id());
            let admin_account = get_admin_account(0);
            set_caller(admin_account);

            // advance the block past the rewind window
            increment_block(contract.get_rewind_window() as u32 + 1);

            // check that going back further than the rewind window hits an error
            let result = contract.get_provider_at(
                get_provider_account(0),
                (contract.get_rewind_window_start() - 1),
            );
            assert_eq!(result, Err(Error::BlockOutsideRewindWindow));
        }

        #[ink::test]
        fn test_get_provider_at_future_block() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());
            let admin_account = get_admin_account(0);
            set_caller(admin_account);

            // check that going to the future block hits an error
            let result = contract
                .get_provider_at(get_provider_account(0), (contract.env().block_number() + 1));
            assert_eq!(result, Err(Error::BlockInFuture));
        }

        #[ink::test]
        fn test_get_dapp_at_beyond_rewind_window() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract_populated(0, 1);
            set_callee(contract.env().account_id());
            let admin_account = get_admin_account(0);
            set_caller(admin_account);

            // advance the block past the rewind window
            increment_block(contract.get_rewind_window() as u32 + 1);

            // check that going back further than the rewind window hits an error
            let result = contract.get_dapp_at(
                get_dapp_account(0),
                (contract.get_rewind_window_start() - 1),
            );
            assert_eq!(result, Err(Error::BlockOutsideRewindWindow));
        }

        #[ink::test]
        fn test_get_dapp_at_future_block() {
            reset_caller();
            reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());
            let admin_account = get_admin_account(0);
            set_caller(admin_account);

            // check that going to the future block hits an error
            let result =
                contract.get_dapp_at(get_dapp_account(0), (contract.env().block_number() + 1));
            assert_eq!(result, Err(Error::BlockInFuture));
        }

        #[ink::test]
        fn test_provider_register_url_empty() {
            reset_caller(); reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());
            let provider_account = get_provider_account(0);
            // set the caller to the provider account
            set_caller(provider_account);
            // register the provider
            // expect err because url is empty
            let result = contract.provider_register(
                vec![],
                get_provider_fee(),
                get_provider_payee(),
            );
            assert_eq!(result, Err(Error::UrlEmpty));
        }

        #[ink::test]
        fn test_provider_update_url_empty() {
            reset_caller(); reset_callee();

            let mut contract = get_contract_populated(0, 1);
            set_callee(contract.env().account_id());
            let provider_account = get_provider_account(0);
            // set the caller to the provider account
            set_caller(provider_account);
            // register the provider
            // expect err because url is empty
            let result = contract.provider_update(
                vec![],
                get_provider_fee(),
                get_provider_payee(),
            );
            assert_eq!(result, Err(Error::UrlEmpty));
        }

        #[ink::test]
        fn test_provider_register_fee_too_large() {
            reset_caller(); reset_callee();

            let mut contract = get_contract(0);
            set_callee(contract.env().account_id());
            let provider_account = get_provider_account(0);
            // set the caller to the provider account
            set_caller(provider_account);
            // register the provider
            // expect err because fee too large
            let result = contract.provider_register(
                get_provider_url(0),
                contract.get_max_provider_fee() + 1,
                get_provider_payee(),
            );
            assert_eq!(result, Err(Error::ProviderFeeTooHigh));
        }

        #[ink::test]
        fn test_provider_update_fee_too_large() {
            reset_caller(); reset_callee();

            let mut contract = get_contract_populated(0, 1);
            set_callee(contract.env().account_id());
            let provider_account = get_provider_account(0);
            // set the caller to the provider account
            set_caller(provider_account);
            // register the provider
            // expect err because fee too large
            let result = contract.provider_update(
                get_provider_url(0),
                contract.get_max_provider_fee() + 1,
                get_provider_payee(),
            );
            assert_eq!(result, Err(Error::ProviderFeeTooHigh));
        }

        #[ink::test]
        fn test_update_seed_once_per_block() {
            reset_caller(); reset_callee();

            let mut contract = get_contract_populated(0, 1);
            set_callee(contract.env().account_id());

            let provider_account = get_provider_account(0);

            set_caller(provider_account);
            advance_block();
            for i in 0..10 {
                contract.update_seed().unwrap();

                // updating in the same block should fail
                let result = contract.update_seed().unwrap();
                assert_eq!(result, false);
                advance_block();
            }
        }

        // #[ink::test]
        // fn test_get_rewind_window_start() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // expect rewind window start to be zero when block < rewind window
        //     // this test only works with rewind window > 0
        //     assert!(contract.get_rewind_window() > 0);

        //     for i in 0..contract.get_rewind_window() {
        //         assert_eq!(contract.get_rewind_window_start(), 0);
        //         advance_block();
        //     }

        //     // expect rewind window start to be exactly rewind window when block > rewind window
        //     for i in 0..10 {
        //         assert_eq!(contract.get_rewind_window_start(), contract.env().block_number() - contract.get_rewind_window() as u32);
        //         advance_block();
        //     }
        // }

        // #[ink::test]
        // fn test_update_seed_caller() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract_populated(0, 1);

        //     let provider_account = get_provider_account(0);
        //     let user_account = get_user_account(0);
        //     let admin_account = get_admin_account(0);
        //     let dapp_account = get_dapp_account(0);
        //     let unregistered_dapp_account = get_dapp_account(1);
        //     let unregistered_provider_account = get_provider_account(1);

        //     // for each account who should be able to update the seed, test that
        //     for account in vec![
        //         provider_account,
        //         admin_account,
        //     ].iter() {
        //         set_caller(*account);
        //         contract.update_seed().unwrap();
        //     }

        //     // for each account who should not be able to update the seed, test that
        //     for account in vec![
        //         user_account,
        //         dapp_account,
        //         unregistered_dapp_account,
        //         unregistered_provider_account,
        //     ].iter() {
        //         set_caller(*account);
        //         contract.update_seed().unwrap_err();
        //     }
        // }

        // #[ink::test]
        // fn test_ctor_guard_pass() {
        //     reset_caller(); reset_callee();

        //     // only able to instantiate from the alice account
        //     set_caller(AccountId::from(AUTHOR));
        //     let contract =
        //         Captcha::new(STAKE_THRESHOLD, STAKE_THRESHOLD, 10, 1000000, 0, 1000, 255);
        //     // should construct successfully
        // }

        // #[ink::test]
        // #[should_panic]
        // fn test_ctor_guard_fail() {
        //     reset_caller(); reset_callee();

        //     // only able to instantiate from the alice account
        //     let mut account = AUTHOR.clone();
        //     // ensure the account is not the author
        //     account[0] = account[0].wrapping_add(1);
        //     set_caller(AccountId::from(account));
        //     let contract =
        //         Captcha::new(STAKE_THRESHOLD, STAKE_THRESHOLD, 10, 1000000, 0, 1000, 255);
        //     // should fail to construct and panic
        // }

        // #[ink::test]
        // fn test_ctor() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // ctor params should be set
        //     assert_eq!(contract.provider_stake_threshold, STAKE_THRESHOLD);
        //     assert_eq!(contract.get_dapp_stake_threshold(), STAKE_THRESHOLD);
        //     assert_eq!(contract.get_admin(), get_admin_account(0));
        //     assert_eq!(contract.get_max_user_history_len(), 10);
        //     assert_eq!(contract.get_max_user_history_age(), 1000000);
        //     assert_eq!(contract.get_min_num_active_providers(), 0);
        //     assert_eq!(contract.get_max_provider_fee(), 1000);
        //     assert_eq!(contract.get_seed(), 0);

        //     // default state should be set
        //     for payee in contract.get_payees().iter() {
        //         for status in contract.get_statuses().iter() {
        //             assert_eq!(
        //                 contract.provider_accounts.get(ProviderState {
        //                     payee: *payee,
        //                     status: *status
        //                 }),
        //                 None
        //             );
        //         }
        //     }
        //     assert_eq!(contract.dapp_accounts.get(), None);
        //     assert_eq!(contract.user_accounts.get(), None);
        // }

        // /// Test accounts are funded with existential deposit
        // #[ink::test]
        // fn test_accounts_funded() {
        //     for func in vec![
        //         get_admin_account,
        //         get_provider_account,
        //         get_dapp_account,
        //         get_user_account,
        //         get_contract_account,
        //     ]
        //     .iter()
        //     {
        //         for i in 0..10 {
        //             let account = func(i);
        //             // check the account has funds. Will panic if not as no existential deposit == account not found
        //             get_account_balance(account).unwrap();
        //         }
        //     }

        //     // same for contracts
        //     for i in 0..10 {
        //         let contract = get_contract(i);
        //         // check the account has funds. Will panic if not as no existential deposit == account not found
        //         get_account_balance(contract.env().account_id()).unwrap();
        //     }
        // }

        // /// Are the unit test accounts unique, i.e. make sure there's no collisions in accounts destined for different roles, as this would invalidate any caller guards
        // #[ink::test]
        // fn test_accounts_unique() {
        //     let mut set: std::collections::HashSet<[u8; 32]> = std::collections::HashSet::new();

        //     // for each method of generating an account
        //     for func in vec![
        //         get_admin_account,
        //         get_provider_account,
        //         get_dapp_account,
        //         get_user_account,
        //         get_contract_account,
        //         get_dapp_contract_account,
        //     ]
        //     .iter()
        //     {
        //         // try the first 10 accounts
        //         for i in 0..10 {
        //             let account = func(i);
        //             assert!(
        //                 set.insert(*AsRef::<[u8; 32]>::as_ref(&account)),
        //                 "Duplicate account ID found: {:?}",
        //                 account
        //             );
        //         }
        //     }

        //     // do the same for non-account based IDs
        //     for func in vec![get_code_hash].iter() {
        //         // try the first 10 accounts
        //         for i in 0..10 {
        //             let account = func(i);
        //             assert!(
        //                 set.insert(account),
        //                 "Duplicate account ID found: {:?}",
        //                 account
        //             );
        //         }
        //     }
        // }

        // /// Are the unit test contracts unique, i.e. make sure there's no collisions in contract accounts as two contracts with the same account could work around funding tests as utilising the same account
        // #[ink::test]
        // fn test_contracts_unique() {
        //     let mut set: std::collections::HashSet<[u8; 32]> = std::collections::HashSet::new();

        //     // for the first 10 contracts
        //     for i in 0..9 {
        //         let contract = get_contract(i);
        //         let account = contract.env().account_id();
        //         assert!(
        //             set.insert(*AsRef::<[u8; 32]>::as_ref(&account)),
        //             "Duplicate account ID found: {:?}",
        //             account
        //         );
        //     }
        // }

        // // #[ink::test]
        // // fn test_set_code_hash() {

        // //     // always set the caller to the unused account to start, avoid any mistakes with caller checks
        // //     set_caller(get_unused_account());
        // //

        // //     let mut contract = get_contract(0);

        // //     let new_code_hash = get_code_hash(1);
        // //     let old_code_hash = contract.env().own_code_hash().unwrap();
        // //     assert_ne!(Hash::from(new_code_hash), old_code_hash);

        // //     set_caller(get_admin_account(0)); // an account which does have permission to call set code hash

        // //     assert_eq!(contract.set_code_hash(new_code_hash), Ok(()));

        // //     assert_eq!(contract.env().own_code_hash().unwrap(), Hash::from(new_code_hash));
        // // }

        // #[ink::test]
        // fn test_set_code_hash_unauthorised() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     set_caller(get_user_account(0)); // an account which does not have permission to call set code hash

        //     let new_code_hash = get_code_hash(1);
        //     assert_eq!(
        //         contract.set_code_hash(new_code_hash),
        //         Err(Error::NotAuthorised)
        //     );
        // }

        // #[ink::test]
        // fn test_terminate() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     set_caller(get_admin_account(0)); // an account which does have permission to call terminate

        //     let contract_account = contract.env().account_id();
        //     let bal = get_account_balance(contract_account).unwrap();
        //     let admin = get_admin_account(0);
        //     let should_terminate = move || contract.terminate().unwrap();
        //     ink::env::test::assert_contract_termination::<ink::env::DefaultEnvironment, _>(
        //         should_terminate,
        //         get_admin_account(0),
        //         bal,
        //     );
        // }

        // #[ink::test]
        // fn test_terminate_unauthorised() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     set_caller(get_user_account(0)); // an account which does not have permission to call terminate

        //     assert_eq!(contract.terminate().unwrap_err(), Error::NotAuthorised);
        // }

        // #[ink::test]
        // fn test_withdraw() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     println!("contract {:?}", contract.env().account_id());

        //     // give the contract funds
        //     set_account_balance(contract.env().account_id(), 10000000000);
        //     set_caller(get_admin_account(0)); // use the admin acc
        //     let admin_bal: u128 = get_account_balance(get_admin_account(0)).unwrap();
        //     let contract_bal: u128 = get_account_balance(contract.env().account_id()).unwrap();
        //     let withdraw_amount: u128 = 1;
        //     contract.withdraw(withdraw_amount).unwrap();
        //     assert_eq!(
        //         get_account_balance(get_admin_account(0)).unwrap(),
        //         admin_bal + withdraw_amount
        //     );
        //     assert_eq!(
        //         get_account_balance(contract.env().account_id()).unwrap(),
        //         contract_bal - withdraw_amount
        //     );
        // }

        // #[ink::test]
        // #[should_panic]
        // fn test_withdraw_insufficient_funds() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     set_caller(get_admin_account(0)); // use the admin acc
        //     let admin_bal = get_account_balance(get_admin_account(0)).unwrap();
        //     let contract_bal = get_account_balance(contract.env().account_id()).unwrap();
        //     contract.withdraw(contract_bal + 1); // panics as bal would go below existential deposit
        // }

        // #[ink::test]
        // fn test_withdraw_unauthorised() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // give the contract funds
        //     set_caller(get_user_account(0)); // use the admin acc
        //     assert_eq!(contract.withdraw(1), Err(Error::NotAuthorised));
        // }

        // #[ink::test]
        // fn test_check_admin() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     // try the first 10 accounts
        //     for i in 0..9 {
        //         let acc = get_admin_account(i);
        //         if acc == contract.admin {
        //             assert!(contract.check_admin(acc).is_ok());
        //             assert!(contract.check_not_admin(acc).is_err());
        //             set_caller(acc);
        //             assert!(contract.check_caller_admin().is_ok());
        //         } else {
        //             assert!(contract.check_admin(acc).is_err());
        //             assert!(contract.check_not_admin(acc).is_ok());
        //             set_caller(acc);
        //             assert!(contract.check_caller_admin().is_err());
        //         }
        //     }
        // }

        // #[ink::test]
        // fn test_set_admin() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let old_admin = contract.admin;
        //     let new_admin = get_admin_account(1);
        //     assert_ne!(old_admin, new_admin);

        //     contract.check_admin(old_admin).unwrap();
        //     contract.check_not_admin(new_admin).unwrap();

        //     set_caller(old_admin);
        //     contract.set_admin(new_admin).unwrap();

        //     contract.check_admin(new_admin).unwrap();
        //     contract.check_not_admin(old_admin).unwrap();
        // }

        // #[ink::test]
        // fn test_set_admin_unauthorised() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let old_admin = contract.admin;
        //     let new_admin = get_admin_account(1);
        //     assert_ne!(old_admin, new_admin);

        //     contract.check_admin(old_admin).unwrap();
        //     contract.check_not_admin(new_admin).unwrap();

        //     // can only call set_admin from the current admin account (old admin)
        //     set_caller(new_admin);
        //     contract.set_admin(new_admin).unwrap_err();
        // }

        // #[ink::test]
        // fn test_ctor_caller_admin() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // check the caller is admin
        //     assert_eq!(contract.admin, get_admin_account(0));
        // }

        // /// Assert contract provider minimum stake default set from constructor.
        // #[ink::test]
        // pub fn test_provider_stake_threshold() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let provider_stake_threshold: u128 = contract.get_provider_stake_threshold();
        //     assert!(STAKE_THRESHOLD.eq(&provider_stake_threshold));
        // }

        // /// Assert contract dapp minimum stake default set from constructor.
        // #[ink::test]
        // pub fn test_dapp_stake_threshold() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let dapp_stake_threshold: u128 = contract.get_dapp_stake_threshold();
        //     assert!(STAKE_THRESHOLD.eq(&dapp_stake_threshold));
        // }

        // /// Test provider register
        // #[ink::test]
        // fn test_provider_register() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let provider_account = AccountId::from([0x2; 32]);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     // give provider some funds, but not enough to be above the minimum stake
        //     set_account_balance(provider_account, 1);
        //     let url: Vec<u8> = vec![1, 2, 3];
        //     let fee: u32 = 100;
        //     contract.provider_register(url, fee, Payee::Dapp);
        //     assert!(contract.providers.get(provider_account).is_some());
        //     println!(
        //         "{}",
        //         contract
        //             .provider_accounts
        //             .get(ProviderState {
        //                 status: GovernanceStatus::Inactive,
        //                 payee: Payee::Provider
        //             })
        //             .unwrap_or_default()
        //             .contains(&provider_account)
        //     );

        //     assert!(contract
        //         .provider_accounts
        //         .get(ProviderState {
        //             status: GovernanceStatus::Inactive,
        //             payee: Payee::Dapp
        //         })
        //         .unwrap_or_default()
        //         .contains(&provider_account));
        // }

        // /// Test provider deregister
        // #[ink::test]
        // fn test_provider_deactivate() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let provider_account = AccountId::from([0x2; 32]);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let url: Vec<u8> = vec![1, 2, 3];
        //     let fee: u32 = 100;
        //     contract.provider_register(url, fee, Payee::Dapp);
        //     assert!(contract.providers.get(provider_account).is_some());
        //     contract.provider_deactivate();
        //     let provider_record = contract.providers.get(provider_account).unwrap();
        //     assert!(provider_record.status == GovernanceStatus::Inactive);
        // }

        // /// Test list providers
        // #[ink::test]
        // fn test_list_providers_by_ids() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let provider_account = AccountId::from([0x2; 32]);
        //     let url: Vec<u8> = vec![1, 2, 3];
        //     let fee: u32 = 100;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract.provider_register(url, fee, Payee::Dapp);
        //     let registered_provider_account = contract.providers.get(provider_account);
        //     assert!(registered_provider_account.is_some());
        //     let returned_list = contract
        //         .list_providers_by_ids(vec![provider_account])
        //         .unwrap();
        //     assert!(returned_list == vec![registered_provider_account.unwrap()]);
        // }

        // // test get random number with zero length, i.e. no range to pick from
        // #[ink::test]
        // #[should_panic]
        // fn test_get_random_number_zero_len() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     contract.get_random_number(0, get_unused_account(), get_unused_account());
        // }

        // // Test get random number
        // #[ink::test]
        // fn test_get_random_number() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let acc1 = AccountId::from([0x1; 32]);
        //     let acc2 = AccountId::from([0x2; 32]);
        //     const len: usize = 10;
        //     let mut arr = [0; len];
        //     // get several random numbers, one per block
        //     for item in arr.iter_mut().take(len) {
        //         let number = contract.get_random_number(100, acc1, acc2);
        //         *item = number;
        //         println!(
        //             "{:?} {:?} {:?}",
        //             number,
        //             ink::env::block_number::<ink::env::DefaultEnvironment>(),
        //             ink::env::block_timestamp::<ink::env::DefaultEnvironment>()
        //         );
        //         ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
        //     }
        //     // check that the random numbers match precomputed values
        //     assert_eq!(&[29, 95, 86, 92, 88, 24, 59, 73, 96, 53], &arr);
        // }

        // /// Helper function for converting string to Hash
        // fn str_to_hash(str: String) -> Hash {
        //     let mut result = Hash::default();
        //     let len_result = result.as_ref().len();
        //     let mut hash_output = <<Blake2x256 as HashOutput>::Type as Default>::default();
        //     <Blake2x256 as CryptoHash>::hash(str.as_ref(), &mut hash_output);
        //     let copy_len = core::cmp::min(hash_output.len(), len_result);
        //     result.as_mut()[0..copy_len].copy_from_slice(&hash_output[0..copy_len]);
        //     result
        // }

        // /// Provider Register Helper
        // fn generate_provider_data(id: u8, port: &str, fee: u32) -> (AccountId, Vec<u8>, u32) {
        //     let provider_account = AccountId::from([id; 32]);
        //     let url = port.as_bytes().to_vec();

        //     (provider_account, url, fee)
        // }

        // /// Test provider register and update
        // #[ink::test]
        // fn test_provider_register_and_update() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "2424", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract.provider_register(url, fee, Payee::Dapp).unwrap();
        //     assert!(contract.providers.get(provider_account).is_some());
        //     assert!(contract
        //         .provider_accounts
        //         .get(ProviderState {
        //             status: GovernanceStatus::Inactive,
        //             payee: Payee::Dapp
        //         })
        //         .unwrap()
        //         .contains(&provider_account));

        //     let url: Vec<u8> = vec![1, 2, 3];
        //     let fee: u32 = 100;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let balance = 20000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url.clone(), fee, Payee::Dapp);
        //     assert!(contract
        //         .provider_accounts
        //         .get(ProviderState {
        //             status: GovernanceStatus::Inactive,
        //             payee: Payee::Dapp
        //         })
        //         .unwrap()
        //         .contains(&provider_account));
        //     let provider = contract.providers.get(provider_account).unwrap();
        //     assert_eq!(provider.url, url);
        //     assert_eq!(provider.fee, fee);
        //     assert_eq!(provider.payee, Payee::Dapp);
        //     assert_eq!(provider.balance, balance);
        //     assert_eq!(provider.status, GovernanceStatus::Inactive);
        // }

        // /// Test provider register with url error
        // #[ink::test]
        // fn test_provider_register_with_url_error() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // try creating the second provider and make sure the error is correct and that it doesn't exist
        //     let (provider_account, _, _) = generate_provider_data(0x3, "4242", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     println!("{:?}", contract.providers.get(provider_account));
        //     match contract.provider_register(url, fee, Payee::Dapp) {
        //         Result::Err(Error::ProviderUrlUsed) => {}
        //         _ => {
        //             unreachable!();
        //         }
        //     }
        //     println!("{:?}", contract.providers.get(provider_account));
        //     assert!(contract.providers.get(provider_account).is_none());
        //     assert!(!contract
        //         .provider_accounts
        //         .get(ProviderState {
        //             status: GovernanceStatus::Inactive,
        //             payee: Payee::Dapp
        //         })
        //         .unwrap()
        //         .contains(&provider_account));
        // }

        // /// Test provider update with url error
        // #[ink::test]
        // fn test_provider_update_with_url_error() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract.provider_register(url, fee, Payee::Dapp).unwrap();

        //     let (provider_account, url, fee) = generate_provider_data(0x3, "2424", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract.provider_register(url, fee, Payee::Dapp).unwrap();

        //     let (_, url, fee) = generate_provider_data(0x3, "4242", 100);

        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let balance = 20000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

        //     // try updating the second provider and make sure the error is correct and that it didn't change
        //     match contract.provider_update(url.clone(), fee, Payee::Dapp) {
        //         Result::Err(Error::ProviderUrlUsed) => {}
        //         _ => {
        //             unreachable!();
        //         }
        //     }

        //     let provider = contract.providers.get(provider_account).unwrap();
        //     assert_ne!(provider.url, url);
        //     assert_ne!(provider.fee, fee);
        //     assert_ne!(provider.balance, balance);
        //     assert_ne!(provider.status, GovernanceStatus::Active);
        // }

        // /// Test provider unstake
        // #[ink::test]
        // fn test_provider_deregister() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     // give the contract some funds
        //     set_account_balance(contract.env().account_id(), 1000000000);
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     let balance: u128 = 10;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .ok();
        //     ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
        //         provider_account,
        //         balance,
        //     );
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider);
        //     contract.provider_deregister().ok();
        // }

        // /// Test provider add data set
        // #[ink::test]
        // fn test_provider_set_dataset() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     let balance: u128 = 2000000000000;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .ok();
        //     ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
        //         provider_account,
        //         balance,
        //     );
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider);
        //     let root1 = str_to_hash("merkle tree".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     contract.provider_set_dataset(root1, root2).ok();
        // }

        // /// Test dapp register with zero balance transfer
        // #[ink::test]
        // fn test_dapp_register_zero_balance_transfer() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let caller = AccountId::from([0x2; 32]);
        //     let dapp_contract = AccountId::from([0x3; 32]);
        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
        //     // Don't transfer anything with the call
        //     let balance = 0;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

        //     contract.dapp_register(dapp_contract, DappPayee::Dapp);
        //     assert!(contract.dapps.get(dapp_contract).is_some());
        //     let dapp = contract.dapps.get(dapp_contract).unwrap();
        //     assert_eq!(dapp.owner, caller);

        //     // account is marked as suspended as zero tokens have been paid
        //     assert_eq!(dapp.status, GovernanceStatus::Inactive);
        //     assert_eq!(dapp.balance, balance);
        //     assert!(contract
        //         .dapp_accounts
        //         .get()
        //         .unwrap()
        //         .contains(&dapp_contract));
        // }

        // /// Test dapp register with positive balance transfer
        // #[ink::test]
        // fn test_dapp_register_positive_balance_transfer() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let caller = AccountId::from([0x2; 32]);
        //     let dapp_contract = AccountId::from([0x3; 32]);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

        //     // Transfer tokens with the call
        //     let balance = STAKE_THRESHOLD;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

        //     // register the dapp
        //     contract.dapp_register(dapp_contract, DappPayee::Dapp);
        //     // check the dapp exists in the hashmap
        //     assert!(contract.dapps.get(dapp_contract).is_some());

        //     // check the various attributes are correct
        //     let dapp = contract.dapps.get(dapp_contract).unwrap();
        //     assert_eq!(dapp.owner, caller);

        //     // account is marked as active as balance is now positive
        //     assert_eq!(dapp.status, GovernanceStatus::Active);
        //     assert_eq!(dapp.balance, balance);
        //     assert!(contract
        //         .dapp_accounts
        //         .get()
        //         .unwrap()
        //         .contains(&dapp_contract));
        // }

        // #[ink::test]
        // fn test_verify_sr25519_valid() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let data = "hello";
        //     let mut data_hash = [0u8; 16];
        //     Blake2x128::hash(data.as_bytes(), &mut data_hash);
        //     println!("data_hash: {:?}", data_hash);
        //     let data_hex = hex::encode(data_hash);
        //     println!("data_hex: {:?}", data_hex);
        //     // hex of prefix + hex of message hash + hex of suffix make the payload
        //     let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
        //     println!("payload: {}", payload);
        //     let payload_hex = hex::encode(payload);
        //     println!("payload_hex: {}", payload_hex);
        //     // put payload into bytes
        //     let mut payload_bytes = [0u8; 49];
        //     payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

        //     // Test against a known signature
        //     // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
        //     let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
        //     println!("signature: {}", signature_hex);
        //     let mut signature_bytes = [0u8; 64];
        //     signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

        //     const ALICE: [u8; 32] = AUTHOR;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

        //     // verify the signature
        //     contract
        //         .verify_sr25519(signature_bytes, payload_bytes)
        //         .unwrap();
        // }

        // #[ink::test]
        // fn test_verify_sr25519_invalid_signature() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let data = "hello";
        //     let mut data_hash = [0u8; 16];
        //     Blake2x128::hash(data.as_bytes(), &mut data_hash);
        //     println!("data_hash: {:?}", data_hash);
        //     let data_hex = hex::encode(data_hash);
        //     println!("data_hex: {:?}", data_hex);
        //     // hex of prefix + hex of message hash + hex of suffix make the payload
        //     let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
        //     println!("payload: {}", payload);
        //     let payload_hex = hex::encode(payload);
        //     println!("payload_hex: {}", payload_hex);
        //     // put payload into bytes
        //     let mut payload_bytes = [0u8; 49];
        //     payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

        //     // Test against a known signature
        //     // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
        //     let signature_hex = "1a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
        //     println!("signature: {}", signature_hex);
        //     let mut signature_bytes = [0u8; 64];
        //     signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

        //     const ALICE: [u8; 32] = AUTHOR;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

        //     // verify the signature
        //     contract
        //         .verify_sr25519(signature_bytes, payload_bytes)
        //         .unwrap_err();
        // }

        // #[ink::test]
        // #[should_panic]
        // fn test_verify_sr25519_invalid_public_key() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let data = "hello";
        //     let mut data_hash = [0u8; 16];
        //     Blake2x128::hash(data.as_bytes(), &mut data_hash);
        //     println!("data_hash: {:?}", data_hash);
        //     let data_hex = hex::encode(data_hash);
        //     println!("data_hex: {:?}", data_hex);
        //     // hex of prefix + hex of message hash + hex of suffix make the payload
        //     let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
        //     println!("payload: {}", payload);
        //     let payload_hex = hex::encode(payload);
        //     println!("payload_hex: {}", payload_hex);
        //     // put payload into bytes
        //     let mut payload_bytes = [0u8; 49];
        //     payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

        //     // Test against a known signature
        //     // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
        //     let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
        //     println!("signature: {}", signature_hex);
        //     let mut signature_bytes = [0u8; 64];
        //     signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

        //     const ALICE: [u8; 32] = [
        //         213, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
        //         44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
        //     ];
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

        //     // verify the signature
        //     let valid = contract.verify_sr25519(signature_bytes, payload_bytes);
        // }

        // #[ink::test]
        // fn test_verify_sr25519_invalid_data() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let data = "hello2";
        //     let mut data_hash = [0u8; 16];
        //     Blake2x128::hash(data.as_bytes(), &mut data_hash);
        //     println!("data_hash: {:?}", data_hash);
        //     let data_hex = hex::encode(data_hash);
        //     println!("data_hex: {:?}", data_hex);
        //     // hex of prefix + hex of message hash + hex of suffix make the payload
        //     let payload = "<Bytes>0x".to_string() + &data_hex + "</Bytes>";
        //     println!("payload: {}", payload);
        //     let payload_hex = hex::encode(payload);
        //     println!("payload_hex: {}", payload_hex);
        //     // put payload into bytes
        //     let mut payload_bytes = [0u8; 49];
        //     payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

        //     // Test against a known signature
        //     // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
        //     let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
        //     println!("signature: {}", signature_hex);
        //     let mut signature_bytes = [0u8; 64];
        //     signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

        //     const ALICE: [u8; 32] = AUTHOR;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

        //     // verify the signature
        //     contract
        //         .verify_sr25519(signature_bytes, payload_bytes)
        //         .unwrap_err();
        // }

        // #[ink::test]
        // fn test_verify_sr25519_invalid_payload() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     let data = "hello";
        //     let mut data_hash = [0u8; 16];
        //     Blake2x128::hash(data.as_bytes(), &mut data_hash);
        //     println!("data_hash: {:?}", data_hash);
        //     let data_hex = hex::encode(data_hash);
        //     println!("data_hex: {:?}", data_hex);
        //     // hex of prefix + hex of message hash + hex of suffix make the payload
        //     let payload = "<Aytes>0x".to_string() + &data_hex + "</Bytes>";
        //     println!("payload: {}", payload);
        //     let payload_hex = hex::encode(payload);
        //     println!("payload_hex: {}", payload_hex);
        //     // put payload into bytes
        //     let mut payload_bytes = [0u8; 49];
        //     payload_bytes.copy_from_slice(hex::decode(payload_hex).unwrap().as_slice());

        //     // Test against a known signature
        //     // sign the payload in polkjs. Note this will be different every time as signature changes randomly, but should always be valid
        //     let signature_hex = "0a7da2b631704cdcfe93c740e41217b9ac667a0c8755d8da1a8232db527f487c87e780d2edc1896aeb6b1bef0bc7c38d9df2135b633eab8bfb1777e82fad3a8f";
        //     println!("signature: {}", signature_hex);
        //     let mut signature_bytes = [0u8; 64];
        //     signature_bytes.copy_from_slice(hex::decode(signature_hex).unwrap().as_slice());

        //     const ALICE: [u8; 32] = AUTHOR;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

        //     // verify the signature
        //     contract
        //         .verify_sr25519(signature_bytes, payload_bytes)
        //         .unwrap_err();
        // }

        // /// Test dapp register and then update
        // #[ink::test]
        // fn test_dapp_register_and_update() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let caller = AccountId::from([0x2; 32]);
        //     let dapp_contract_account = AccountId::from([0x3; 32]);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

        //     // Transfer tokens with the call
        //     let balance_1 = STAKE_THRESHOLD;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_1);

        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // register the dapp
        //     contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

        //     // check the dapp exists in the hashmap
        //     assert!(contract.dapps.get(dapp_contract_account).is_some());

        //     // check the various attributes are correct
        //     let dapp = contract.dapps.get(dapp_contract_account).unwrap();
        //     assert_eq!(dapp.owner, caller);

        //     // account is marked as active as tokens have been paid
        //     assert_eq!(dapp.status, GovernanceStatus::Active);
        //     assert_eq!(dapp.balance, balance_1);

        //     // Transfer tokens with the call
        //     let balance_2 = STAKE_THRESHOLD;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);

        //     // run the register function again for the same (caller, contract) pair, adding more
        //     // tokens
        //     contract.dapp_update(dapp_contract_account, DappPayee::Any, caller);

        //     // check the various attributes are correct
        //     let dapp = contract.dapps.get(dapp_contract_account).unwrap();

        //     // account is marked as active as tokens have been paid
        //     assert_eq!(dapp.status, GovernanceStatus::Active);
        //     assert_eq!(dapp.balance, balance_1 + balance_2);
        //     assert!(contract
        //         .dapp_accounts
        //         .get()
        //         .unwrap()
        //         .contains(&dapp_contract_account));
        // }

        // /// Test dapp fund account
        // #[ink::test]
        // fn test_dapp_fund() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let caller = AccountId::from([0x2; 32]);
        //     let dapp_contract = AccountId::from([0x3; 32]);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

        //     // Transfer tokens with the register call
        //     let balance_1 = 100;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_1);

        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

        //     // register the dapp
        //     contract.dapp_register(dapp_contract, DappPayee::Dapp);

        //     // Transfer tokens with the fund call
        //     let balance_2 = 200;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);
        //     contract.dapp_fund(dapp_contract);

        //     // check the total account balance is correct
        //     let dapp = contract.dapps.get(dapp_contract).unwrap();
        //     assert_eq!(dapp.balance, balance_1 + balance_2);
        // }

        // /// Test dapp cancel
        // #[ink::test]
        // fn test_dapp_cancel() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     // give the contract some funds
        //     set_account_balance(contract.env().account_id(), 1000000000);
        //     let caller = AccountId::from([0x2; 32]);
        //     let contract_account = AccountId::from([0x3; 32]);
        //     let callers_initial_balance =
        //         ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>(caller)
        //             .unwrap();

        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(contract_account);

        //     // Make sure the dapp account is a contract
        //     let result =
        //         ink::env::test::is_contract::<ink::env::DefaultEnvironment>(contract_account);
        //     assert!(result);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

        //     // Transfer tokens with the register call
        //     let balance = 200;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

        //     // register the dapp
        //     contract.dapp_register(contract_account, DappPayee::Dapp);

        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

        //     // Transfer tokens with the fund call
        //     contract.dapp_deregister(contract_account).ok();

        //     // check the dapp has been removed
        //     assert!(contract.dapps.get(contract_account).is_none());

        //     // Make sure the funds are returned to the caller
        //     let callers_balance =
        //         ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>(caller)
        //             .unwrap();
        //     assert_eq!(callers_initial_balance + balance, callers_balance);
        // }

        // /// Test provider approve
        // #[ink::test]
        // fn test_provider_approve() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // Register the provider
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 1);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // Call from the provider account to add data and stake tokens
        //     let balance = 2000000000000;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider);
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

        //     let provider = contract.providers.get(provider_account).unwrap();
        //     // can only add data set after staking
        //     contract.provider_set_dataset(root1, root2).ok();

        //     // Register the dapp
        //     let dapp_caller_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
        //     // Give the dap a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

        //     //Dapp User commit
        //     let dapp_user_account = AccountId::from([0x5; 32]);
        //     let user_root = str_to_hash("user merkle tree root".to_string());

        //     // Call from the provider account to mark the solution as approved
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let solution_id = user_root;
        //     contract.provider_commit(Commit {
        //         dapp: dapp_contract_account,
        //         dataset_id: user_root,
        //         status: CaptchaStatus::Approved,
        //         provider: provider_account,
        //         user: dapp_user_account,
        //         completed_at: 0,
        //         requested_at: 0,
        //         id: solution_id,
        //         user_signature_part1: [0x0; 32],
        //         user_signature_part2: [0x0; 32],
        //     });
        //     let commitment = contract
        //         .captcha_solution_commitments
        //         .get(solution_id)
        //         .unwrap();
        //     assert_eq!(commitment.status, CaptchaStatus::Approved);
        //     let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account).unwrap();
        //     let new_provider_balance = contract.get_provider_balance(provider_account).unwrap();
        //     assert_eq!(balance - Balance::from(fee), new_dapp_balance);
        //     assert_eq!(balance + Balance::from(fee), new_provider_balance);

        //     // Now make sure that the provider cannot later set the solution to disapproved and make
        //     // sure that the dapp balance is unchanged

        //     contract.provider_commit(Commit {
        //         dapp: dapp_contract_account,
        //         dataset_id: user_root,
        //         status: CaptchaStatus::Disapproved,
        //         provider: provider_account,
        //         user: dapp_user_account,
        //         completed_at: 0,
        //         requested_at: 0,
        //         id: solution_id,
        //         user_signature_part1: [0x0; 32],
        //         user_signature_part2: [0x0; 32],
        //     });
        //     let commitment = contract
        //         .captcha_solution_commitments
        //         .get(solution_id)
        //         .unwrap();
        //     assert_eq!(commitment.status, CaptchaStatus::Approved);
        //     assert_eq!(
        //         balance - Balance::from(fee),
        //         contract.get_dapp_balance(dapp_contract_account).unwrap()
        //     );
        //     assert_eq!(
        //         balance + Balance::from(fee),
        //         contract.get_provider_balance(provider_account).unwrap()
        //     );
        // }

        // /// Test provider cannot approve invalid solution id
        // #[ink::test]
        // fn test_provider_approve_invalid_id() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // Register the provider
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // Call from the provider account to add data and stake tokens
        //     let balance = 2000000000000;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider);
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

        //     // can only add data set after staking
        //     contract.provider_set_dataset(root1, root2).ok();

        //     // Register the dapp
        //     let dapp_caller_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
        //     // Give the dap a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.dapp_register(dapp_contract_account, DappPayee::Dapp);
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

        //     //Dapp User commit
        //     let dapp_user_account = AccountId::from([0x5; 32]);
        //     let user_root = str_to_hash("user merkle tree root".to_string());

        //     // Call from the provider account to mark the wrong solution as approved
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let solution_id = str_to_hash("id that does not exist".to_string());

        //     let result = contract.provider_commit(Commit {
        //         dapp: dapp_contract_account,
        //         dataset_id: user_root,
        //         status: CaptchaStatus::Approved,
        //         provider: provider_account,
        //         user: dapp_user_account,
        //         completed_at: 0,
        //         requested_at: 0,
        //         id: solution_id,
        //         user_signature_part1: [0x0; 32],
        //         user_signature_part2: [0x0; 32],
        //     });
        // }

        // /// Test provider disapprove
        // #[ink::test]
        // fn test_provider_disapprove() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // Register the provider
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 1);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // Call from the provider account to add data and stake tokens
        //     let balance = 2000000000000;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider).unwrap();
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
        //     // can only add data set after staking
        //     contract.provider_set_dataset(root1, root2).unwrap();
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

        //     // Register the dapp
        //     let dapp_caller_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
        //     // Give the dap a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract
        //         .dapp_register(dapp_contract_account, DappPayee::Dapp)
        //         .unwrap();

        //     //Dapp User commit
        //     let dapp_user_account = AccountId::from([0x5; 32]);
        //     let user_root = str_to_hash("user merkle tree root".to_string());

        //     // Call from the provider account to mark the solution as disapproved
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let solution_id = user_root;
        //     contract
        //         .provider_commit(Commit {
        //             dapp: dapp_contract_account,
        //             dataset_id: user_root,
        //             status: CaptchaStatus::Disapproved,
        //             provider: provider_account,
        //             user: dapp_user_account,
        //             completed_at: 0,
        //             requested_at: 0,
        //             id: solution_id,
        //             user_signature_part1: [0x0; 32],
        //             user_signature_part2: [0x0; 32],
        //         })
        //         .unwrap();
        //     let commitment = contract
        //         .captcha_solution_commitments
        //         .get(solution_id)
        //         .unwrap();
        //     assert_eq!(commitment.status, CaptchaStatus::Disapproved);
        //     let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account).unwrap();
        //     let new_provider_balance = contract.get_provider_balance(provider_account).unwrap();
        //     assert_eq!(balance - Balance::from(fee), new_dapp_balance);
        //     assert_eq!(balance + Balance::from(fee), new_provider_balance);

        //     // Now make sure that the provider cannot later set the solution to approved
        //     contract.provider_commit(Commit {
        //         dapp: dapp_contract_account,
        //         dataset_id: user_root,
        //         status: CaptchaStatus::Approved,
        //         provider: provider_account,
        //         user: dapp_user_account,
        //         completed_at: 0,
        //         requested_at: 0,
        //         id: solution_id,
        //         user_signature_part1: [0x0; 32],
        //         user_signature_part2: [0x0; 32],
        //     });
        //     let commitment = contract
        //         .captcha_solution_commitments
        //         .get(solution_id)
        //         .unwrap();
        //     assert_eq!(commitment.status, CaptchaStatus::Disapproved);
        //     assert_eq!(
        //         balance - Balance::from(fee),
        //         contract.get_dapp_balance(dapp_contract_account).unwrap()
        //     );
        //     assert_eq!(
        //         balance + Balance::from(fee),
        //         contract.get_provider_balance(provider_account).unwrap()
        //     );
        // }

        // /// Test dapp user is human
        // #[ink::test]
        // fn test_dapp_operator_is_human_user() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // Register the provider
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // Call from the provider account to add data and stake tokens
        //     let balance = 2000000000000;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider).unwrap();
        //     // can only add data set after staking
        //     contract.provider_set_dataset(root1, root2);

        //     // Register the dapp
        //     let dapp_caller_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
        //     // Give the dap a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract
        //         .dapp_register(dapp_contract_account, DappPayee::Dapp)
        //         .unwrap();

        //     //Dapp User commit
        //     let dapp_user_account = AccountId::from([0x5; 32]);
        //     // Call from the Dapp User Account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);
        //     let user_root = str_to_hash("user merkle tree root".to_string());

        //     // Call from the provider account to mark the solution as disapproved
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let solution_id = user_root;
        //     contract.provider_commit(Commit {
        //         dapp: dapp_contract_account,
        //         dataset_id: user_root,
        //         status: CaptchaStatus::Disapproved,
        //         provider: provider_account,
        //         user: dapp_user_account,
        //         completed_at: 0,
        //         requested_at: 0,
        //         id: solution_id,
        //         user_signature_part1: [0x0; 32],
        //         user_signature_part2: [0x0; 32],
        //     });
        //     let commitment = contract
        //         .captcha_solution_commitments
        //         .get(solution_id)
        //         .unwrap();
        //     assert_eq!(commitment.status, CaptchaStatus::Disapproved);

        //     // Now make sure that the dapp user does not pass the human test
        //     let result = contract.dapp_operator_is_human_user(dapp_user_account, 80 * 2);
        //     assert!(!result.unwrap());
        // }

        // /// Test non-existent dapp account has zero balance
        // #[ink::test]
        // fn test_non_existent_dapp_account_has_zero_balance() {
        //     let dapp_account = AccountId::from([0x2; 32]);
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     contract.get_dapp_balance(dapp_account).unwrap_err();
        // }

        // /// Test non-existent provider account has zero balance
        // #[ink::test]
        // fn test_non_existent_provider_account_has_zero_balance() {
        //     let provider_account = AccountId::from([0x2; 32]);
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     contract.get_provider_balance(provider_account).unwrap_err();
        // }

        // // // Test get random provider
        // #[ink::test]
        // fn test_get_random_active_provider() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let provider_account = AccountId::from([0x2; 32]);
        //     let url: Vec<u8> = vec![1, 2, 3];
        //     let fee: u32 = 100;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract.provider_register(url.clone(), fee, Payee::Dapp);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let balance = 20000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Dapp);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     contract.provider_set_dataset(root1, root2);
        //     let registered_provider_account = contract.providers.get(provider_account);
        //     // Register the dapp
        //     let dapp_caller_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
        //     // Give the dap a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.dapp_register(dapp_contract_account, DappPayee::Dapp);
        //     let selected_provider =
        //         contract.get_random_active_provider(provider_account, dapp_contract_account);
        //     assert!(
        //         selected_provider.unwrap().provider == registered_provider_account.unwrap()
        //     );
        // }

        // // // Test get random provider
        // #[ink::test]
        // fn test_get_random_active_provider_dapp_any() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     let provider_account = AccountId::from([0x2; 32]);
        //     let dapp_user_account = AccountId::from([0x30; 32]);
        //     let url: Vec<u8> = vec![1, 2, 3];
        //     let fee: u32 = 100;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract.provider_register(url.clone(), fee, Payee::Provider);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let balance = 20000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url.clone(), fee, Payee::Provider);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     contract.provider_set_dataset(root1, root2);

        //     // Register the dapp
        //     let dapp_caller_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
        //     // Give the dapp a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.dapp_register(dapp_contract_account, DappPayee::Any);

        //     // Call from the dapp_user_account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);

        //     // Call as dapp user and get a random provider
        //     let selected_provider =
        //         contract.get_random_active_provider(dapp_user_account, dapp_contract_account);
        //     assert_eq!(selected_provider.unwrap().provider_account, provider_account);

        //     // Switch the provider payee to Dapp
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract.provider_update(url, fee, Payee::Dapp);

        //     // Call from the dapp_user_account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);

        //     // Call as dapp user and get a random provider. Ensure that the provider is still
        //     // selected despite the payee change
        //     let selected_provider =
        //         contract.get_random_active_provider(dapp_user_account, dapp_contract_account);
        //     assert_eq!(selected_provider.unwrap().provider_account, provider_account);
        // }

        // /// Test provider can supply a dapp user commit for themselves and approve or disapprove it
        // #[ink::test]
        // fn test_provider_commit_and_approve_and_disapprove() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // Register the provider
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // Call from the provider account to add data and stake tokens
        //     let balance = 2000000000000;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider);
        //     // can only add data set after staking
        //     contract.provider_set_dataset(root1, root2).ok();

        //     // Register the dapp
        //     let dapp_caller_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
        //     // Give the dap a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

        //     // Call from the provider account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);

        //     //Dapp User commit and approve
        //     let dapp_user_account = AccountId::from([0x5; 32]);
        //     let user_root1 = str_to_hash("user merkle tree root to approve".to_string());
        //     contract.provider_commit(Commit {
        //         dapp: dapp_contract_account,
        //         dataset_id: user_root1,
        //         status: CaptchaStatus::Approved,
        //         provider: provider_account,
        //         user: dapp_user_account,
        //         completed_at: 0,
        //         requested_at: 0,
        //         id: user_root1,
        //         user_signature_part1: [0x0; 32],
        //         user_signature_part2: [0x0; 32],
        //     });

        //     // Get the commitment and make sure it is approved
        //     let commitment = contract
        //         .get_captcha_solution_commitment(user_root1)
        //         .unwrap();
        //     assert_eq!(commitment.status, CaptchaStatus::Approved);

        //     //Dapp User commit and disapprove
        //     let dapp_user_account = AccountId::from([0x5; 32]);
        //     let user_root2 = str_to_hash("user merkle tree root to disapprove".to_string());
        //     contract.provider_commit(Commit {
        //         dapp: dapp_contract_account,
        //         dataset_id: root2,
        //         status: CaptchaStatus::Disapproved,
        //         provider: provider_account,
        //         user: dapp_user_account,
        //         completed_at: 0,
        //         requested_at: 0,
        //         id: user_root2,
        //         user_signature_part1: [0x0; 32],
        //         user_signature_part2: [0x0; 32],
        //     });

        //     // Get the commitment and make sure it is disapproved
        //     let commitment = contract
        //         .get_captcha_solution_commitment(user_root2)
        //         .unwrap();
        //     assert_eq!(commitment.status, CaptchaStatus::Disapproved);
        // }

        // /// Test provider cannot supply a dapp user commit for a different Provider
        // #[ink::test]
        // fn test_provider_cannot_supply_commit_for_a_different_provider() {
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);

        //     // Register the provider
        //     let (provider_account, url, fee) = generate_provider_data(0x2, "4242", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // Call from the provider account to add data and stake tokens
        //     let balance = 2000000000000;
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider);
        //     // can only add data set after staking
        //     contract.provider_set_dataset(root1, root2).ok();

        //     // Register the dapp
        //     let dapp_user_account = AccountId::from([0x3; 32]);
        //     let dapp_contract_account = AccountId::from([0x4; 32]);
        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

        //     // Call from the dapp_contract_account
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_contract_account);
        //     // Give the dap a balance
        //     let balance = 2000000000000;
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

        //     // Register a second provider
        //     let (provider_account2, url, fee) = generate_provider_data(0x5, "2424", 0);
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account2);
        //     contract
        //         .provider_register(url.clone(), fee, Payee::Dapp)
        //         .unwrap();

        //     // Call from the provider account to add data and stake tokens
        //     let balance = 2000000000000;
        //     let root1 = str_to_hash("merkle tree1".to_string());
        //     let root2 = str_to_hash("merkle tree2".to_string());
        //     ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
        //     contract.provider_update(url, fee, Payee::Provider);
        //     // can only add data set after staking
        //     contract.provider_set_dataset(root1, root2).ok();

        //     // Call from dapp_user_commit from provider_account2 to supply a commit for provider_account
        //     // Should not be authorised
        //     let dapp_user_account = AccountId::from([0x6; 32]);
        //     let user_root = str_to_hash("user merkle tree root".to_string());
        // }

        // /// Get some operator accounts as a vector
        // fn get_operator_accounts() -> Vec<AccountId> {
        //     let operator_account1 = AccountId::from([0x1; 32]);
        //     let operator_account2 = AccountId::from([0x10; 32]);
        //     let mut operator_accounts = vec![operator_account1, operator_account2];
        //     operator_accounts
        // }

        // fn setup_contract() -> (AccountId, AccountId, Vec<AccountId>, Captcha) {
        //     let op1 = AccountId::from([0x1; 32]);
        //     let op2 = AccountId::from([0x2; 32]);
        //     let ops = vec![op1, op2];
        //     // initialise the contract
        //     reset_caller(); reset_callee();

        //     let mut contract = get_contract(0);
        //     (op1, op2, ops, contract)
        // }

        // /// Test dapp cannot register if existing dapp in place
        // #[ink::test]
        // fn test_dapp_register_existing() {
        //     let (op1, op2, ops, mut contract) = setup_contract();
        //     let dapp_contract = AccountId::from([0x4; 32]);

        //     // Mark the the dapp account as being a contract on-chain
        //     ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract);

        //     // the caller should be someone who isn't an operator
        //     ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(
        //         [0x3; 32],
        //     ));

        //     contract
        //         .dapp_register(dapp_contract, DappPayee::Dapp)
        //         .unwrap();
        //     assert_eq!(
        //         Error::DappExists,
        //         contract
        //             .dapp_register(dapp_contract, DappPayee::Dapp)
        //             .unwrap_err()
        //     );
        // }
    }
}
