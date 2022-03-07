// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
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
#![feature(derive_default_enum)]
#![cfg_attr(not(feature = "std"), no_std)]

pub use self::prosopo::{Prosopo, ProsopoRef};

use ink_lang as ink;

#[ink::contract]
pub mod prosopo {
    use ink_prelude::collections::btree_set::BTreeSet;
    use ink_prelude::vec::Vec;
    use ink_storage::{
        traits::PackedLayout, traits::SpreadAllocate, traits::SpreadLayout, traits::StorageLayout,
        Mapping,
    };
    use rand_chacha::rand_core::RngCore;
    use rand_chacha::rand_core::SeedableRng;
    use rand_chacha::ChaChaRng;

    /// GovernanceStatus relates to DApps and Providers and determines if they are active or not
    #[derive(
        Default,
        PartialEq,
        Debug,
        Eq,
        Clone,
        Copy,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum GovernanceStatus {
        Active,
        Suspended,
        #[default]
        Deactivated,
    }

    /// CaptchaStatus is the status of a CaptchaSolutionCommitment, submitted by a DappUser
    #[derive(
        Default,
        PartialEq,
        Debug,
        Eq,
        Clone,
        Copy,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
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
        Default,
        PartialEq,
        Debug,
        Eq,
        Clone,
        Copy,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum Payee {
        Provider,
        Dapp,
        #[default]
        None,
    }

    /// Providers are suppliers of human verification methods (captchas, etc.) to DappUsers, either
    /// paying or receiving a fee for this service.
    #[derive(
        PartialEq,
        Debug,
        Eq,
        Clone,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
        Copy,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Provider {
        status: GovernanceStatus,
        balance: Balance,
        // an amount in the base unit of the default parachain token (e.g. Planck on chains using DOT)
        fee: u32,
        payee: Payee,
        service_origin: Hash,
        captcha_dataset_id: Hash,
    }

