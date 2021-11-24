// Copyright 2021 Prosopo (UK) Ltd.
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

#![cfg_attr(not(feature = "std"), no_std)]
use ink_lang as ink;

#[ink::contract]
mod prosopo {
    use ink_prelude::vec::Vec as Vec;
    #[cfg(not(feature = "ink-as-dependency"))]
    use ink_storage::{
        lazy::Mapping,
        traits::PackedLayout,
        traits::SpreadAllocate,
        traits::SpreadLayout,
        traits::StorageLayout
    };

    #[derive(
    PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub enum Status {
        Active,
        Suspended,
        Deactivated,
        Pending,
        Approved,
        Disapproved,
    }

    impl Default for Status {
        fn default() -> Self { Status::Deactivated }
    }

    #[derive(
    PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub enum Payee {
        Provider,
        Dapp,
        None,
    }

    impl Default for Payee {
        fn default() -> Self { Payee::None }
    }

    #[derive(
    PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate, Copy
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct Provider {
        // TODO how is the Status updated if the staked amount drops below the allowed minimum?
        //    Should Status instead be a function that returns Active if staked > provider_stake_default
        status: Status,
        // TODO should Providers have separate balances for paying/receiving fees?
        // TODO should balances be stored in self.balances under an owner, as per ERC20?
        balance: Balance,
        // an amount in the base unit of the default parachain token (e.g. Planck on chains using DOT)
        fee: u32,
        payee: Payee,
        service_origin: Hash,
        captcha_dataset_id: Hash,
    }


    // #[derive(Debug, scale::Encode, scale::Decode, SpreadLayout, SpreadAllocate)]
    // #[cfg_attr(
    // feature = "std",
    // derive(scale_info::TypeInfo, StorageLayout)
    // )]
    // pub struct AccountMap<T>(Mapping<AccountId, T>)
    //     where T: scale::Encode + scale::Decode + SpreadLayout + PackedLayout + scale_info::TypeInfo;
    //
    // impl<T> AccountMap<T>
    //     where
    //         T: PackedLayout + scale::Encode + scale::Decode + scale::EncodeLike + scale_info::TypeInfo
    // {
    //     fn insert(&mut self, key: AccountId, value: T) {
    //         self.0.insert(key, &value);
    //     }
    //     fn get(&self, key: &AccountId) -> Option<T> {
    //         return self.0.get(key);
    //     }
    // }
    #[derive(Debug, SpreadLayout, SpreadAllocate)]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct ProviderAccountMap(Mapping<AccountId, Provider>);

    impl ProviderAccountMap
    {
        fn insert(&mut self, key: AccountId, value: Provider) {
            ink_env::debug_println!("provider insert {:?}", key);
            self.0.insert(key, &value);
        }
        fn get(&self, key: &AccountId) -> Option<Provider> {
            return self.0.get(key);
        }
    }

    #[derive(Debug, SpreadLayout, SpreadAllocate)]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct DappAccountMap(Mapping<AccountId, Dapp>);

    impl DappAccountMap
    {
        fn insert(&mut self, key: AccountId, value: Dapp) {
            ink_env::debug_println!("dapp insert {:?}", key);
            self.0.insert(key, &value);
        }
        fn get(&self, key: &AccountId) -> Option<Dapp> {
            return self.0.get(key);
        }
    }

    #[derive(Debug, SpreadLayout, SpreadAllocate)]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct OperatorAccountMap(Mapping<AccountId, Operator>);

    impl OperatorAccountMap
    {
        fn insert(&mut self, key: AccountId, value: Operator) {
            self.0.insert(key, &value);
        }
        fn get(&self, key: &AccountId) -> Option<Operator> {
            return self.0.get(key);
        }
    }


    #[derive(
    PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct Operator {
        status: Status,
    }

    #[derive(
    PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate,
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct CaptchaData {
        provider: AccountId,
        merkle_tree_root: Hash,
        captcha_type: u16,
    }

    #[derive(
    PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate,
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct CaptchaSolutionCommitment {
        // the Dapp User Account
        account: AccountId,
        // The captcha dataset id (merkle_tree_root in Provider / CaptchaData)
        captcha_dataset_id: Hash,
        // Status of this solution - correct / incorrect?
        status: Status,
        // The Dapp Contract AccountId that the Dapp User wants to interact with
        contract: AccountId,
    }

    #[derive(
    PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate, Copy
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct Dapp {
        status: Status,
        // TODO should balances be stored in self.balances under an owner, as per ERC20?
        balance: Balance,
        owner: AccountId,
        min_difficulty: u16,
        // client's Dapp URL
        client_origin: Hash,
    }


