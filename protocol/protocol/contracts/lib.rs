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

pub use self::prosopo::{Prosopo, ProsopoRef};

/// Print and return an error in ink
macro_rules! error {
    ($err:expr) => {
        {
            let _self = get_self!();
            ink::env::debug_println!("ERROR in {}() at block {} with caller {:?}\n'{:?}'", function_name!(), _self.env().block_number(), _self.env().caller(), $err);
            Err($err)
        }
    };
}

/// Concatenate two arrays (a and b) into a new array (c)
fn concat_u8<const A: usize, const B: usize, const C: usize>(
    a: &[u8; A],
    b: &[u8; B],
) -> [u8; C] {
    let mut c = [0; C];
    c[..A].copy_from_slice(a);
    c[A..A + B].copy_from_slice(b);
    c
}

#[allow(unused_macros)]
#[named_functions_macro::named_functions] // allows the use of the function_name!() macro
#[inject_self_macro::inject_self] // allows the use of the get_self!() macro
#[ink::contract]
pub mod prosopo {

    use ink::env::debug_println as debug;
    use ink::env::hash::{Blake2x128, CryptoHash, HashOutput};
    use ink::prelude::collections::btree_set::BTreeSet;
    use ink::prelude::vec::Vec;
    #[allow(unused_imports)] // do not remove StorageLayout, it is used in derives
    use ink::storage::{traits::StorageLayout, Mapping};