    /// RandomProvider is selected randomly by the contract for the client side application
    #[derive(scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct RandomProvider {
        provider: Provider,
        block_number: u32,
    }

    /// Operators are controllers of this contract with admin rights
    #[derive(
        PartialEq,
        Debug,
        Eq,
        Clone,
        Copy,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Operator {
        status: GovernanceStatus,
    }

    /// CaptchaData contains the hashed root of a Provider's dataset and is used to verify that
    /// the captchas received by a DappUser did belong to the Provider's original dataset
    #[derive(
        PartialEq,
        Debug,
        Eq,
        Clone,
        Copy,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct CaptchaData {
        provider: AccountId,
        merkle_tree_root: Hash,
        captcha_type: u16,
    }

    /// CaptchaSolutionCommitments are submitted by DAppUsers upon completion of one or more
    /// Captchas. They serve as proof of captcha completion to the outside world and can be used
    /// in dispute resolution.
    #[derive(
        PartialEq,
        Debug,
        Eq,
        Clone,
        Copy,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct CaptchaSolutionCommitment {
        // the Dapp User Account
        account: AccountId,
        // The captcha dataset id (merkle_tree_root in Provider / CaptchaData)
        captcha_dataset_id: Hash,
        // Status of this solution - correct / incorrect?
        status: CaptchaStatus,
        // The Dapp Contract AccountId that the Dapp User wants to interact with
        contract: AccountId,
        // The Provider AccountId that is permitted to approve or disapprove the commitment
        provider: AccountId,
    }

    /// DApps are distributed apps who want their users to be verified by Providers, either paying
    /// or receiving a fee for this service.
    #[derive(
        PartialEq,
        Debug,
        Eq,
        Clone,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
        Copy,
    )]
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
    #[derive(
        PartialEq,
        Debug,
        Eq,
        Clone,
        scale::Encode,
        scale::Decode,
        SpreadLayout,
        PackedLayout,
        SpreadAllocate,
        Copy,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct User {
        correct_captchas: u64,
        incorrect_captchas: u64,
        // commented until block timestamp is available in ink unit tests
        // created: Timestamp,
        // updated: Timestamp,
        //last_correct_captcha: Timestamp,
        //last_correct_captcha_dapp_id: AccountId,
    }

    // Contract storage
    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Prosopo {
        //tokenContract: AccountId,
        providers: Mapping<AccountId, Provider>,
        provider_accounts: Mapping<GovernanceStatus, BTreeSet<AccountId>>,
        service_origins: Mapping<Hash, ()>,
        captcha_data: Mapping<Hash, CaptchaData>,
        captcha_solution_commitments: Mapping<Hash, CaptchaSolutionCommitment>,
        provider_stake_default: u128,
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
        merkle_tree_root: Hash,
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
        captcha_dataset_id: Hash,
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
    }

    impl Prosopo {
        /// Constructor
        #[ink(constructor, payable)]
        pub fn default(operator: AccountId) -> Self {
            ink_lang::codegen::initialize_contract(|contract| Self::new_init(contract, operator))
        }

        /// Default initializes the contract with the specified initial supply.
        fn new_init(&mut self, operator_account: AccountId) {
            let operator = Operator {
                status: GovernanceStatus::Active,
            };
            self.operators.insert(operator_account, &operator);
            self.operator_accounts.push(operator_account);
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
                return Ok(());
            }
            // prevent duplicate service origins
            if self.service_origins.get(&service_origin).is_some() {
                return Err(Error::ProviderServiceOriginUsed);
            }
            // add a new provider
            let provider = Provider {
                status: GovernanceStatus::Deactivated,
                balance,
                fee,
                service_origin,
                captcha_dataset_id: Hash::default(),
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

        /// Update an existing provider, their service origin, fee
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
                return Err(Error::NotAuthorised);
            }

            // this function is for updating only, not registering
            if self.providers.get(&provider_account).is_none() {
                return Err(Error::ProviderDoesNotExist);
            }

            let existing = self.get_provider_details(provider_account).unwrap();

            // prevent duplicate service origins
            if existing.service_origin != service_origin {
                if self.service_origins.get(service_origin).is_some() {
                    return Err(Error::ProviderServiceOriginUsed);
                } else {
                    self.service_origins.remove(existing.service_origin);
                    self.service_origins.insert(service_origin, &());
                }
            }

            let old_status = existing.status;
            let mut new_status = existing.status;
            let balance = existing.balance + self.env().transferred_value();

            if balance >= self.provider_stake_default {
                new_status = GovernanceStatus::Active;
            }

            // update an existing provider
            let provider = Provider {
                status: new_status,
                balance,
                fee,
                service_origin,
                captcha_dataset_id: existing.captcha_dataset_id,
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
                return Err(Error::NotAuthorised);
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
                return Err(Error::ProviderDoesNotExist);
            }
            Ok(())
        }

        /// Add a new data set
        #[ink(message)]
        pub fn provider_add_dataset(&mut self, merkle_tree_root: Hash) -> Result<(), Error> {
            let provider_id = self.env().caller();
            // the calling account must belong to the provider
            self.validate_provider(provider_id)?;

            let dataset = CaptchaData {
                provider: provider_id,
                merkle_tree_root,
                captcha_type: 0,
            };

            // create a new id and insert details of the new captcha data set if it doesn't exist
            if self.captcha_data.get(merkle_tree_root).is_none() {
                self.captcha_data.insert(merkle_tree_root, &dataset);
            }

            // set the captcha data id on the provider
            let mut provider = self.providers.get(&provider_id).unwrap();
            provider.captcha_dataset_id = merkle_tree_root;
            self.providers.insert(provider_id, &provider);

            // emit event
            self.env().emit_event(ProviderAddDataset {
                account: provider_id,
                merkle_tree_root,
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
                return Err(Error::DappDoesNotExist);
            }
            let dapp = self.get_dapp_details(contract)?;

            if dapp.owner != caller {
                return Err(Error::NotAuthorised);
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
            captcha_dataset_id: Hash,
            user_merkle_tree_root: Hash,
            provider: AccountId,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            // Guard against incorrect data being submitted
            self.get_captcha_data(captcha_dataset_id)?;
            // Guard against solution commitment being submitted more than once
            if self
                .captcha_solution_commitments
                .get(user_merkle_tree_root)
                .is_some()
            {
                ink_env::debug_println!("{}", "CaptchaSolutionCommitmentExists");
                //return Err(Error::CaptchaSolutionCommitmentExists);
                return Ok(());
            }

            self.validate_dapp(contract)?;
            self.validate_provider(provider)?;

            let commitment = CaptchaSolutionCommitment {
                account: caller,
                captcha_dataset_id,
                status: CaptchaStatus::Pending,
                contract,
                provider,
            };

            self.create_new_dapp_user(caller);

            self.captcha_solution_commitments
                .insert(user_merkle_tree_root, &commitment);

            self.env().emit_event(DappUserCommit {
                account: caller,
                merkle_tree_root: user_merkle_tree_root,
                contract,
                captcha_dataset_id,
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
                    //last_correct_captcha: (),
                    //last_correct_captcha_dapp_id: (),
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
            self.validate_provider(caller)?;
            // Guard against incorrect solution id
            let commitment =
                self.get_captcha_solution_commitment(captcha_solution_commitment_id)?;
            if commitment.provider != caller {
                return Err(Error::NotAuthorised);
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
            self.validate_provider(caller)?;
            // Guard against incorrect solution id
            let commitment =
                self.get_captcha_solution_commitment(captcha_solution_commitment_id)?;
            if commitment.provider != caller {
                return Err(Error::NotAuthorised);
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
                return Err(Error::ContractInsufficientFunds);
            }

            let mut provider = self.providers.get(&commitment.provider).unwrap();
            let mut dapp = self.dapps.get(&commitment.contract).unwrap();
            if provider.payee == Payee::Provider {
                if dapp.balance < amount {
                    return Err(Error::DappInsufficientFunds);
                }
                dapp.balance -= amount;
                self.dapps.insert(commitment.contract, &dapp);
            } else {
                if provider.balance < amount {
                    return Err(Error::ProviderInsufficientFunds);
                }
                provider.balance -= amount;
                self.providers.insert(commitment.provider, &provider);
            }
            if self.env().transfer(commitment.account, amount).is_err() {
                return Err(Error::ContractTransferFailed);
            }
            Ok(())
        }

        /// Checks if the user is a human (true) as they have a solution rate higher than a % threshold or a bot (false)
        /// Threshold is decided by the calling user
        #[ink(message)]
        pub fn dapp_operator_is_human_user(
            &mut self,
            user: AccountId,
            threshold: u8,
        ) -> Result<bool, Error> {
            let user = self.get_dapp_user(user)?;
            // determine if correct captchas is greater than or equal to threshold
            Ok(
                user.correct_captchas / (user.correct_captchas + user.incorrect_captchas) * 100
                    >= threshold.into(),
            )
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

        fn validate_provider(&self, provider_id: AccountId) -> Result<(), Error> {
            if self.providers.get(&provider_id).is_none() {
                ink_env::debug_println!("{}", "ProviderDoesNotExist");
                return Err(Error::ProviderDoesNotExist);
            }
            let provider = self.get_provider_details(provider_id)?;
            if provider.status != GovernanceStatus::Active {
                ink_env::debug_println!("{}", "ProviderInactive");
                return Err(Error::ProviderInactive);
            }
            if provider.balance <= 0 {
                ink_env::debug_println!("{}", "ProviderInsufficientFunds");
                return Err(Error::ProviderInsufficientFunds);
            }
            Ok(())
        }

        fn validate_dapp(&self, contract: AccountId) -> Result<(), Error> {
            // Guard against dapps using service that are not registered
            if self.dapps.get(&contract).is_none() {
                ink_env::debug_println!("{}", "DappDoesNotExist");
                return Err(Error::DappDoesNotExist);
            }
            // Guard against dapps using service that are Suspended or Deactivated
            let dapp = self.get_dapp_details(contract)?;
            if dapp.status != GovernanceStatus::Active {
                ink_env::debug_println!("{}", "DappInactive");
                return Err(Error::DappInactive);
            }
            // Make sure the Dapp can pay the transaction fees of the user and potentially the
            // provider, if their fee > 0
            if dapp.balance <= 0 {
                ink_env::debug_println!("{}", "DappInsufficientFunds");
                return Err(Error::DappInsufficientFunds);
            }
            Ok(())
        }

        /// Get a single captcha dataset
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_captcha_data(&self, captcha_dataset_id: Hash) -> Result<CaptchaData, Error> {
            if self.captcha_data.get(&captcha_dataset_id).is_none() {
                ink_env::debug_println!("{}", "CaptchaDatasetDoesNotExist");
                return Err(Error::CaptchaDataDoesNotExist);
            }
            let captcha_data = self.captcha_data.get(&captcha_dataset_id);
            Ok(captcha_data.unwrap())
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
                return Err(Error::CaptchaSolutionCommitmentDoesNotExist);
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
                ink_env::debug_println!("{}", "DappUserDoesNotExist");
                return Err(Error::DappUserDoesNotExist);
            }
            Ok(self.dapp_users.get(&dapp_user_id).unwrap())
        }

        /// Get a single provider's details
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_provider_details(&self, accountid: AccountId) -> Result<Provider, Error> {
            if self.providers.get(&accountid).is_none() {
                ink_env::debug_println!("{}", "ProviderDoesNotExist");
                return Err(Error::ProviderDoesNotExist);
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
                ink_env::debug_println!("{}", "DappDoesNotExist");
                return Err(Error::DappDoesNotExist);
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
        ) -> Result<RandomProvider, Error> {
            let active_providers = self
                .provider_accounts
                .get(GovernanceStatus::Active)
                .unwrap();
            let max = active_providers.len();
            if max == 0 {
                return Err(Error::NoActiveProviders);
            }
            let index = self.get_random_number(0, (max - 1) as u64, user_account);
            let provider_id = active_providers.into_iter().nth(index as usize).unwrap();
            Ok(RandomProvider {
                provider: self.providers.get(provider_id).unwrap(),
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

        fn get_random_number(&self, min: u64, max: u64, user_account: AccountId) -> u64 {
            let random_seed = self.env().random(user_account.as_ref());
            let mut seed_converted: [u8; 32] = Default::default();
            seed_converted.copy_from_slice(random_seed.0.as_ref());
            let mut rng = ChaChaRng::from_seed(seed_converted);
            ((rng.next_u64() / u64::MAX) * (max - min) + min) as u64
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// The below code is technically just normal Rust code.
    #[cfg(not(feature = "ink-experimental-engine"))]
    #[cfg(test)]
    mod tests {
        /// Imports `ink_lang` so we can use `#[ink::test]`.
        use ink_env::hash::Blake2x256;
        use ink_env::hash::CryptoHash;
        use ink_env::hash::HashOutput;
        use ink_lang as ink;

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        /// We test if the default constructor does its job.
        #[ink::test]
        fn test_default_works() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = Prosopo::default(operator_account);
            assert!(contract.operators.get(&operator_account).is_some());
            assert!(contract.operator_accounts.contains(&operator_account));
        }

        /// Test provider register
        #[ink::test]
        fn test_provider_register() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
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
            let mut contract = Prosopo::default(operator_account);
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
            let mut contract = Prosopo::default(operator_account);
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract.provider_register(service_origin, fee, Payee::Provider, provider_account);
            let registered_provider_account = contract.providers.get(&provider_account);
            assert!(registered_provider_account.is_some());
            let returned_list = contract.list_providers_by_ids(vec![provider_account]);
            assert!(returned_list == vec![registered_provider_account.unwrap()]);
        }

        // Test get random number
        #[ink::test]
        fn test_get_random_number() {
            let operator_account = AccountId::from([0x1; 32]);
            let contract = Prosopo::default(operator_account);
            let mut number = contract.get_random_number(1, 128, operator_account);
            ink_env::debug_println!("{}", number);
            assert!((1 <= number) && (number <= 128));

            number = contract.get_random_number(0, 1, operator_account);
            ink_env::debug_println!("{}", number);
            assert!(number == 0 || number == 1);
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
    }

    #[cfg(feature = "ink-experimental-engine")]
    #[cfg(test)]
    mod tests_experimental_engine {
        use ink_env::hash::Blake2x256;
        use ink_env::hash::CryptoHash;
        use ink_env::hash::HashOutput;
        use ink_lang as ink;

        use crate::prosopo::Error::ProviderInactive;

        use super::*;
        use ink_env::test::EmittedEvent;

        type Event = <Prosopo as ::ink_lang::reflect::ContractEventBase>::Type;

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
            let mut contract = Prosopo::default(operator_account);
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(operator_account);
            let operator_account_new = AccountId::from([0x2; 32]);
            contract.add_prosopo_operator(operator_account_new);
            assert!(contract.operator_accounts.contains(&operator_account_new));
            assert!(contract.operators.get(&operator_account_new).is_some());
        }

        /// Test provider register and update
        #[ink::test]
        fn test_provider_register_and_update() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
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
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let balance = 1000;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Dapp, provider_account);
            assert!(contract
                .provider_accounts
                .get(GovernanceStatus::Active)
                .unwrap()
                .contains(&provider_account));
            let provider = contract.providers.get(&provider_account).unwrap();
            assert_eq!(provider.service_origin, service_origin);
            assert_eq!(provider.fee, fee);
            assert_eq!(provider.payee, Payee::Dapp);
            assert_eq!(provider.balance, balance);
            assert_eq!(provider.status, GovernanceStatus::Active);

            let emitted_events = ink_env::test::recorded_events().collect::<Vec<_>>();

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
            let mut contract = Prosopo::default(operator_account);

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
            let mut contract = Prosopo::default(operator_account);

            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);

            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            let (provider_account, service_origin, fee) = generate_provider_data(0x3, "2424", 0);

            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            let (_, service_origin, fee) = generate_provider_data(0x3, "4242", 100);

            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let balance = 1000;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);

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
            let mut contract = Prosopo::default(operator_account);
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 10;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(operator_account);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();
            ink_env::test::set_account_balance::<ink_env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            contract.provider_unstake().ok();
            let emitted_events = ink_env::test::recorded_events().collect::<Vec<_>>();

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
            let mut contract = Prosopo::default(operator_account);
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 10;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(operator_account);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();
            ink_env::test::set_account_balance::<ink_env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            let root = str_to_hash("merkle tree".to_string());
            contract.provider_add_dataset(root).ok();
            let emitted_events = ink_env::test::recorded_events().collect::<Vec<_>>();

            // events are the register, stake, add data set
            assert_eq!(3, emitted_events.len());

            let event_unstake = &emitted_events[2];
            let decoded_event_unstake =
                <Event as scale::Decode>::decode(&mut &event_unstake.data[..])
                    .expect("encountered invalid contract event data buffer");

            if let Event::ProviderAddDataset(ProviderAddDataset {
                account,
                merkle_tree_root,
            }) = decoded_event_unstake
            {
                assert_eq!(
                    account, provider_account,
                    "encountered invalid ProviderAddDataset.account"
                );
                assert_eq!(
                    merkle_tree_root, root,
                    "encountered invalid ProviderAddDataset.merkle_tree_root"
                );
            } else {
                panic!("encountered unexpected event kind: expected a ProviderAddDataset event");
            }
        }

        /// Test provider cannot add data set if inactive
        #[ink::test]
        fn test_provider_cannot_add_dataset_if_inactive() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 10;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(operator_account);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();
            ink_env::test::set_account_balance::<ink_env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            let root = str_to_hash("merkle tree".to_string());
            let result = contract.provider_add_dataset(root).unwrap_err();
            assert_eq!(ProviderInactive, result)
        }

        /// Test dapp register with zero balance transfer
        #[ink::test]
        fn test_dapp_register_zero_balance_transfer() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);
            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(caller);
            // Don't transfer anything with the call
            let balance = 0;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
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
            let mut contract = Prosopo::default(operator_account);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);
            let client_origin = str_to_hash("https://localhost:2424".to_string());

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(caller);

            // Transfer tokens with the call
            let balance = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);

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
            let mut contract = Prosopo::default(operator_account);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract_account = AccountId::from([0x3; 32]);
            let client_origin_1 = str_to_hash("https://localhost:2424".to_string());

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(caller);

            // Transfer tokens with the call
            let balance_1 = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance_1);

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
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance_2);

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
            let mut contract = Prosopo::default(operator_account);
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);
            let client_origin_1 = str_to_hash("https://localhost:2424".to_string());

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(caller);

            // Transfer tokens with the register call
            let balance_1 = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance_1);

            // register the dapp
            contract.dapp_register(client_origin_1, dapp_contract, None);

            // Transfer tokens with the fund call
            let balance_2 = 200;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance_2);
            contract.dapp_fund(dapp_contract);

            // check the total account balance is correct
            let dapp = contract.dapps.get(&dapp_contract).unwrap();
            assert_eq!(dapp.balance, balance_1 + balance_2);
        }

        /// Test dapp cancel
        #[ink::test]
        fn test_dapp_cancel() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
            let caller = AccountId::from([0x2; 32]);
            let contract_account = AccountId::from([0x3; 32]);
            let client_origin_1 = str_to_hash("https://localhost:2424".to_string());
            let callers_initial_balance =
                ink_env::test::get_account_balance::<ink_env::DefaultEnvironment>(caller).unwrap();

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(caller);

            // Transfer tokens with the register call
            let balance = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);

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
                ink_env::test::get_account_balance::<ink_env::DefaultEnvironment>(caller).unwrap();
            assert_eq!(callers_initial_balance + balance, callers_balance);
        }

        /// Test dapp user commit
        /// A dapp user can only commit a solution to the chain when there is at least one captcha
        /// provider and one dapp available.
        #[ink::test]
        fn test_dapp_user_commit() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("blah".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root, user_root, provider_account)
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
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);

            let provider = contract.providers.get(&provider_account).unwrap();
            // can only add data set after staking
            contract.provider_add_dataset(root).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the solution as approved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
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
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the wrong solution as approved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
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
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            let client_origin = str_to_hash("https://localhost:2424".to_string());
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
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
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider, provider_account);
            // can only add data set after staking
            contract.provider_add_dataset(root).ok();

            // Register the dapp
            let dapp_caller_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);

            // Call from the dapp account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(dapp_caller_account);
            // Give the dap a balance
            let balance = 100;
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            let client_origin = service_origin.clone();
            contract.dapp_register(client_origin, dapp_contract_account, None);

            //Dapp User commit
            let dapp_user_account = AccountId::from([0x5; 32]);
            // Call from the Dapp User Account
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(dapp_user_account);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(dapp_contract_account, root, user_root, provider_account)
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);

            // Now make sure that the dapp user does not pass the human test
            let result = contract
                .dapp_operator_is_human_user(dapp_user_account, 80)
                .unwrap();
            assert_eq!(result, false);
        }

        /// Test non-existent dapp account has zero balance
        #[ink::test]
        fn test_non_existent_dapp_account_has_zero_balance() {
            let operator_account = AccountId::from([0x1; 32]);
            let dapp_account = AccountId::from([0x2; 32]);
            // initialise the contract
            let mut contract = Prosopo::default(operator_account);
            assert_eq!(0, contract.get_dapp_balance(dapp_account));
        }

        /// Test non-existent provider account has zero balance
        #[ink::test]
        fn test_non_existent_provider_account_has_zero_balance() {
            let operator_account = AccountId::from([0x1; 32]);
            let provider_account = AccountId::from([0x2; 32]);
            // initialise the contract
            let mut contract = Prosopo::default(operator_account);
            assert_eq!(0, contract.get_provider_balance(provider_account));
        }

        // // Test get random provider
        // #[ink::test]
        // fn test_get_random_active_provider() {
        //     let operator_account = AccountId::from([0x1; 32]);
        //     let mut contract = Prosopo::default(operator_account);
        //     let provider_account = AccountId::from([0x2; 32]);
        //     let service_origin = str_to_hash("https://localhost:2424".to_string());
        //     let fee: u32 = 0;
        //     contract.provider_register(service_origin, fee, Payee::Provider, provider_account);
        //     let fee2: u32 = 100;
        //     ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
        //     let balance = 1000;
        //     ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
        //     contract.provider_update(service_origin, fee, Payee::Dapp, provider_account);
        //     let registered_provider_account = contract.providers.get(&provider_account);
        //     let selected_provider = contract.get_random_active_provider();
        //     assert!(selected_provider.unwrap() == registered_provider_account.unwrap());
        // }

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
    }
}