    #[derive(
    PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode, SpreadLayout, PackedLayout, SpreadAllocate, Copy
    )]
    #[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, StorageLayout)
    )]
    pub struct User {
        correct_captchas: u64,
        incorrect_captchas: u64,
        // commented until block timestamp is available in ink unit tests
        // created: Timestamp,
        // updated: Timestamp,
        //last_correct_captcha: Timestamp,
        //last_correct_captcha_dapp_id: AccountId,
    }

    pub enum DisputeType {
        BadCaptchaData,
        UnresolvedCaptchaSolution,
        BotsFromProvider,
        DappContractRegisteredByUnknown,
    }

    pub struct Dispute {
        account: AccountId,
        status: Status,
        dispute_type: DisputeType,
        proof: Hash,
    }

    // Contract storage
    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Prosopo {
        //tokenContract: AccountId,
        providers: ProviderAccountMap,
        provider_accounts: Vec<AccountId>,
        captcha_data: Mapping<Hash, CaptchaData>,
        captcha_solution_commitments: Mapping<Hash, CaptchaSolutionCommitment>,
        provider_stake_default: u128,
        dapps: DappAccountMap,
        dapp_accounts: Vec<AccountId>,
        //dapps_owners: Mapping<AccountId, AccountId>,
        operators: OperatorAccountMap,
        operator_accounts: Vec<AccountId>,
        //disputes: Mapping<u64, Dispute>
        status: Status,
        operator_stake_default: u64,
        operator_fee_currency: Hash,
        dapp_users: Mapping<AccountId, User>,
        dapp_user_accounts: Vec<AccountId>,
    }

    // Event emitted when a new provider registers
    #[ink(event)]
    pub struct ProviderRegister {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a new provider deregisters
    #[ink(event)]
    pub struct ProviderDeregister {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a new provider is updated
    #[ink(event)]
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
    pub struct ProviderAddDataset {
        #[ink(topic)]
        account: AccountId,
        merkle_tree_root: Hash,
    }

    // Event emitted when a provider unstakes
    #[ink(event)]
    pub struct ProviderUnstake {
        #[ink(topic)]
        account: AccountId,
        value: Balance,
    }

    // Event emitted when a provider approves a solution
    #[ink(event)]
    pub struct ProviderApprove {
        #[ink(topic)]
        captcha_solution_commitment_id: Hash,
    }

    // Event emitted when a provider disapproves a solution
    #[ink(event)]
    pub struct ProviderDisapprove {
        #[ink(topic)]
        captcha_solution_commitment_id: Hash,
    }

    // Event emitted when a dapp registers
    #[ink(event)]
    pub struct DappRegister {
        #[ink(topic)]
        contract: AccountId,
        owner: AccountId,
        client_origin: Hash,
        value: Balance,
    }

    // Event emitted when a dapp updates
    #[ink(event)]
    pub struct DappUpdate {
        #[ink(topic)]
        contract: AccountId,
        owner: AccountId,
        client_origin: Hash,
        value: Balance,
    }

    // Event emitted when a dapp funds
    #[ink(event)]
    pub struct DappFund {
        #[ink(topic)]
        contract: AccountId,
        value: Balance,
    }

    // Event emitted when a dapp cancels
    #[ink(event)]
    pub struct DappCancel {
        #[ink(topic)]
        contract: AccountId,
        value: Balance,
    }

    // Event emitted when a dapp user commits a solution hash
    #[ink(event)]
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
    pub enum ProsopoError {
        /// Returned if calling account is not authorised to perform action
        NotAuthorised,
        /// Returned if not enough balance to fulfill a request is available.
        InsufficientBalance,
        /// Returned if not enough allowance to fulfill a request is available.
        InsufficientAllowance,
        /// Returned if provider exists when it shouldn't
        ProviderExists,
        /// Returned if provider does not exist when it should
        ProviderDoesNotExist,
        /// Returned if provider has no funds
        ProviderInsufficientFunds,
        /// Returned if provider is inactive and trying to use the service
        ProviderInactive,
        /// Returned if requested captcha data id is unavailable
        DuplicateCaptchaDataId,
        /// Returned if dapp exists when it shouldn't
        DappExists,
        /// Returned if dapp does not exist when it should
        DappDoesNotExist,
        /// Returned if dapp is inactive and trying to use the service
        DappInactive,
        /// Returned if dapp has no funds
        DappInsufficientFunds,
        /// Returned if captcha data does not exist
        CaptchaDataDoesNotExist,
        /// Returned if solution commitment does not exist when it should
        CaptchaSolutionCommitmentDoesNotExist,
        /// Returned if dapp user does not exist when it should
        DappUserDoesNotExist,
    }

    impl Prosopo {
        /// Constructor
        #[ink(constructor)]
        pub fn default(operator: AccountId) -> Self {
            ink_lang::codegen::initialize_contract(|contract| {
                Self::new_init(contract, operator)
            })
        }

        /// Default initializes the contract with the specified initial supply.
        fn new_init(&mut self, operator_account: AccountId) {
            let operator = Operator { status: Status::Active };
            self.operators.insert(operator_account, operator);
        }


        /// Setup phase messages

        // Register a provider, their service origin and fee
        #[ink(message)]
        pub fn provider_register(
            &mut self,
            service_origin: Hash,
            fee: u32,
            payee: Payee,
            provider_account: AccountId,
        ) -> Result<(), ProsopoError> {
            let caller = self.env().caller();
            // TODO eventually remove operator checks to allow anyone to signup
            // if !self.operators.get(&caller) {
            //     return Err(ProsopoError::NotAuthorised);
            // }
            let balance: u128 = 0;
            // this function is for registration only
            if self.providers.get(&provider_account).is_none() {
                return Err(ProsopoError::ProviderExists);
            }
            // add a new provider
            let provider = Provider {
                status: Status::Deactivated,
                balance,
                fee,
                service_origin,
                captcha_dataset_id: Hash::default(),
                payee,
            };
            ink_env::debug_println!("just about to insert a provider");
            self.providers.insert(provider_account, provider);
            self.provider_accounts.push(provider_account);
            self.env().emit_event(ProviderRegister {
                account: provider_account,
            });
            Ok(())
        }

        // // Update an existing provider, their service origin, fee
        #[ink(message)]
        //TODO test this
        pub fn provider_update(
            &mut self,
            service_origin: Hash,
            fee: u32,
            payee: Payee,
            provider_account: AccountId,
        ) -> Result<(), ProsopoError> {
            let caller = self.env().caller();

            if !(caller == provider_account) {
                return Err(ProsopoError::NotAuthorised);
            }

            // this function is for updating only, not registering
            if self.providers.get(&provider_account).is_none() {
                return Err(ProsopoError::ProviderDoesNotExist);
            }

            let existing = self
                .get_provider_details(provider_account)
                .unwrap();
            let transferred = self.env().transferred_balance();
            let balance: u128 = existing.balance + transferred;

            // update an existing provider
            let provider = Provider {
                status: Status::Deactivated,
                balance,
                fee,
                service_origin,
                captcha_dataset_id: existing.captcha_dataset_id,
                payee,
            };
            self.providers.insert(provider_account, provider);

            self.env().emit_event(ProviderUpdate {
                account: provider_account,
            });
            Ok(())
        }

        // De-Register a provider by setting their status to Deactivated
        #[ink(message)]
        pub fn provider_deregister(&mut self, provider_account: AccountId) -> Result<(), ProsopoError> {
            //TODO could get rid of provider_account parameter
            let caller = self.env().caller();
            if caller == provider_account {
                //if self.operators.get(&caller) {
                let mut provider = self.providers.get(&provider_account).unwrap();
                provider.status = Status::Deactivated;
                self.providers.insert(provider_account, provider);
                self.provider_accounts.retain(|account: &AccountId| account != &provider_account);
                self.env().emit_event(ProviderDeregister {
                    account: provider_account,
                });
                //}
            } else {
                return Err(ProsopoError::NotAuthorised);
            }
            Ok(())
        }

        // Stake and activate the provider's service
        #[ink(message)]
        pub fn provider_stake(&mut self) -> Result<(), ProsopoError> {
            let caller = self.env().caller();
            let transferred = self.env().transferred_balance();
            if transferred == 0 {
                return Err(ProsopoError::InsufficientBalance);
            }

            // TODO should the operators be able to do this ?
            if self.providers.get(&caller).is_some() {
                let mut provider = self.providers.get(&caller).unwrap();
                let total_balance = provider.balance + transferred;
                provider.balance = total_balance;
                if total_balance >= self.provider_stake_default {
                    provider.status = Status::Active;
                }
                self.providers.insert(caller, provider);
                self.env().emit_event(ProviderStake {
                    account: caller,
                    value: total_balance,
                });
            } else {
                //TODO is this necessary with the changes in ink? - returning an error SHOULD revert any changes but does it return funds?
                self.env().transfer(caller, transferred).ok();
                return Err(ProsopoError::ProviderDoesNotExist);
            }
            Ok(())
        }

        // Unstake and deactivate the provider's service, returning stake
        // TODO allow Provider to unstake(withdraw) less than they have staked
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_unstake(&mut self) -> Result<(), ProsopoError> {
            let caller = self.env().caller();
            // TODO should the operators be able to do this ?
            if self.providers.get(&caller).is_some() {
                let provider = self.get_provider_details(caller)?;
                let balance = provider.balance;
                if balance > 0 {
                    self.env().transfer(caller, balance).ok();
                    self.provider_deregister(caller);
                    self.env().emit_event(ProviderUnstake {
                        account: caller,
                        value: balance,
                    });
                }
            } else {
                return Err(ProsopoError::ProviderDoesNotExist);
            }
            Ok(())
        }

        // Add a new data set
        #[ink(message)]
        pub fn provider_add_data_set(
            &mut self,
            merkle_tree_root: Hash,
        ) -> Result<(), ProsopoError> {
            let provider_id = self.env().caller();
            // the calling account must belong to the provider
            // TODO add Prosopo operators? Currently, only a provider can add a data set for themselves.
            self.validate_provider(provider_id)?;

            let dataset = CaptchaData {
                provider: provider_id,
                merkle_tree_root,
                captcha_type: 0,
            };

            // create a new id and insert details of the new captcha data set
            self.captcha_data.insert(merkle_tree_root, &dataset);

            // set the captcha data id on the provider
            let mut provider = self.providers.get(&provider_id).unwrap();
            provider.captcha_dataset_id = merkle_tree_root;
            self.providers.insert(provider_id, provider);

            // emit event
            self.env().emit_event(ProviderAddDataset {
                account: provider_id,
                merkle_tree_root,
            });

            Ok(())
        }

        // Register a dapp
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
            let transferred = self.env().transferred_balance();
            // enforces a one to one relation between caller and dapp
            if self.dapps.get(&contract).is_some() {
                // mark the account as suspended if it is new and no funds have been transferred
                let status = if transferred > 0 {
                    Status::Active
                } else {
                    Status::Suspended
                };
                // TODO this means that any caller can register any contract.. is this an issue?
                let dapp = Dapp {
                    status,
                    balance: transferred,
                    owner,
                    min_difficulty: 1,
                    client_origin,
                };
                // keying on contract allows owners to own many contracts
                self.dapps.insert(contract, dapp);
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
            let dapp_exists = self.dapps.get(&contract).is_some();
            if dapp_exists == true {
                let mut dapp = self.dapps.get(&contract).unwrap();
                // only allow the owner to make changes to the dapp (including funding?!)
                if dapp.owner == caller {
                    let total = dapp.balance + transferred;
                    dapp.balance = total;
                    dapp.client_origin = client_origin;
                    dapp.owner = owner;
                    if dapp.balance > 0 {
                        dapp.status = Status::Active;
                    } else {
                        dapp.status = Status::Suspended;
                    }
                    self.dapps.insert(contract, dapp);
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

        // Fund dapp account to pay for services, if the Dapp caller is registered in self.dapps
        #[ink(message)]
        #[ink(payable)]
        pub fn dapp_fund(&mut self, contract: AccountId) {
            let caller = self.env().caller();
            let transferred = self.env().transferred_balance();
            if self.dapps.get(&contract).is_some() {
                let mut dapp = self.dapps.get(&contract).unwrap();
                if dapp.owner == caller {
                    let total = dapp.balance + transferred;
                    dapp.balance = total;
                    if dapp.balance > 0 {
                        dapp.status = Status::Active;
                        self.env().emit_event(DappFund {
                            contract,
                            value: total,
                        });
                    } else {
                        // Suspended as dapp has no funds
                        dapp.status = Status::Suspended;
                    }
                }
            } else {
                //return the transferred balance to the caller
                self.env().transfer(caller, transferred).ok();
            }
        }

        // Cancel services as a dapp, returning remaining tokens
        #[ink(message)]
        pub fn dapp_cancel(&mut self, contract: AccountId) -> Result<(), ProsopoError> {
            let caller = self.env().caller();

            if self.dapps.get(&contract).is_none() {
                return Err(ProsopoError::DappDoesNotExist);
            }
            let dapp = self.get_dapp_details(contract)?;

            // TODO should the operators be authorised to do this ?
            if dapp.owner != caller {
                return Err(ProsopoError::NotAuthorised);
            }

            let balance = dapp.balance;
            // TODO ensure that the dapp has no outstanding payments due
            if dapp.balance > 0 {
                ink_env::debug_println!("Dapp Balance: {}", dapp.balance);
                self.env().transfer(caller, dapp.balance).ok();
                self.dapp_deregister(contract);
                self.env().emit_event(DappCancel {
                    contract,
                    value: balance,
                });
            }

            Ok(())
        }

        /// De-Register a dapp by setting their status to Deactivated and their balance to 0
        fn dapp_deregister(&mut self, dapp_account: AccountId) {
            let mut dapp = self.dapps.get(&dapp_account).unwrap();
            dapp.status = Status::Deactivated;
            dapp.balance = 0;
            self.dapps.insert(dapp_account, dapp);
            self.dapp_accounts.retain(|account: &AccountId| account != &dapp_account);
        }

        /// Captcha reputation protocol messages

        // Submit a captcha solution commit
        #[ink(message)]
        pub fn dapp_user_commit(
            &mut self,
            contract: AccountId,
            // the id of the captcha data set
            captcha_dataset_id: Hash,
            user_merkle_tree_root: Hash,
        ) -> Result<(), ProsopoError> {
            let caller = self.env().caller();
            // Guard against incorrect data being submitted
            if self.captcha_data.get(&captcha_dataset_id).is_none() {
                return Err(ProsopoError::CaptchaDataDoesNotExist);
            }

            // make sure the dapp exists and is active
            self.validate_dapp(contract)?;

            // create the commitment
            let commitment = CaptchaSolutionCommitment {
                account: caller,
                captcha_dataset_id,
                status: Status::Pending,
                contract,
            };

            // Add a new dapp user
            self.create_new_dapp_user(caller);

            // insert the new solution commitment with next key
            self.captcha_solution_commitments.insert(user_merkle_tree_root, &commitment);

            self.env().emit_event(DappUserCommit {
                account: caller,
                merkle_tree_root: user_merkle_tree_root,
                contract,
                captcha_dataset_id,
            });
            Ok(())
        }

        fn create_new_dapp_user(&mut self, account: AccountId) {
            // create the user and add to our list of dapp users
            let user = User {
                correct_captchas: 0,
                incorrect_captchas: 0,
                //last_correct_captcha: (),
                //last_correct_captcha_dapp_id: (),
            };
            self.dapp_users.insert(account, &user);
            self.dapp_user_accounts.push(account);
        }

        // Approve a solution commitment, add reputation, and refund the users tx fee
        #[ink(message)]
        // TODO - should providers be prevented from later changing the status?
        pub fn provider_approve(
            &mut self,
            captcha_solution_commitment_id: Hash,
        ) -> Result<(), ProsopoError> {
            let caller = self.env().caller();
            self.validate_provider(caller)?;
            let provider = self.providers.get(&caller).unwrap();
            // Guard against incorrect solution id
            let commitment = self.get_captcha_solution_commitment(
                captcha_solution_commitment_id,
                provider.captcha_dataset_id,
            )?;
            self.validate_dapp(commitment.contract)?;
            // Check the user exists
            self.get_dapp_user(commitment.account)?;


            // get the mutables
            let mut commitment_mut = self
                .captcha_solution_commitments
                .get(&captcha_solution_commitment_id).unwrap();
            let mut user = self.dapp_users.get(&commitment.account).unwrap();

            // only make changes if commitment is Pending approval or disapproval
            if commitment_mut.status == Status::Pending {
                commitment_mut.status = Status::Approved;
                user.correct_captchas += 1;
                self.captcha_solution_commitments.insert(captcha_solution_commitment_id, &commitment_mut);
                self.dapp_users.insert(&commitment.account, &user);
                self.pay_fee(&caller, &commitment.contract)?;
                self.env().emit_event(ProviderApprove {
                    captcha_solution_commitment_id,
                });
            }

            Ok(())
        }

        // Disapprove a solution commitment and subtract reputation
        #[ink(message)]
        pub fn provider_disapprove(
            &mut self,
            captcha_solution_commitment_id: Hash,
        ) -> Result<(), ProsopoError> {
            let caller = self.env().caller();
            self.validate_provider(caller)?;
            let provider = self.providers.get(&caller).unwrap();
            // Guard against incorrect solution id
            let commitment = self.get_captcha_solution_commitment(
                captcha_solution_commitment_id,
                provider.captcha_dataset_id,
            )?;
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
            if commitment_mut.status == Status::Pending {
                commitment_mut.status = Status::Disapproved;
                user.incorrect_captchas += 1;
                self.captcha_solution_commitments.insert(captcha_solution_commitment_id, &commitment_mut);
                self.dapp_users.insert(&commitment.account, &user);
                self.pay_fee(&caller, &commitment.contract)?;
                self.env().emit_event(ProviderDisapprove {
                    captcha_solution_commitment_id,
                });
            }

            Ok(())
        }

        // Transfer a balance from a provider to a dapp or from a dapp to a provider,
        fn pay_fee(&mut self, provider_account: &AccountId, dapp_account: &AccountId) -> Result<(), ProsopoError> {
            let mut provider = self.providers.get(provider_account).unwrap();
            if provider.fee != 0 {
                let mut dapp = self.dapps.get(dapp_account).unwrap();

                let fee = Balance::from(provider.fee);
                if provider.payee == Payee::Provider {
                    // add the fee to the provider's balance
                    provider.balance = provider.balance + fee;
                    dapp.balance = dapp.balance - fee;
                }
                if provider.payee == Payee::Dapp {
                    // take the fee from the provider's balance
                    provider.balance = provider.balance - fee;
                    dapp.balance = dapp.balance + fee;
                }
                self.providers.insert(*provider_account, provider);
                self.dapps.insert(*dapp_account, dapp);
            }
            Ok(())
        }


        // Checks if the user is a human (true) as they have a solution rate higher than a % threshold or a bot (false)
        // Threshold is decided by the calling user
        #[ink(message)]
        pub fn dapp_operator_is_human_user(
            &mut self,
            user: AccountId,
            threshold: u8,
        ) -> Result<bool, ProsopoError> {
            let user = self.get_dapp_user(user)?;
            // determine if correct captchas is greater than or equal to threshold
            Ok(
                user.correct_captchas / (user.correct_captchas + user.incorrect_captchas) * 100
                    >= threshold.into(),
            )
        }

        /// Disputes and governance messages

        // Add an operator
        #[ink(message)]
        pub fn add_prosopo_operator(&mut self, operator_account: AccountId) {
            let caller = self.env().caller();
            if self.operators.get(&caller).is_some() {
                let operator = Operator { status: Status::Active };
                self.operators.insert(operator_account, operator);
                self.operator_accounts.push(operator_account);
            }
        }

        /// Informational / Validation functions

        fn validate_provider(
            &self,
            provider_id: AccountId,
        ) -> Result<(), ProsopoError> {
            if self.providers.get(&provider_id).is_none() {
                ink_env::debug_println!("{}", "ProviderDoesNotExist");
                return Err(ProsopoError::ProviderDoesNotExist);
            }
            let provider = self.get_provider_details(provider_id)?;
            if provider.status != Status::Active {
                ink_env::debug_println!("{}", "ProviderInactive");
                return Err(ProsopoError::ProviderInactive);
            }
            if provider.balance <= 0 {
                ink_env::debug_println!("{}", "ProviderInsufficientFunds");
                return Err(ProsopoError::ProviderInsufficientFunds);
            }
            Ok(())
        }

        fn validate_dapp(&self, contract: AccountId) -> Result<(), ProsopoError> {
            // Guard against dapps using service that are not registered
            if self.dapps.get(&contract).is_none() {
                ink_env::debug_println!("{}", "DappDoesNotExist");
                return Err(ProsopoError::DappDoesNotExist);
            }
            // Guard against dapps using service that are Suspended or Deactivated
            let dapp = self.get_dapp_details(contract)?;
            if dapp.status != Status::Active {
                ink_env::debug_println!("{}", "DappInactive");
                return Err(ProsopoError::DappInactive);
            }
            // Make sure the Dapp can pay the transaction fees of the user and potentially the
            // provider, if their fee > 0
            if dapp.balance <= 0 {
                ink_env::debug_println!("{}", "DappInsufficientFunds");
                return Err(ProsopoError::DappInsufficientFunds);
            }
            //ink_env::debug_println!("{}","dapp has validated");
            Ok(())
        }

        pub fn get_captcha_solution_commitment(
            &self,
            captcha_solution_commitment_id: Hash,
            captcha_dataset_id: Hash,
        ) -> Result<CaptchaSolutionCommitment, ProsopoError> {
            if self
                .captcha_solution_commitments
                .get(&captcha_solution_commitment_id).is_none()
            {
                return Err(ProsopoError::CaptchaSolutionCommitmentDoesNotExist);
            }
            let commitment = self
                .captcha_solution_commitments
                .get(&captcha_solution_commitment_id)
                .unwrap();
            // The provider must own the captcha data to modify the commitment
            if commitment.captcha_dataset_id != captcha_dataset_id {
                return Err(ProsopoError::NotAuthorised);
            }
            Ok(commitment)
        }

        /// Get a dapp user
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_dapp_user(&self, dapp_user_id: AccountId) -> Result<User, ProsopoError> {
            if self.dapp_users.get(&dapp_user_id).is_none() {
                ink_env::debug_println!("{}", "DappUserDoesNotExist");
                return Err(ProsopoError::DappUserDoesNotExist);
            }
            Ok(self.dapp_users.get(&dapp_user_id).unwrap())
        }

        /// Get a single provider's details
        ///
        /// Returns an error if the user does not exist
        #[ink(message)]
        pub fn get_provider_details(
            &self,
            accountid: AccountId,
        ) -> Result<Provider, ProsopoError> {
            if self.providers.get(&accountid).is_none() {
                ink_env::debug_println!("{}", "ProviderDoesNotExist");
                return Err(ProsopoError::ProviderDoesNotExist);
            }
            let provider = self.providers.get(&accountid);
            Ok(provider.unwrap())
        }

        /// Get a single dapps details
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_dapp_details(&self, contract: AccountId) -> Result<Dapp, ProsopoError> {
            if self.dapps.get(&contract).is_none() {
                ink_env::debug_println!("{}", "DappDoesNotExist");
                return Err(ProsopoError::DappDoesNotExist);
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
                Ok(v) => { v.balance }
                Err(_e) => Balance::from(0_u32)
            };
        }

        /// Returns the account balance for the specified `provider`.
        ///
        /// Returns `0` if the account does not exist.
        #[ink(message)]
        pub fn get_provider_balance(&self, provider: AccountId) -> Balance {
            return match self.get_provider_details(provider) {
                Ok(v) => { v.balance }
                Err(_e) => Balance::from(0_u32)
            };
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// The below code is technically just normal Rust code.
    #[cfg(not(feature = "ink-experimental-engine"))]
    #[cfg(test)]
    mod tests {
        use ink_env::{call, test};
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
            assert!(provider_record.status == Status::Deactivated);
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

        use crate::prosopo::ProsopoError::ProviderInactive;

        use super::*;

        type Event = <Prosopo as ::ink_lang::reflect::ContractEventBase>::Type;

        /// Test provider stake
        #[ink::test]
        fn test_provider_stake() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
            let provider_account = AccountId::from([0x02; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
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
            contract.provider_stake();

            let emitted_events = ink_env::test::recorded_events().collect::<Vec<_>>();

            // first event is the register event, second event is the stake event
            assert_eq!(2, emitted_events.len());

            let event_register = &emitted_events[0];
            let event_stake = &emitted_events[1];

            let decoded_event_register =
                <Event as scale::Decode>::decode(&mut &event_register.data[..])
                    .expect("encountered invalid contract event data buffer");

            if let Event::ProviderRegister(ProviderRegister { account }) =
            decoded_event_register
            {
                assert_eq!(
                    account, provider_account,
                    "encountered invalid ProviderStake.account"
                );
            } else {
                panic!(
                    "encountered unexpected event kind: expected a ProviderRegister event"
                );
            }

            let decoded_event_stake = <Event as scale::Decode>::decode(&mut &event_stake.data[..])
                .expect("encountered invalid contract event data buffer");

            if let Event::ProviderStake(ProviderStake { account, value }) =
            decoded_event_stake
            {
                assert_eq!(
                    account, provider_account,
                    "encountered invalid ProviderStake.account"
                );
                assert_eq!(
                    value, balance,
                    "encountered invalid ProviderStake.value"
                );
            } else {
                panic!("encountered unexpected event kind: expected a ProviderStake event");
            }
        }

        /// Test provider unstake
        #[ink::test]
        fn test_provider_unstake() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
            let provider_account = AccountId::from([0x02; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
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
            contract.provider_stake();
            contract.provider_unstake().ok();
            let emitted_events = ink_env::test::recorded_events().collect::<Vec<_>>();

            // events are the register event, stake event, and the unstake event

            // let e0 = &mut &emitted_events[0].data[..];
            // let decoded_event_unstake_0 = <Event as scale::Decode>::decode(e0);
            //
            // let Event::ProviderUnstake(ProviderUnstake { account, value }) = decoded_event_unstake_0;
            // let message = ink_prelude::format!("{:?}", account);
            // ink_env::debug_println!("{}",&message);
            assert_eq!(3, emitted_events.len());

            let event_unstake = &emitted_events[2];
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
                assert_eq!(
                    value, balance,
                    "encountered invalid ProviderUnstake.value"
                );
            } else {
                panic!("encountered unexpected event kind: expected a ProviderStake event");
            }
        }

        /// Test provider add data set
        #[ink::test]
        //TODO off-chain environment does not yet support `block_timestamp`
        fn test_provider_add_data_set() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
            let provider_account = AccountId::from([0x02; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
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
            contract.provider_stake();
            let root = str_to_hash("merkle tree".to_string());
            contract.provider_add_data_set(root).ok();
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
                panic!(
                    "encountered unexpected event kind: expected a ProviderAddDataset event"
                );
            }
        }

        /// Test provider cannot add data set if inactive
        #[ink::test]
        fn test_provider_cannot_add_data_set_if_inactive() {
            let operator_account = AccountId::from([0x1; 32]);
            let mut contract = Prosopo::default(operator_account);
            let provider_account = AccountId::from([0x02; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
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
            let result = contract.provider_add_data_set(root).unwrap_err();
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
            ink_env::debug_println!("{:?}",contract.dapps);
            assert!(contract.dapps.get(&dapp_contract).is_some());
            let dapp = contract.dapps.get(&dapp_contract).unwrap();
            assert_eq!(dapp.owner, caller);
            assert_eq!(dapp.client_origin, client_origin);

            // account is marked as suspended as zero tokens have been paid
            assert_eq!(dapp.status, Status::Suspended);
            assert_eq!(dapp.balance, balance);
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
            ink_env::debug_println!("{:?}",contract.dapps);
            // check the dapp exists in the hashmap
            assert!(contract.dapps.get(&dapp_contract).is_some());

            // check the various attributes are correct
            let dapp = contract.dapps.get(&dapp_contract).unwrap();
            assert_eq!(dapp.owner, caller);
            assert_eq!(dapp.client_origin, client_origin);

            // account is marked as active as balance is now positive
            assert_eq!(dapp.status, Status::Active);
            assert_eq!(dapp.balance, balance);
        }

        /// Test dapp register and then update
        #[ink::test]
        //TODO fix tests so that register and update are separate
        fn test_dapp_register_and_update() {
            // TODO fix this test so that contract is actually updated, currently a new one is being
            //   created
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
            assert_eq!(dapp.status, Status::Active);
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
            assert_eq!(dapp.status, Status::Active);
            assert_eq!(dapp.balance, balance_1 + balance_2);
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
            assert_eq!(dapp.status, Status::Deactivated);

            //ink_env::debug_println!("{:?}", InkString::from("blablabh"));
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
            contract.provider_stake();
            // can only add data set after staking
            // TODO test scenario where dataset is added before staking
            contract.provider_add_data_set(root).ok();

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
                .dapp_user_commit(dapp_contract_account, root, user_root)
                .ok();

            // check that the data is in the captcha_solution_commitments hashmap
            assert!(contract.captcha_solution_commitments.get(&user_root).is_some());

        }

        /// Test provider approve
        #[ink::test]
        // TODO move the common stuff to a setup function
        fn test_provider_approve() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 1;
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_stake();
            // can only add data set after staking
            contract.provider_add_data_set(root).ok();

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
                .dapp_user_commit(dapp_contract_account, root, user_root)
                .ok();

            // Call from the provider account to mark the solution as approved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_approve(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, Status::Approved);
            let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account);
            let new_provider_balance = contract.get_provider_balance(provider_account);
            ink_env::debug_println!("\nDapp Balance: {}", new_dapp_balance);
            ink_env::debug_println!("Provider Balance: {}", new_provider_balance);
            assert_eq!(balance - Balance::from(fee), new_dapp_balance);
            assert_eq!(balance + Balance::from(fee), new_provider_balance);

            // Now make sure that the provider cannot later set the solution to disapproved and make
            // sure that the dapp balance is unchanged
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, Status::Approved);
            assert_eq!(balance - Balance::from(fee), contract.get_dapp_balance(dapp_contract_account));
            assert_eq!(balance + Balance::from(fee), contract.get_provider_balance(provider_account));
        }

        /// Test provider cannot approve invalid solution id
        #[ink::test]
        fn test_provider_approve_invalid_id() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let provider_account = AccountId::from([0x2; 32]);
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 0;
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_stake();
            // can only add data set after staking
            // TODO test scenario where dataset is added before staking
            contract.provider_add_data_set(root).ok();

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
                .dapp_user_commit(dapp_contract_account, root, user_root)
                .ok();

            // Call from the provider account to mark the wrong solution as approved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let solution_id = str_to_hash("id that does not exist".to_string());
            let result = contract.provider_approve(solution_id);
            assert_eq!(
                ProsopoError::CaptchaSolutionCommitmentDoesNotExist,
                result.unwrap_err()
            );
        }

        /// Test provider disapprove
        #[ink::test]
        // TODO move the common stuff to a setup function
        fn test_provider_disapprove() {
            let operator_account = AccountId::from([0x1; 32]);

            // initialise the contract
            let mut contract = Prosopo::default(operator_account);

            // Register the provider
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin = str_to_hash("https://localhost:2424".to_string());
            let fee: u32 = 1;
            contract
                .provider_register(service_origin, fee, Payee::Provider, provider_account)
                .ok();

            // Call from the provider account to add data and stake tokens
            let balance = 100;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_stake();
            // can only add data set after staking
            contract.provider_add_data_set(root).ok();

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
                .dapp_user_commit(dapp_contract_account, root, user_root)
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, Status::Disapproved);
            let new_dapp_balance = contract.get_dapp_balance(dapp_contract_account);
            let new_provider_balance = contract.get_provider_balance(provider_account);
            ink_env::debug_println!("\nDapp Balance: {}", new_dapp_balance);
            ink_env::debug_println!("Provider Balance: {}", new_provider_balance);
            assert_eq!(balance - Balance::from(fee), new_dapp_balance);
            assert_eq!(balance + Balance::from(fee), new_provider_balance);

            // Now make sure that the provider cannot later set the solution to approved
            contract.provider_approve(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, Status::Disapproved);
            assert_eq!(balance - Balance::from(fee), contract.get_dapp_balance(dapp_contract_account));
            assert_eq!(balance + Balance::from(fee), contract.get_provider_balance(provider_account));
            //ink_env::debug_println!("{:?}", contract.providers.values());
        }

        /// Test dapp user is human
        #[ink::test]
        // TODO probably should change the name of this function in the main contract
        fn test_dapp_operator_is_human_user() {
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
            let root = str_to_hash("merkle tree root".to_string());
            ink_env::test::set_value_transferred::<ink_env::DefaultEnvironment>(balance);
            contract.provider_stake();
            // can only add data set after staking
            contract.provider_add_data_set(root).ok();

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
                .dapp_user_commit(dapp_contract_account, root, user_root)
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(&solution_id)
                .unwrap();
            assert_eq!(commitment.status, Status::Disapproved);

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