    /// GovernanceStatus relates to DApps and Providers and determines if they are active or not
    #[derive(Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum GovernanceStatus {
        Active,
        Suspended,
        #[default]
        Deactivated,
    }

    /// CaptchaStatus is the status of a CaptchaSolutionCommitment, submitted by a DappUser
    #[derive(Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum CaptchaStatus {
        Pending,
        Approved,
        #[default]
        Disapproved,
    }

    /// Payee is the recipient of any fees that are paid when a CaptchaSolutionCommitment is approved
    #[derive(Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum Payee {
        Provider,
        Dapp,
        #[default]
        None,
    }

    /// Providers are suppliers of human verification methods (captchas, etc.) to DappUsers, either
    /// paying or receiving a fee for this service.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Provider {
        status: GovernanceStatus,
        balance: Balance,
        // an amount in the base unit of the default parachain token (e.g. Planck on chains using DOT)
        fee: u32,
        payee: Payee,
        service_origin: Hash,
        dataset_id: Hash,
        dataset_id_content: Hash,
    }

    /// RandomProvider is selected randomly by the contract for the client side application
    #[derive(PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct RandomProvider {
        provider_id: AccountId,
        provider: Provider,
        block_number: u32,
    }

    /// Operators are controllers of this contract with admin rights
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Operator {
        status: GovernanceStatus,
    }

    /// CaptchaData contains the hashed root of a Provider's dataset and is used to verify that
    /// the captchas received by a DappUser did belong to the Provider's original dataset
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct CaptchaData {
        provider: AccountId,
        dataset_id: Hash,
        captcha_type: u16,
    }

    /// CaptchaSolutionCommitments are submitted by DAppUsers upon completion of one or more
    /// Captchas. They serve as proof of captcha completion to the outside world and can be used
    /// in dispute resolution.
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct CaptchaSolutionCommitment {
        // the Dapp User Account
        account: AccountId,
        // The captcha dataset id (dataset_id in Provider / CaptchaData)
        dataset_id: Hash,
        // Status of this solution - correct / incorrect?
        status: CaptchaStatus,
        // The Dapp Contract AccountId that the Dapp User wants to interact with
        contract: AccountId,
        // The Provider AccountId that is permitted to approve or disapprove the commitment
        provider: AccountId,
        // Time of completion
        completed_at: Timestamp,
    }

    /// DApps are distributed apps who want their users to be verified by Providers, either paying
    /// or receiving a fee for this service.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Dapp {
        status: GovernanceStatus,
        balance: Balance,
        owner: AccountId,
        min_difficulty: u16,
        // client's Dapp URL
        client_origin: Hash,
    }

    /// Users are the users of DApps that are required to be verified as human before they are
    /// allowed to interact with the DApps' contracts.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct User {
        correct_captchas: u64,
        incorrect_captchas: u64,
        // commented until block timestamp is available in ink unit tests
        // created: Timestamp,
        // updated: Timestamp,
        last_correct_captcha: Timestamp,
        last_correct_captcha_dapp_id: AccountId,
    }

    #[derive(scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct LastCorrectCaptcha {
        pub before_ms: u32,
        pub dapp_id: AccountId,
    }

    // Contract storage
    #[ink(storage)]
    pub struct Prosopo {
        //tokenContract: AccountId,
        providers: Mapping<AccountId, Provider>,
        provider_accounts: Mapping<GovernanceStatus, BTreeSet<AccountId>>,
        service_origins: Mapping<Hash, ()>,
        captcha_data: Mapping<Hash, CaptchaData>,
        captcha_solution_commitments: Mapping<Hash, CaptchaSolutionCommitment>,
        provider_stake_default: u128,
        dapp_stake_default: u128,
        dapps: Mapping<AccountId, Dapp>,
        dapp_accounts: Vec<AccountId>,
        //dapps_owners: Mapping<AccountId, AccountId>,
        operators: Mapping<AccountId, Operator>,
        operator_accounts: Vec<AccountId>,
        //disputes: Mapping<u64, Dispute>
        status: GovernanceStatus,
        operator_stake_default: u64,
        operator_fee_currency: Hash,
        dapp_users: Mapping<AccountId, User>,
        dapp_user_accounts: Vec<AccountId>,
    }

    // Event emitted when a new provider registers
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderRegister {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a new provider deregisters
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderDeregister {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a new provider is updated
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderUpdate {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a provider stakes
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderStake {
        #[ink(topic)]
        account: AccountId,
        value: Balance,
    }

    // Event emitted when a provider adds a data set
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderAddDataset {
        #[ink(topic)]
        account: AccountId,
        dataset_id: Hash,
        dataset_id_content: Hash,
    }

    // Event emitted when a provider unstakes
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderUnstake {
        #[ink(topic)]
        account: AccountId,
        value: Balance,
    }

    // Event emitted when a provider approves a solution
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderApprove {
        #[ink(topic)]
        captcha_solution_commitment_id: Hash,
    }

    // Event emitted when a provider disapproves a solution
    #[ink(event)]
    #[derive(Debug)]
    pub struct ProviderDisapprove {
        #[ink(topic)]
        captcha_solution_commitment_id: Hash,
    }

    // Event emitted when a dapp registers
    #[ink(event)]
    #[derive(Debug)]
    pub struct DappRegister {
        #[ink(topic)]
        contract: AccountId,
        owner: AccountId,
        client_origin: Hash,
        value: Balance,
    }

    // Event emitted when a dapp updates
    #[ink(event)]
    #[derive(Debug)]
    pub struct DappUpdate {
        #[ink(topic)]
        contract: AccountId,
        owner: AccountId,
        client_origin: Hash,
        value: Balance,
    }

    // Event emitted when a dapp funds
    #[ink(event)]
    #[derive(Debug)]
    pub struct DappFund {
        #[ink(topic)]
        contract: AccountId,
        value: Balance,
    }

    // Event emitted when a dapp cancels
    #[ink(event)]
    #[derive(Debug)]
    pub struct DappCancel {
        #[ink(topic)]
        contract: AccountId,
        value: Balance,
    }

    // Event emitted when a dapp user commits a solution hash
    #[ink(event)]
    #[derive(Debug)]
    pub struct DappUserCommit {
        #[ink(topic)]
        account: AccountId,
        merkle_tree_root: Hash,
        contract: AccountId,
        dataset_id: Hash,
    }

    /// The Prosopo error types
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Returned if calling account is not authorised to perform action
        NotAuthorised,
        /// Returned if not enough contract balance to fulfill a request is available.
        ContractInsufficientFunds,
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
        /// Returned if service_origin is already used by another provider
        ProviderServiceOriginUsed,
        /// Returned if requested captcha data id is unavailable
        DuplicateCaptchaDataId,
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
        CaptchaSolutionCommitmentDoesNotExist,
        /// Returned if solution commitment already exists when it should not
        CaptchaSolutionCommitmentExists,
        /// Returned if dapp user does not exist when it should
        DappUserDoesNotExist,
        /// Returned if there are no active providers
        NoActiveProviders,
        /// Returned if the dataset ID and dataset ID with solutions are identical
        DatasetIdSolutionsSame,
    }

    impl Prosopo {

        /// Constructor
        #[ink(constructor, payable)]
        pub fn default(
            operator_account: AccountId,
            provider_stake_default: u128,
            dapp_stake_default: u128,
        ) -> Self {
            let operator = Operator {
                status: GovernanceStatus::Active,
            };
            let mut operators = Mapping::new();
            operators.insert(operator_account, &operator);
            let mut operator_accounts = Vec::new();
            operator_accounts.push(operator_account);
            Self {
                providers: Default::default(),
                provider_accounts: Default::default(),
                service_origins: Default::default(),
                captcha_data: Default::default(),
                operator_accounts,
                status: Default::default(),
                operator_stake_default: 0,
                operator_fee_currency: Default::default(),
                dapp_users: Default::default(),
                operators,
                provider_stake_default,
                dapp_stake_default,
                dapps: Default::default(),
                captcha_solution_commitments: Default::default(),
                dapp_accounts: Default::default(),
                dapp_user_accounts: Default::default(),
            }
        }

        /// Get contract provider minimum stake default.
        #[ink(message)]
        pub fn get_provider_stake_default(&self) -> u128 {
            self.provider_stake_default
        }

        /// Get contract dapp minimum stake default.
        #[ink(message)]
        pub fn get_dapp_stake_default(&self) -> u128 {
            self.dapp_stake_default
        }

        /// Register a provider, their service origin and fee
        #[ink(message)]
        pub fn provider_register(
            &mut self,
            service_origin: Hash,
            fee: u32,
            payee: Payee,
            provider_account: AccountId,
        ) -> Result<(), Error> {
            let balance: u128 = 0;
            // this function is for registration only
            if self.providers.get(&provider_account).is_some() {
                return error!(Error::ProviderDoesNotExist);
            }
            // prevent duplicate service origins
            if self.service_origins.get(&service_origin).is_some() {
                return error!(Error::ProviderServiceOriginUsed);
            }
            // add a new provider
            let provider = Provider {
                status: GovernanceStatus::Deactivated,
                balance,
                fee,
                service_origin,
                dataset_id: Hash::default(),
                dataset_id_content: Hash::default(),
                payee,
            };
            self.providers.insert(provider_account, &provider);
            self.service_origins.insert(service_origin, &());
            let mut provider_accounts_map = self
                .provider_accounts
                .get(GovernanceStatus::Deactivated)
                .unwrap_or_default();
            provider_accounts_map.insert(provider_account);
            self.provider_accounts
                .insert(GovernanceStatus::Deactivated, &provider_accounts_map);
            self.env().emit_event(ProviderRegister {
                account: provider_account,
            });
            Ok(())
        }

        /// Update an existing provider, their service origin, fee and deposit funds
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_update(
            &mut self,
            service_origin: Hash,
            fee: u32,
            payee: Payee,
            provider_account: AccountId,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            if caller != provider_account {
                return error!(Error::NotAuthorised);
            }

            // this function is for updating only, not registering
            if self.providers.get(&provider_account).is_none() {
                return error!(Error::ProviderDoesNotExist);
            }

            let existing = self.get_provider_details(provider_account)?;

            // prevent duplicate service origins
            if existing.service_origin != service_origin {
                if self.service_origins.get(service_origin).is_some() {
                    return error!(Error::ProviderServiceOriginUsed);
                } else {
                    self.service_origins.remove(existing.service_origin);
                    self.service_origins.insert(service_origin, &());
                }
            }

            let old_status = existing.status;
            let mut new_status = existing.status;
            let balance = existing.balance + self.env().transferred_value();

            if balance >= self.provider_stake_default && existing.dataset_id != Hash::default() {
                new_status = GovernanceStatus::Active;
            }

            // update an existing provider
            let provider = Provider {
                status: new_status,
                balance,
                fee,
                service_origin,
                dataset_id: existing.dataset_id,
                dataset_id_content: existing.dataset_id_content,
                payee,
            };

            self.provider_change_status(provider_account, old_status, new_status);
            self.providers.insert(provider_account, &provider);

            self.env().emit_event(ProviderUpdate {
                account: provider_account,
            });
            Ok(())
        }

        /// Switch the `provider_account` between indexes in `self.provider_accounts`
        fn provider_change_status(
            &mut self,
            provider_account: AccountId,
            current_provider_status: GovernanceStatus,
            new_status: GovernanceStatus,
        ) {
            if current_provider_status != new_status {
                // Retrieve indexes from storage mapping
                let mut current_status_provider_accounts = self
                    .provider_accounts
                    .get(current_provider_status)
                    .unwrap_or_default();
                let mut new_status_provider_accounts =
                    self.provider_accounts.get(new_status).unwrap_or_default();

                // Move provider to the correct index
                current_status_provider_accounts.remove(&provider_account);
                new_status_provider_accounts.insert(provider_account);

                // Store mapping
                self.provider_accounts
                    .insert(current_provider_status, &current_status_provider_accounts);
                self.provider_accounts
                    .insert(new_status, &new_status_provider_accounts);
            }
        }

        /// De-Register a provider by setting their status to Deactivated
        #[ink(message)]
        pub fn provider_deregister(&mut self, provider_account: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller == provider_account {
                // if self.operators.get(&caller) {

                // Get provider
                let mut provider = self.providers.get(&provider_account).unwrap();

                // Update provider status
                self.provider_change_status(
                    provider_account,
                    provider.status,
                    GovernanceStatus::Deactivated,
                );
                provider.status = GovernanceStatus::Deactivated;
                self.providers.insert(provider_account, &provider);

                self.env().emit_event(ProviderDeregister {
                    account: provider_account,
                });
                //}
            } else {
                return error!(Error::NotAuthorised);
            }
            Ok(())
        }

        /// Unstake and deactivate the provider's service, returning stake
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_unstake(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if self.providers.get(&caller).is_some() {
                let provider = self.get_provider_details(caller)?;
                let balance = provider.balance;
                if balance > 0 {
                    self.env().transfer(caller, balance).ok();
                    self.provider_deregister(caller)?;
                    self.env().emit_event(ProviderUnstake {
                        account: caller,
                        value: balance,
                    });
                }
            } else {
                return error!(Error::ProviderDoesNotExist);
            }
            Ok(())
        }

        /// Add a new data set
        #[ink(message)]
        pub fn provider_add_dataset(
            &mut self,
            dataset_id: Hash,
            dataset_id_content: Hash,
        ) -> Result<(), Error> {
            if dataset_id == dataset_id_content {
                return error!(Error::DatasetIdSolutionsSame);
            }
            let provider_id = self.env().caller();
            // the calling account must belong to the provider
            self.validate_provider_exists_and_has_funds(provider_id)?;
            let dataset = CaptchaData {
                provider: provider_id,
                dataset_id,
                captcha_type: 0,
            };

            // create a new id and insert details of the new captcha data set if it doesn't exist
            if self.captcha_data.get(dataset_id).is_none() {
                self.captcha_data.insert(dataset_id, &dataset);
            }

            // set the captcha data id on the provider
            let mut provider = self.providers.get(&provider_id).unwrap();
            provider.dataset_id = dataset_id;
            provider.dataset_id_content = dataset_id_content;
            let old_status = provider.status;

            // change the provider status to active if it was not active
            if provider.status != GovernanceStatus::Active
                && provider.balance >= self.provider_stake_default
                && dataset_id != Hash::default()
            {
                provider.status = GovernanceStatus::Active;
                self.provider_change_status(provider_id, old_status, provider.status);
            }

            self.providers.insert(provider_id, &provider);

            // emit event
            self.env().emit_event(ProviderAddDataset {
                account: provider_id,
                dataset_id,
                dataset_id_content,
            });

            Ok(())
        }

        /// Register a dapp
        #[ink(message)]
        pub fn dapp_register(
            &mut self,
            client_origin: Hash,
            contract: AccountId,
            optional_owner: Option<AccountId>,
        ) {
            let caller = self.env().caller();
            // the caller can pass an owner or pass none and be made the owner
            let owner = optional_owner.unwrap_or(caller);
            let transferred = self.env().transferred_value();
            // enforces a one to one relation between caller and dapp
            if self.dapps.get(&contract).is_none() {
                // mark the account as suspended if it is new and no funds have been transferred
                let status = if transferred > 0 {
                    GovernanceStatus::Active
                } else {
                    GovernanceStatus::Suspended
                };
                let dapp = Dapp {
                    status,
                    balance: transferred,
                    owner,
                    min_difficulty: 1,
                    client_origin,
                };
                // keying on contract allows owners to own many contracts
                self.dapps.insert(contract, &dapp);
                self.dapp_accounts.push(contract);
                // emit event
                self.env().emit_event(DappRegister {
                    contract,
                    owner,
                    client_origin,
                    value: transferred,
                });
            } else {
                // dapp exists so update it instead
                self.dapp_update(owner, transferred, client_origin, contract, caller);
            }
        }

        /// Update a dapp with new funds, setting status as appropriate
        fn dapp_update(
            &mut self,
            owner: AccountId,
            transferred: u128,
            client_origin: Hash,
            contract: AccountId,
            caller: AccountId,
        ) {
            if self.dapps.get(&contract).is_some() {
                let mut dapp = self.dapps.get(&contract).unwrap();
                // only allow the owner to make changes to the dapp (including funding?!)
                if dapp.owner == caller {
                    let total = dapp.balance + transferred;
                    dapp.balance = total;
                    dapp.client_origin = client_origin;
                    dapp.owner = owner;
                    if dapp.balance > 0 {
                        dapp.status = GovernanceStatus::Active;
                    } else {
                        dapp.status = GovernanceStatus::Suspended;
                    }
                    self.dapps.insert(contract, &dapp);
                    // emit event
                    self.env().emit_event(DappUpdate {
                        contract,
                        owner,
                        client_origin,
                        value: total,
                    });
                } else {
                    //return the transferred balance to the caller as they do not own the contract
                    self.env().transfer(caller, transferred).ok();
                }
            }
        }

        /// Fund dapp account to pay for services, if the Dapp caller is registered in self.dapps
        #[ink(message)]
        #[ink(payable)]
        pub fn dapp_fund(&mut self, contract: AccountId) {
            let caller = self.env().caller();
            let transferred = self.env().transferred_value();
            if self.dapps.get(&contract).is_some() {
                let mut dapp = self.dapps.get(&contract).unwrap();
                let total = dapp.balance + transferred;
                dapp.balance = total;
                if dapp.balance > 0 {
                    dapp.status = GovernanceStatus::Active;
                    self.env().emit_event(DappFund {
                        contract,
                        value: total,
                    });
                } else {
                    // Suspended as dapp has no funds
                    dapp.status = GovernanceStatus::Suspended;
                }
                self.dapps.insert(contract, &dapp);
            } else {
                //return the transferred balance to the caller
                self.env().transfer(caller, transferred).ok();
            }
        }

        /// Cancel services as a dapp, returning remaining tokens
        #[ink(message)]
        pub fn dapp_cancel(&mut self, contract: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();

            if self.dapps.get(&contract).is_none() {
                return error!(Error::DappDoesNotExist);
            }
            let dapp = self.get_dapp_details(contract)?;

            if dapp.owner != caller {
                return error!(Error::NotAuthorised);
            }

            let balance = dapp.balance;
            if dapp.balance > 0 {
                self.env().transfer(caller, dapp.balance).ok();
            }
            self.dapp_deregister(contract);
            self.env().emit_event(DappCancel {
                contract,
                value: balance,
            });

            Ok(())
        }

        /// De-Register a dapp by setting their status to Deactivated and their balance to 0
        fn dapp_deregister(&mut self, dapp_account: AccountId) {
            let mut dapp = self.dapps.get(&dapp_account).unwrap();
            dapp.status = GovernanceStatus::Deactivated;
            dapp.balance = 0;
            self.dapps.insert(dapp_account, &dapp);
        }

        /// Submit a captcha solution commit
        #[ink(message)]
        pub fn dapp_user_commit(
            &mut self,
            contract: AccountId,
            dataset_id: Hash,
            user_merkle_tree_root: Hash,
            provider: AccountId,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            // Guard against dapp submitting a commit on behalf of a user
            if self.dapps.get(&caller).is_some() {
                return error!(Error::NotAuthorised);
            }

            // Guard against incorrect data being submitted
            self.get_captcha_data(dataset_id)?;
            // Guard against solution commitment being submitted more than once
            if self
                .captcha_solution_commitments
                .get(user_merkle_tree_root)
                .is_some()
            {
                return error!(Error::CaptchaSolutionCommitmentExists);
            }

            self.validate_dapp(contract)?;
            self.validate_provider_active(provider)?;

            let commitment = CaptchaSolutionCommitment {
                account: caller,
                dataset_id: dataset_id,
                status: CaptchaStatus::Pending,
                contract,
                provider,
                completed_at: self.env().block_timestamp(),
            };

            self.create_new_dapp_user(caller);

            self.captcha_solution_commitments
                .insert(user_merkle_tree_root, &commitment);

            self.env().emit_event(DappUserCommit {
                account: caller,
                merkle_tree_root: user_merkle_tree_root,
                contract,
                dataset_id: dataset_id,
            });
            Ok(())
        }

        /// Create a new dapp user if they do not already exist
        fn create_new_dapp_user(&mut self, account: AccountId) {
            // create the user and add to our list of dapp users
            if self.dapp_users.get(account).is_none() {
                let user = User {
                    correct_captchas: 0,
                    incorrect_captchas: 0,
                    last_correct_captcha: 0,
                    last_correct_captcha_dapp_id: AccountId::default(),
                };
                self.dapp_users.insert(account, &user);
                self.dapp_user_accounts.push(account);
            }
        }

        /// Approve a solution commitment, increment correct captchas, and refund the users tx fee
        #[ink(message)]
        pub fn provider_approve(
            &mut self,
            captcha_solution_commitment_id: Hash,
            transaction_fee: Balance,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            self.validate_provider_active(caller)?;
            // Guard against incorrect solution id
            let commitment =
                self.get_captcha_solution_commitment(captcha_solution_commitment_id)?;
            if commitment.provider != caller {
                return error!(Error::NotAuthorised);
            }
            self.validate_dapp(commitment.contract)?;

            self.get_dapp_user(commitment.account)?;

            // get the mutables
            let mut commitment_mut = self
                .captcha_solution_commitments
                .get(&captcha_solution_commitment_id)
                .unwrap();
            let mut user = self.dapp_users.get(&commitment.account).unwrap();

            // only make changes if commitment is Pending approval or disapproval
            if commitment_mut.status == CaptchaStatus::Pending {
                commitment_mut.status = CaptchaStatus::Approved;
                user.correct_captchas += 1;
                user.last_correct_captcha = commitment.completed_at;
                user.last_correct_captcha_dapp_id = commitment.contract;
                self.captcha_solution_commitments
                    .insert(captcha_solution_commitment_id, &commitment_mut);
                self.dapp_users.insert(&commitment.account, &user);
                self.pay_fee(&caller, &commitment.contract)?;
                self.refund_transaction_fee(commitment, transaction_fee)?;
                self.env().emit_event(ProviderApprove {
                    captcha_solution_commitment_id,
                });
            }

            Ok(())
        }

        /// Disapprove a solution commitment and increment incorrect captchas
        #[ink(message)]
        pub fn provider_disapprove(
            &mut self,
            captcha_solution_commitment_id: Hash,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            self.validate_provider_active(caller)?;
            // Guard against incorrect solution id
            let commitment =
                self.get_captcha_solution_commitment(captcha_solution_commitment_id)?;
            if commitment.provider != caller {
                return error!(Error::NotAuthorised);
            }
            self.validate_dapp(commitment.contract)?;
            // Check the user exists
            self.get_dapp_user(commitment.account)?;

            // get the mutables
            let mut commitment_mut = self
                .captcha_solution_commitments
                .get(&captcha_solution_commitment_id)
                .unwrap();
            let mut user = self.dapp_users.get(&commitment.account).unwrap();

            // only make changes if commitment is Pending approval or disapproval
            if commitment_mut.status == CaptchaStatus::Pending {
                commitment_mut.status = CaptchaStatus::Disapproved;
                user.incorrect_captchas += 1;
                self.captcha_solution_commitments
                    .insert(captcha_solution_commitment_id, &commitment_mut);
                self.dapp_users.insert(&commitment.account, &user);
                self.pay_fee(&caller, &commitment.contract)?;
                self.env().emit_event(ProviderDisapprove {
                    captcha_solution_commitment_id,
                });
            }

            Ok(())
        }

        /// Transfer a balance from a provider to a dapp or from a dapp to a provider,
        fn pay_fee(
            &mut self,
            provider_account: &AccountId,
            dapp_account: &AccountId,
        ) -> Result<(), Error> {
            let mut provider = self.providers.get(provider_account).unwrap();
            if provider.fee != 0 {
                let mut dapp = self.dapps.get(dapp_account).unwrap();

                let fee = Balance::from(provider.fee);
                if provider.payee == Payee::Provider {
                    provider.balance += fee;
                    dapp.balance -= fee;
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

        /// Transfer a refund fee from payer account to user account
        /// Payee == Provider => Dapp pays solve fee and Dapp pays Dapp User tx fee
        /// Payee == Dapp => Provider pays solve fee and Provider pays Dapp Use
        fn refund_transaction_fee(
            &mut self,
            commitment: CaptchaSolutionCommitment,
            amount: Balance,
        ) -> Result<(), Error> {
            if self.env().balance() < amount {
                return error!(Error::ContractInsufficientFunds);
            }

            let mut provider = self.providers.get(&commitment.provider).unwrap();
            let mut dapp = self.dapps.get(&commitment.contract).unwrap();
            if provider.payee == Payee::Provider {
                if dapp.balance < amount {
                    return error!(Error::DappInsufficientFunds);
                }
                dapp.balance -= amount;
                self.dapps.insert(commitment.contract, &dapp);
            } else {
                if provider.balance < amount {
                    return error!(Error::ProviderInsufficientFunds);
                }
                provider.balance -= amount;
                self.providers.insert(commitment.provider, &provider);
            }
            if self.env().transfer(commitment.account, amount).is_err() {
                return error!(Error::ContractTransferFailed);
            }
            Ok(())
        }

        /// Checks if the user is a human (true) as they have a solution rate higher than a % threshold or a bot (false)
        /// Threshold is decided by the calling user
        #[ink(message)]
        pub fn dapp_operator_is_human_user(&self, user: AccountId, threshold: u8) -> bool {
            match self.get_dapp_user(user) {
                Err(_e) => return false,
                Ok(user) =>
                // determine if correct captchas is greater than or equal to threshold
                {
                    user.correct_captchas * 100 / (user.correct_captchas + user.incorrect_captchas)
                        >= threshold.into()
                }
            }
        }

        #[ink(message)]
        pub fn dapp_operator_last_correct_captcha(
            &self,
            user: AccountId,
        ) -> Result<LastCorrectCaptcha, Error> {
            let user = self.get_dapp_user(user)?;

            Ok(LastCorrectCaptcha {
                before_ms: u32::try_from(self.env().block_timestamp() - user.last_correct_captcha)
                    .unwrap(),
                dapp_id: user.last_correct_captcha_dapp_id,
            })
        }

        // Disputes and governance messages

        /// Add an operator
        #[ink(message)]
        pub fn add_prosopo_operator(&mut self, operator_account: AccountId) {
            let caller = self.env().caller();
            if self.operators.get(&caller).is_some() {
                let operator = Operator {
                    status: GovernanceStatus::Active,
                };
                self.operators.insert(operator_account, &operator);
                self.operator_accounts.push(operator_account);
            }
        }

        // Informational / Validation functions

        fn validate_provider_exists_and_has_funds(
            &self,
            provider_id: AccountId,
        ) -> Result<Provider, Error> {
            if self.providers.get(&provider_id).is_none() {
                return error!(Error::ProviderDoesNotExist);
            }
            let provider = self.get_provider_details(provider_id)?;
            if provider.balance < self.provider_stake_default {
                return error!(Error::ProviderInsufficientFunds);
            }
            Ok(provider)
        }

        fn validate_provider_active(&self, provider_id: AccountId) -> Result<Provider, Error> {
            let provider = self.validate_provider_exists_and_has_funds(provider_id)?;
            if provider.status != GovernanceStatus::Active {
                return error!(Error::ProviderInactive);
            }
            Ok(provider)
        }

        fn validate_dapp(&self, contract: AccountId) -> Result<(), Error> {
            // Guard against dapps using service that are not registered
            if self.dapps.get(&contract).is_none() {
                return error!(Error::DappDoesNotExist);
            }
            // Guard against dapps using service that are Suspended or Deactivated
            let dapp = self.get_dapp_details(contract)?;
            if dapp.status != GovernanceStatus::Active {
                return error!(Error::DappInactive);
            }
            // Make sure the Dapp can pay the transaction fees of the user and potentially the
            // provider, if their fee > 0
            if dapp.balance <= self.dapp_stake_default {
                return error!(Error::DappInsufficientFunds);
            }
            Ok(())
        }

        /// Get a single captcha dataset
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_captcha_data(&self, dataset_id: Hash) -> Result<CaptchaData, Error> {
            self.captcha_data.get(&dataset_id).ok_or(Error::CaptchaDataDoesNotExist)
        }

        /// Get a solution commitment
        ///
        /// Returns an error if the commitment does not exist
        #[ink(message)]
        pub fn get_captcha_solution_commitment(
            &self,
            captcha_solution_commitment_id: Hash,
        ) -> Result<CaptchaSolutionCommitment, Error> {
            if self
                .captcha_solution_commitments
                .get(&captcha_solution_commitment_id)
                .is_none()
            {
                return error!(Error::CaptchaSolutionCommitmentDoesNotExist);
            }
            let commitment = self
                .captcha_solution_commitments
                .get(&captcha_solution_commitment_id)
                .unwrap();

            Ok(commitment)
        }

        /// Get a dapp user
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_dapp_user(&self, dapp_user_id: AccountId) -> Result<User, Error> {
            if self.dapp_users.get(&dapp_user_id).is_none() {
                return error!(Error::DappUserDoesNotExist);
            }
            Ok(self.dapp_users.get(&dapp_user_id).unwrap())
        }

        /// Get a single provider's details
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_provider_details(&self, accountid: AccountId) -> Result<Provider, Error> {
            if self.providers.get(&accountid).is_none() {
                return error!(Error::ProviderDoesNotExist);
            }
            let provider = self.providers.get(&accountid);
            Ok(provider.unwrap())
        }

        /// Get a single dapps details
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_dapp_details(&self, contract: AccountId) -> Result<Dapp, Error> {
            if self.dapps.get(&contract).is_none() {
                return error!(Error::DappDoesNotExist);
            }
            let dapp = self.dapps.get(&contract);
            Ok(dapp.unwrap())
        }

        /// Returns the account balance for the specified `dapp`.
        ///
        /// Returns `0` if the account does not exist.
        #[ink(message)]
        pub fn get_dapp_balance(&self, dapp: AccountId) -> Balance {
            return match self.get_dapp_details(dapp) {
                Ok(v) => v.balance,
                Err(_e) => Balance::from(0_u32),
            };
        }

        /// Returns the account balance for the specified `provider`.
        ///
        /// Returns `0` if the account does not exist.
        #[ink(message)]
        pub fn get_provider_balance(&self, provider: AccountId) -> Balance {
            return match self.get_provider_details(provider) {
                Ok(v) => v.balance,
                Err(_e) => Balance::from(0_u32),
            };
        }

        /// List providers given an array of account id
        ///
        /// Returns empty if none were matched
        #[ink(message)]
        pub fn list_providers_by_ids(&self, provider_ids: Vec<AccountId>) -> Vec<Provider> {
            let mut providers = Vec::new();
            for provider_id in provider_ids {
                let provider = self.providers.get(provider_id);
                if provider.is_none() {
                    continue;
                }
                providers.push(provider.unwrap())
            }
            providers
        }

        /// List providers given an array of status
        ///
        /// Returns empty if none were matched
        #[ink(message)]
        pub fn list_providers_by_status(&self, statuses: Vec<GovernanceStatus>) -> Vec<Provider> {
            let mut providers = Vec::<Provider>::new();
            for status in statuses {
                let providers_set = self.provider_accounts.get(status);
                if providers_set.is_none() {
                    continue;
                }
                let provider_ids = providers_set.unwrap().into_iter().collect();
                providers.append(&mut self.list_providers_by_ids(provider_ids));
            }
            providers
        }

        /// Get a random active provider
        ///
        /// Returns error if no active providers is found
        #[ink(message)]
        pub fn get_random_active_provider(
            &self,
            user_account: AccountId,
            dapp_contract_account: AccountId,
        ) -> Result<RandomProvider, Error> {
            self.validate_dapp(dapp_contract_account)?;
            let active_providers = self
                .provider_accounts
                .get(GovernanceStatus::Active)
                .unwrap();
            let max = active_providers.len();
            if max == 0 {
                return error!(Error::NoActiveProviders);
            }
            let index = self.get_random_number(max as u128, user_account);
            let provider_id = active_providers.into_iter().nth(index as usize).unwrap();
            let provider = self.providers.get(provider_id);
            if provider.is_none() {
                return error!(Error::NoActiveProviders);
            }

            Ok(RandomProvider {
                provider_id,
                provider: provider.unwrap(),
                block_number: self.env().block_number(),
            })
        }

        /// Get the AccountIds of all Providers ever registered
        ///
        /// Returns {Vec<AccountId>}
        #[ink(message)]
        pub fn get_all_provider_ids(&self) -> Vec<AccountId> {
            let mut provider_ids = Vec::<AccountId>::new();
            for status in [
                GovernanceStatus::Active,
                GovernanceStatus::Suspended,
                GovernanceStatus::Deactivated,
            ] {
                let providers_set = self.provider_accounts.get(status);
                if providers_set.is_none() {
                    continue;
                }
                provider_ids.append(&mut providers_set.unwrap().into_iter().collect());
            }
            provider_ids
        }

        /// Get a random number from 0 to `len` - 1 inclusive. The user account is added to the seed for additional random entropy.
        #[ink(message)]
        pub fn get_random_number(&self, len: u128, user_account: AccountId) -> u128 {
            if len <= 0 {
                panic!("Cannot generate a random number for a length of 0 or less");
            }
            // build a random seed from user account, block number, block timestamp and (TODO) block hash
            const BLOCK_NUMBER_SIZE: usize = 4;
            const BLOCK_TIMESTAMP_SIZE: usize = 8;
            const USER_ACCOUNT_SIZE: usize = 32;
            let block_number: u32 = self.env().block_number();
            let block_timestamp: u64 = self.env().block_timestamp();
            let user_account_bytes: &[u8; USER_ACCOUNT_SIZE] = user_account.as_ref();
            // pack all the data into a single byte array
            let block_number_arr: [u8; BLOCK_NUMBER_SIZE] = block_number.to_le_bytes();
            let block_timestamp_arr: [u8; BLOCK_TIMESTAMP_SIZE] = block_timestamp.to_le_bytes();
            let tmp: [u8; USER_ACCOUNT_SIZE + BLOCK_NUMBER_SIZE] =
                crate::concat_u8(&user_account_bytes, &block_number_arr);
            let bytes: [u8; BLOCK_TIMESTAMP_SIZE + BLOCK_NUMBER_SIZE + USER_ACCOUNT_SIZE] =
                crate::concat_u8(&tmp, &block_timestamp_arr);
            // hash to ensure small changes (e.g. in the block timestamp) result in large change in the seed
            let mut hash_output = <Blake2x128 as HashOutput>::Type::default();
            <Blake2x128 as CryptoHash>::hash(&bytes, &mut hash_output);
            // the random number can be derived from the hash
            let next = u128::from_le_bytes(hash_output);
            // use modulo to get a number between 0 (inclusive) and len (exclusive)
            // e.g. if len = 10 then range would be 0-9
            let next_mod = next % len;
            next_mod
        }

        /// Get a random number from 0 to `len` - 1 inclusive. Uses the caller account for additional random entropy.
        #[ink(message)]
        pub fn get_random_number_caller(&self, len: u128) -> u128 {
            self.get_random_number(len, self.env().caller())
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
        use ink::env::hash::Blake2x256;
        use ink::env::hash::CryptoHash;
        use ink::env::hash::HashOutput;

        use crate::prosopo::Error::{ProviderInactive, ProviderInsufficientFunds};

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        type Event = <Prosopo as ::ink::reflect::ContractEventBase>::Type;

        const STAKE_DEFAULT: u128 = 1000000000000;

        /// We test if the default constructor does its job.
        #[ink::test]
        fn test_default_works() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            assert!(contract.operators.get(&operator_account).is_some());
            assert!(contract.operator_accounts.contains(&operator_account));
        }

        /// Assert contract provider minimum stake default set from constructor.
        #[ink::test]
        pub fn test_provider_stake_default() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let provider_stake_default: u128 = contract.get_provider_stake_default();
            assert!(STAKE_DEFAULT.eq(&provider_stake_default));
        }

        /// Assert contract dapp minimum stake default set from constructor.
        #[ink::test]
        pub fn test_dapp_stake_default() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let dapp_stake_default: u128 = contract.get_dapp_stake_default();
            assert!(STAKE_DEFAULT.eq(&dapp_stake_default));
        }

        /// Test provider register
        #[ink::test]
        fn test_provider_register() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract.provider_register(service_origin, fee, Payee::Provider, provider_account);
            assert!(contract.providers.get(&provider_account).is_some());
            assert!(contract
                .provider_accounts
                .get(GovernanceStatus::Deactivated)
                .unwrap_or_default()
                .contains(&provider_account));
        }

        /// Test provider deregister
        #[ink::test]
        fn test_provider_deregister() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract.provider_register(service_origin, fee, Payee::Provider, provider_account);
            assert!(contract.providers.get(&provider_account).is_some());
            contract.provider_deregister(provider_account);
            let provider_record = contract.providers.get(&provider_account).unwrap();
            assert!(provider_record.status == GovernanceStatus::Deactivated);
        }

        /// Test list providers
        #[ink::test]
        fn test_list_providers_by_ids() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract.provider_register(service_origin, fee, Payee::Provider, provider_account);
            let registered_provider_account = contract.providers.get(&provider_account);
            assert!(registered_provider_account.is_some());
            let returned_list = contract.list_providers_by_ids(vec![provider_account]);
            assert!(returned_list == vec![registered_provider_account.unwrap()]);
        }

        // test get random number with zero length, i.e. no range to pick from
        #[ink::test]
        #[should_panic]
        fn test_get_random_number_zero_len() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            contract.get_random_number(0, operator_account);
        }

        // Test get random number
        #[ink::test]
        fn test_get_random_number() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            const len: usize = 10;
            let mut arr = [0; len];
            // get several random numbers, one per block
            for i in 0..len {
                let number = contract.get_random_number(100, operator_account);
                arr[i] = number;
                println!(
                    "{:?} {:?} {:?}",
                    number,
                    ink::env::block_number::<ink::env::DefaultEnvironment>(),
                    ink::env::block_timestamp::<ink::env::DefaultEnvironment>()
                );
                ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
            }
            // check that the random numbers match precomputed values
            assert_eq!(&[58, 1, 45, 93, 87, 19, 99, 5, 66, 39], &arr);
        }

        /// Helper function for converting string to Hash
        fn str_to_hash(str: String) -> Hash {
            let mut result = Hash::default();
            let len_result = result.as_ref().len();
            let mut hash_output = <<Blake2x256 as HashOutput>::Type as Default>::default();
            <Blake2x256 as CryptoHash>::hash((&str).as_ref(), &mut hash_output);
            let copy_len = core::cmp::min(hash_output.len(), len_result);
            result.as_mut()[0..copy_len].copy_from_slice(&hash_output[0..copy_len]);
            result
        }

        /// Provider Register Helper
        fn generate_provider_data(id: u8, port: &str, fee: u32) -> (AccountId, Hash, u32) {
            let provider_account = AccountId::from([id; 32]);
            let service_origin = str_to_hash(format!("https://localhost:{}", port));

            (provider_account, service_origin, fee)
        }

        /// Test add operator
        #[ink::test]
        fn test_add_operator() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(operator_account);
            let operator_account_new = AccountId::from([0x2; 32]);
            contract.add_prosopo_operator(operator_account_new);
            assert!(contract.operator_accounts.contains(&operator_account_new));
            assert!(contract.operators.get(&operator_account_new).is_some());
        }

        /// Test provider register and update
        #[ink::test]
        fn test_provider_register_and_update() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "2424", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();
            assert!(contract.providers.get(&provider_account).is_some());
            assert!(contract
                .provider_accounts
                .get(GovernanceStatus::Deactivated)
                .unwrap()
                .contains(&provider_account));
            let service_origin = str_to_hash("https://localhost:4242".to_string());
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Dapp, provider_account);
            assert!(contract
                .provider_accounts
                .get(GovernanceStatus::Deactivated)
                .unwrap()
                .contains(&provider_account));
            let provider = contract.providers.get(&provider_account).unwrap();
            assert_eq!(provider.service_origin, service_origin);
            assert_eq!(provider.fee, fee);
            assert_eq!(provider.payee, Payee::Dapp);
            assert_eq!(provider.balance, balance);
            assert_eq!(provider.status, GovernanceStatus::Deactivated);

            let emitted_events = ink::env::test::recorded_events().collect::<Vec<_>>();

            // first event is the register event, second event is the update
            assert_eq!(2, emitted_events.len());

            let event_provider_update = &emitted_events[1];

            let decoded_event_update =
                <Event as scale::Decode>::decode(&mut &event_provider_update.data[..])
                    .expect("encountered invalid contract event data buffer");

            if let Event::ProviderUpdate(ProviderUpdate { account }) = decoded_event_update {
                assert_eq!(
                    account, provider_account,
                    "encountered invalid ProviderUpdate.account"
                );
            } else {
                panic!("encountered unexpected event kind: expected a ProviderUpdate event");
            }
        }

        /// Test provider register with service_origin error
        #[ink::test]
        fn test_provider_register_with_service_origin_error() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);

            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);

            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // try creating the second provider and make sure the error is correct and that it doesn't exist
            let (provider_account, _, _) = generate_provider_data(0x3, "4242", 0);
            match contract.provider_register(service_origin, fee, Payee::Provider, provider_account)
            {
                Result::Err(Error::ProviderServiceOriginUsed) => {
                    assert!(true);
                }
                _ => {
                    assert!(false);
                }
            }
            assert!(contract.providers.get(&provider_account).is_none());
            assert!(!contract
                .provider_accounts
                .get(GovernanceStatus::Deactivated)
                .unwrap()
                .contains(&provider_account));
        }

        /// Test provider update with service_origin error
        #[ink::test]
        fn test_provider_update_with_service_origin_error() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);

            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);

            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            let (provider_account, service_origin, fee) = generate_provider_data(0x3, "2424", 0);

            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            let (_, service_origin, fee) = generate_provider_data(0x3, "4242", 100);

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

            // try updating the second provider and make sure the error is correct and that it didn't change
            match contract.provider_update(service_origin, fee, Payee::Dapp, provider_account) {
                Result::Err(Error::ProviderServiceOriginUsed) => {
                    assert!(true);
                }
                _ => {
                    assert!(false);
                }
            }

            let provider = contract.providers.get(&provider_account).unwrap();
            assert_ne!(provider.service_origin, service_origin);
            assert_ne!(provider.fee, fee);
            assert_ne!(provider.balance, balance);
            assert_ne!(provider.status, GovernanceStatus::Active);
        }

        /// Test provider unstake
        #[ink::test]
        fn test_provider_unstake() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 10;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(operator_account);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            contract.provider_unstake().ok();
            let emitted_events = ink::env::test::recorded_events().collect::<Vec<_>>();

            // events are the register event (0), stake event(1), deregister(2) and the unstake event(3)

            assert_eq!(4, emitted_events.len());

            let event_unstake = &emitted_events[3];
            let decoded_event_unstake =
                <Event as scale::Decode>::decode(&mut &event_unstake.data[..])
                    .expect("encountered invalid contract event data buffer");

            if let Event::ProviderUnstake(ProviderUnstake { account, value }) =
                decoded_event_unstake
            {
                assert_eq!(
                    account, provider_account,
                    "encountered invalid ProviderUnstake.account"
                );
                assert_eq!(value, balance, "encountered invalid ProviderUnstake.value");
            } else {
                panic!("encountered unexpected event kind: expected a ProviderUnstake event");
            }
        }

        /// Test provider add data set
        #[ink::test]
        fn test_provider_add_dataset() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(operator_account);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            let root1 = str_to_hash("merkle tree".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            contract.provider_add_dataset(root1, root2).ok();
            let emitted_events = ink::env::test::recorded_events().collect::<Vec<_>>();

            // events are the register, stake, add data set
            assert_eq!(3, emitted_events.len());

            let event_unstake = &emitted_events[2];
            let decoded_event_unstake =
                <Event as scale::Decode>::decode(&mut &event_unstake.data[..])
                    .expect("encountered invalid contract event data buffer");

            if let Event::ProviderAddDataset(ProviderAddDataset {
                account,
                dataset_id: dataset_id,
                dataset_id_content: datset_id_content,
            }) = decoded_event_unstake
            {
                assert_eq!(
                    account, provider_account,
                    "encountered invalid ProviderAddDataset.account"
                );
                assert_eq!(
                    dataset_id, root1,
                    "encountered invalid ProviderAddDataset.dataset_id"
                );
            } else {
                panic!("encountered unexpected event kind: expected a ProviderAddDataset event");
            }
        }

        /// Test provider cannot add data set if inactive
        #[ink::test]
        fn test_provider_cannot_add_dataset_if_inactive() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 10;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(operator_account);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            let result = contract.provider_add_dataset(root1, root2).unwrap_err();
            assert_eq!(ProviderInsufficientFunds, result)
        }

        /// Test dapp register with zero balance transfer
        #[ink::test]
        fn test_dapp_register_zero_balance_transfer() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);
            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
            // Don't transfer anything with the call
            let balance = 0;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let client_origin = str_to_hash("https://localhost:2424".to_string());
            contract.dapp_register(client_origin, dapp_contract, None);
            assert!(contract.dapps.get(&dapp_contract).is_some());
            let dapp = contract.dapps.get(&dapp_contract).unwrap();
            assert_eq!(dapp.owner, caller);
            assert_eq!(dapp.client_origin, client_origin);

            // account is marked as suspended as zero tokens have been paid
            assert_eq!(dapp.status, GovernanceStatus::Suspended);
            assert_eq!(dapp.balance, balance);
            assert!(contract.dapp_accounts.contains(&dapp_contract));
        }

        /// Test dapp register with positive balance transfer
        #[ink::test]
        fn test_dapp_register_positive_balance_transfer() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);
            let client_origin = str_to_hash("https://localhost:2424".to_string());

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the call
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

            // register the dapp
            contract.dapp_register(client_origin, dapp_contract, None);
            // check the dapp exists in the hashmap
            assert!(contract.dapps.get(&dapp_contract).is_some());

            // check the various attributes are correct
            let dapp = contract.dapps.get(&dapp_contract).unwrap();
            assert_eq!(dapp.owner, caller);
            assert_eq!(dapp.client_origin, client_origin);

            // account is marked as active as balance is now positive
            assert_eq!(dapp.status, GovernanceStatus::Active);
            assert_eq!(dapp.balance, balance);
            assert!(contract.dapp_accounts.contains(&dapp_contract));
        }

        /// Test dapp register and then update
        #[ink::test]
        fn test_dapp_register_and_update() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract_account = AccountId::from([0x3; 32]);
            let client_origin_1 = str_to_hash("https://localhost:2424".to_string());

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the call
            let balance_1 = 100;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_1);

            // register the dapp
            contract.dapp_register(client_origin_1, dapp_contract_account, None);

            // check the dapp exists in the hashmap
            assert!(contract.dapps.get(&dapp_contract_account).is_some());

            // check the various attributes are correct
            let dapp = contract.dapps.get(&dapp_contract_account).unwrap();
            assert_eq!(dapp.owner, caller);
            assert_eq!(dapp.client_origin, client_origin_1);

            // account is marked as active as tokens have been paid
            assert_eq!(dapp.status, GovernanceStatus::Active);
            assert_eq!(dapp.balance, balance_1);

            // Transfer tokens with the call
            let balance_2 = 200;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);

            // run the register function again for the same (caller, contract) pair, adding more
            // tokens and changing the client origin
            let client_origin_2 = str_to_hash("https://localhost:2424".to_string()); // Implements `scale::Encode`
            let new_owner = AccountId::from([0x5; 32]);
            contract.dapp_register(client_origin_2, dapp_contract_account, Some(new_owner));

            // check the various attributes are correct
            let dapp = contract.dapps.get(&dapp_contract_account).unwrap();
            assert_eq!(dapp.owner, new_owner);
            assert_eq!(dapp.client_origin, client_origin_2);

            // account is marked as active as tokens have been paid
            assert_eq!(dapp.status, GovernanceStatus::Active);
            assert_eq!(dapp.balance, balance_1 + balance_2);
            assert!(contract.dapp_accounts.contains(&dapp_contract_account));
        }

        /// Test dapp fund account
        #[ink::test]
        fn test_dapp_fund() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);
            let client_origin_1 = str_to_hash("https://localhost:2424".to_string());

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the register call
            let balance_1 = 100;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_1);

            // register the dapp
            contract.dapp_register(client_origin_1, dapp_contract, None);

            // Transfer tokens with the fund call
            let balance_2 = 200;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance_2);
            contract.dapp_fund(dapp_contract);

            // check the total account balance is correct
            let dapp = contract.dapps.get(&dapp_contract).unwrap();
            assert_eq!(dapp.balance, balance_1 + balance_2);
        }

        /// Test dapp cancel
        #[ink::test]
        fn test_dapp_cancel() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let caller = AccountId::from([0x2; 32]);
            let contract_account = AccountId::from([0x3; 32]);
            let client_origin_1 = str_to_hash("https://localhost:2424".to_string());
            let callers_initial_balance =
                ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>(caller)
                    .unwrap();

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the register call
            let balance = 200;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

            // register the dapp
            contract.dapp_register(client_origin_1, contract_account, None);

            // Transfer tokens with the fund call
            contract.dapp_cancel(contract_account).ok();

            // check the funds are returned and the dapp's status is Deactivated
            let dapp = contract.dapps.get(&contract_account).unwrap();
            assert_eq!(dapp.status, GovernanceStatus::Deactivated);

            // Make sure the funds are returned to the caller
            assert_eq!(dapp.balance, 0);
            let callers_balance =
                ink::env::test::get_account_balance::<ink::env::DefaultEnvironment>(caller)
                    .unwrap();
            assert_eq!(callers_initial_balance + balance, callers_balance);
        }

        /// Test dapp user commit
        /// A dapp user can only commit a solution to the chain when there is at least one captcha
        /// provider and one dapp available.
        #[ink::test]
        fn test_dapp_user_commit() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);

            // Register the provider
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root1, user_root, provider_account)
                .ok();

            // check that the data is in the captcha_solution_commitments hashmap
            assert!(contract
                .captcha_solution_commitments
                .get(&user_root)
                .is_some());
        }

        /// Test provider approve
        #[ink::test]
        fn test_provider_approve() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);

            let provider = contract.providers.get(&provider_account).unwrap();
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root1, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the solution as approved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_approve(solution_id, 0);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Approved);
            let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account);
            let new_provider_balance = contract.get_provider_balance(provider_account);
            assert_eq!(balance - Balance::from(fee), new_dapp_balance);
            assert_eq!(balance + Balance::from(fee), new_provider_balance);

            // Now make sure that the provider cannot later set the solution to disapproved and make
            // sure that the dapp balance is unchanged
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Approved);
            assert_eq!(
                balance - Balance::from(fee),
                contract.get_dapp_balance(dapp_contract_account)
            );
            assert_eq!(
                balance + Balance::from(fee),
                contract.get_provider_balance(provider_account)
            );
        }

        /// Test provider cannot approve invalid solution id
        #[ink::test]
        fn test_provider_approve_invalid_id() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root1, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the wrong solution as approved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_id = str_to_hash("id that does not exist".to_string());
            let result = contract.provider_approve(solution_id, 0);
            assert_eq!(
                Error::CaptchaSolutionCommitmentDoesNotExist,
                result.unwrap_err()
            );
        }

        /// Test provider disapprove
        #[ink::test]
        fn test_provider_disapprove() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let client_origin = str_to_hash("https://localhost:2424".to_string());
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root1, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);
            let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account);
            let new_provider_balance = contract.get_provider_balance(provider_account);
            assert_eq!(balance - Balance::from(fee), new_dapp_balance);
            assert_eq!(balance + Balance::from(fee), new_provider_balance);

            // Now make sure that the provider cannot later set the solution to approved
            contract.provider_approve(solution_id, 0);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);
            assert_eq!(
                balance - Balance::from(fee),
                contract.get_dapp_balance(dapp_contract_account)
            );
            assert_eq!(
                balance + Balance::from(fee),
                contract.get_provider_balance(provider_account)
            );
        }

        /// Test dapp user is human
        #[ink::test]
        fn test_dapp_operator_is_human_user() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2);

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            // Call from the Dapp User Account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root1, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);

            // Now make sure that the dapp user does not pass the human test
            let result = contract.dapp_operator_is_human_user(dapp_user_account, 80);
            assert_eq!(result, false);
        }

        /// Test non-existent dapp account has zero balance
        #[ink::test]
        fn test_non_existent_dapp_account_has_zero_balance() {
            let operator_account = AccountId::from([0x1; 32]);
            let dapp_account = AccountId::from([0x2; 32]);
            // initialise the contract
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            assert_eq!(0, contract.get_dapp_balance(dapp_account));
        }

        /// Test non-existent provider account has zero balance
        #[ink::test]
        fn test_non_existent_provider_account_has_zero_balance() {
            let operator_account = AccountId::from([0x1; 32]);
            let provider_account = AccountId::from([0x2; 32]);
            // initialise the contract
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            assert_eq!(0, contract.get_provider_balance(provider_account));
        }

        // // Test get random provider
        #[ink::test]
        fn test_get_random_active_provider() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account, STAKE_DEFAULT, STAKE_DEFAULT);
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract.provider_register(service_origin, fee, Payee::Provider, provider_account);
            let fee2: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Dapp, provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            contract.provider_add_dataset(root1, root2);
            let registered_provider_account = contract.providers.get(&provider_account);
            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);
            let selected_provider =
                contract.get_random_active_provider(provider_account, dapp_contract_account);
            assert!(selected_provider.unwrap().provider == registered_provider_account.unwrap());
        }
    }

}
