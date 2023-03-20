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

// We must make sure that this is the same as declared in the substrate source code.
// this is the signing context used by the schnorrkel library when signing messages. It has to be the same binary blob on both sides of the signing process (i.e. the signing and the verifying) as it is used in the encryption/decryption process.
const CTX: &'static [u8] = b"substrate";

pub use self::prosopo::{Prosopo, ProsopoRef};

/// Print and return an error in ink
macro_rules! err {
    ($err:expr) => {{
        Err(get_self!().print_err($err, function_name!()))
    }};
}

// ($err:expr) => (
// |$err| crate::print_error($err, function_name!(), get_self!().env().block_number(), get_self!().env().caller())
// );

macro_rules! err_fn {
    ($err:expr) => {
        || get_self!().print_err($err, function_name!())
    };
}

macro_rules! lazy_push {
    ($lazy:expr, $value:expr) => {
        let mut vec = $lazy.get_or_default();
        vec.push($value);
        $lazy.set(&vec);
    };
}

/// Concatenate two arrays (a and b) into a new array (c)
fn concat_u8<const A: usize, const B: usize, const C: usize>(a: &[u8; A], b: &[u8; B]) -> [u8; C] {
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
    use ink::env::hash::{Blake2x128, Blake2x256, CryptoHash, HashOutput};
    use ink::prelude::collections::btree_set::BTreeSet;
    use ink::prelude::vec::Vec;
    use ink::storage::Lazy;
    #[allow(unused_imports)] // do not remove StorageLayout, it is used in derives
    use ink::storage::{traits::StorageLayout, Mapping};
    use schnorrkel::{PublicKey, Signature};

    /// GovernanceStatus relates to DApps and Providers and determines if they are active or not
    #[derive(Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum GovernanceStatus {
        Active,    // active and available for use
        Suspended, // a state that should be used for dapps/providers whose stake drops below the minimum required or who are being investigated as part of a slashing event etc.
        #[default]
        Deactivated, // temporarily inactive
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
        #[default]
        Dapp,
    }

    /// Dapps must be able to filter Providers by their Payee when they are searching for a Provider
    #[derive(Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
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
        service_origin: Vec<u8>,
        dataset_id: Hash,
    }

    /// RandomProvider is selected randomly by the contract for the client side application
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct RandomProvider {
        provider_id: AccountId,
        provider: Provider,
        block_number: u32,
        dataset_id_content: Hash,
    }

    /// Operators are controllers of this contract with admin rights
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Operator {
        status: GovernanceStatus,
    }

    /// Enum for various types of captcha
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum CaptchaType {
        ImageGrid,
    }

    /// CaptchaData contains the hashed root of a Provider's dataset and is used to verify that
    /// the captchas received by a DappUser did belong to the Provider's original dataset
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct CaptchaData {
        provider: AccountId,
        dataset_id: Hash,
        dataset_id_content: Hash,
        captcha_type: CaptchaType,
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
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct Dapp {
        status: GovernanceStatus,
        balance: Balance,
        owner: AccountId,
        min_difficulty: u16,
        payee: DappPayee,
    }

    /// Users are the users of DApps that are required to be verified as human before they are
    /// allowed to interact with the DApps' contracts.
    #[derive(PartialEq, Debug, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct User {
        // the last n commitment hashes in chronological order (most recent first)
        history: Vec<Hash>, // lookup the commitment in Prosopo.commitments
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
        pub before_ms: u64,
        pub dapp_id: AccountId,
    }

    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct OperatorVote {
        pub account_id: AccountId,
        pub vote: Option<Vote>,
    }

    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderState {
        pub status: GovernanceStatus,
        pub payee: Payee,
    }

    /// Set of actions which can be performed by operators given a successful vote
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum Vote {
        SetCodeHash([u8; 32]),        // accepts the code hash
        Withdraw(AccountId, Balance), // accepts the recipient and the amount
        Terminate(AccountId), // accepts the account to send the remaining balance of this contract to after termination
    }

    /// The status of the current voting process.
    #[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum VoteStatus {
        Pass,    // vote has been successful
        Fail,    // vote has failed due to disagreement in votes
        Pending, // not enough people have voted
    }

    // Contract storage
    #[ink(storage)]
    pub struct Prosopo {
        providers: Mapping<AccountId, Provider>,
        provider_accounts: Mapping<ProviderState, BTreeSet<AccountId>>,
        service_origins: Mapping<Hash, ()>,
        captcha_data: Mapping<Hash, CaptchaData>,
        provider_stake_default: Balance,
        dapp_stake_default: Balance,
        dapps: Mapping<AccountId, Dapp>,
        dapp_accounts: Lazy<Vec<AccountId>>,
        operators: Mapping<AccountId, Operator>,
        operator_accounts: Lazy<Vec<AccountId>>,
        operator_stake_default: Balance,
        captcha_solution_commitments: Mapping<Hash, CaptchaSolutionCommitment>, // the commitments submitted by DappUsers
        dapp_users: Mapping<AccountId, User>,
        dapp_user_accounts: Lazy<Vec<AccountId>>,
        operator_votes: Mapping<AccountId, Vote>,
        max_user_history_len: u16, // the max number of captcha results to store in history for a user
        max_user_history_age: u64, // the max age of captcha results to store in history for a user
        max_provider_fee: Balance,
    }

    // Event emitted when a new provider registers
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderRegister {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a new provider deregisters
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderDeregister {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a new provider is updated
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderUpdate {
        #[ink(topic)]
        account: AccountId,
    }

    // Event emitted when a provider stakes
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderStake {
        #[ink(topic)]
        account: AccountId,
        value: Balance,
    }

    // Event emitted when a provider adds a data set
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderAddDataset {
        #[ink(topic)]
        account: AccountId,
        dataset_id: Hash,
        dataset_id_content: Hash,
    }

    // Event emitted when a provider unstakes
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderUnstake {
        #[ink(topic)]
        account: AccountId,
        value: Balance,
    }

    // Event emitted when a provider approves a solution
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderApprove {
        #[ink(topic)]
        captcha_solution_commitment_id: Hash,
    }

    // Event emitted when a provider disapproves a solution
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct ProviderDisapprove {
        #[ink(topic)]
        captcha_solution_commitment_id: Hash,
    }

    // Event emitted when a dapp registers
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct DappRegister {
        #[ink(topic)]
        contract: AccountId,
        owner: AccountId,
        value: Balance,
        payee: DappPayee,
        status: GovernanceStatus,
    }

    // Event emitted when a dapp updates
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct DappUpdate {
        #[ink(topic)]
        contract: AccountId,
        owner: AccountId,
        value: Balance,
        payee: DappPayee,
        status: GovernanceStatus,
    }

    // Event emitted when a dapp funds
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct DappFund {
        #[ink(topic)]
        contract: AccountId,
        value: Balance,
    }

    // Event emitted when a dapp cancels
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct DappCancel {
        #[ink(topic)]
        contract: AccountId,
        value: Balance,
    }

    // Event emitted when a dapp user commits a solution hash
    #[ink(event)]
    #[derive(PartialEq, Debug, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct DappUserCommit {
        #[ink(topic)]
        account: AccountId,
        merkle_tree_root: Hash,
        contract: AccountId,
        dataset_id: Hash,
    }

    /// The Prosopo error types
    ///
    #[derive(Default, PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum Error {
        /// Returned if minimum number of operators is not supplied
        MinimumTwoOperatorsRequired,
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
        /// Returned if the captcha solution commitment has already been approved
        CaptchaSolutionCommitmentAlreadyApproved,
        /// Returned if the captcha solution commitment has already been approved
        CaptchaSolutionCommitmentAlreadyDisapproved,
        /// Returned if the caller has set their own AccountId as the code hash
        InvalidCodeHash,
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
        /// Returned if the function has been disabled in the contract
        FunctionDisabled,
        /// Returned if provider fee is too high
        ProviderFeeTooHigh,
        /// Returned if the account is an operator, hence the operation is not allowed due to conflict of interest
        AccountIsOperator,
        /// Returned if the signature is invalid during signing
        InvalidSignature,
        /// Returned if the public key is invalid during signing
        InvalidPublicKey,
    }

    impl Prosopo {
        /// Constructor
        #[ink(constructor, payable)]
        pub fn default(
            operator_accounts: Vec<AccountId>,
            provider_stake_default: Balance,
            dapp_stake_default: Balance,
            max_user_history_len: u16,
            max_user_history_age: u64,
            max_provider_fee: Balance,
        ) -> Self {
            if operator_accounts.len() < 2 {
                panic!("{:?}", Error::MinimumTwoOperatorsRequired)
            }
            let mut operators = Mapping::new();
            let mut operator_accounts_lazy = Lazy::new();
            for operator_account in operator_accounts.iter() {
                let operator = Operator {
                    status: GovernanceStatus::Active,
                };
                operators.insert(operator_account, &operator);
                operator_accounts_lazy.set(&operator_accounts);
            }

            Self {
                providers: Default::default(),
                provider_accounts: Default::default(),
                service_origins: Default::default(),
                captcha_data: Default::default(),
                operator_accounts: operator_accounts_lazy,
                operator_stake_default: 0,
                dapp_users: Default::default(),
                operators,
                provider_stake_default,
                dapp_stake_default,
                dapps: Default::default(),
                dapp_accounts: Default::default(),
                dapp_user_accounts: Default::default(),
                operator_votes: Default::default(),
                max_user_history_len,
                max_user_history_age,
                captcha_solution_commitments: Default::default(),
                max_provider_fee,
            }
        }

        /// Verify a signature. The payload is a blake128 hash of the payload wrapped in the Byte tag. E.g.
        ///     message="hello"
        ///     hash=blake128(message) // 0x1234... (32 bytes)
        ///     payload="<Bytes>0x1234...</Bytes>" (32 bytes + 15 bytes (tags) + 2 bytes (multihash notation) = 47 bytes)
        ///
        /// Read more about multihash notation here https://w3c-ccg.github.io/multihash/index.xml#mh-example (adds two bytes to identify type and length of hash function)
        ///
        /// Note the signature must be sr25519 type.
        #[ink(message)]
        pub fn verify_sr25519(
            &self,
            signature: [u8; 64],
            payload: [u8; 49],
        ) -> Result<bool, Error> {
            let caller = self.env().caller();
            let mut caller_bytes = [0u8; 32];
            let caller_ref: &[u8] = caller.as_ref();
            caller_bytes.copy_from_slice(&caller_ref[..32]);

            debug!("caller {:?}", caller);
            debug!("sig {:?}", signature);
            debug!("payload {:?}", payload);

            let sig = Signature::from_bytes(&signature).map_err(|_| Error::InvalidSignature)?;
            let pub_key =
                PublicKey::from_bytes(&caller_bytes).map_err(|_| Error::InvalidPublicKey)?;
            let res = pub_key.verify_simple(crate::CTX, &payload, &sig);
            Ok(res.is_ok())
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

        /// Get contract provider minimum stake default.
        #[ink(message)]
        pub fn get_provider_stake_default(&self) -> Balance {
            self.provider_stake_default
        }

        /// Get contract dapp minimum stake default.
        #[ink(message)]
        pub fn get_dapp_stake_default(&self) -> Balance {
            self.dapp_stake_default
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

        /// Register a provider, their service origin and fee
        #[ink(message)]
        pub fn provider_register(
            &mut self,
            service_origin: Vec<u8>,
            fee: u32,
            payee: Payee,
        ) -> Result<(), Error> {
            let provider_account = self.env().caller();
            // this function is for registration only
            if self.providers.get(provider_account).is_some() {
                return err!(Error::ProviderExists);
            }

            self.check_provider_fee(fee)?;

            // provider cannot be an operator
            self.check_not_operator(provider_account)?;

            let service_origin_hash = self.hash_vec_u8(&service_origin);

            // prevent duplicate service origins
            if self.service_origins.get(service_origin_hash).is_some() {
                return err!(Error::ProviderServiceOriginUsed);
            }
            let balance: Balance = 0;
            // add a new provider
            let provider = Provider {
                status: GovernanceStatus::Deactivated,
                balance,
                fee,
                service_origin,
                dataset_id: Hash::default(),
                payee,
            };
            self.providers.insert(provider_account, &provider);
            self.service_origins.insert(service_origin_hash, &());
            let mut provider_accounts_map = self
                .provider_accounts
                .get(ProviderState {
                    status: GovernanceStatus::Deactivated,
                    payee,
                })
                .unwrap_or_default();
            provider_accounts_map.insert(provider_account);
            self.provider_accounts.insert(
                ProviderState {
                    status: GovernanceStatus::Deactivated,
                    payee,
                },
                &provider_accounts_map,
            );
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
            service_origin: Vec<u8>,
            fee: u32,
            payee: Payee,
        ) -> Result<(), Error> {
            let provider_account = self.env().caller();

            // this function is for updating only, not registering
            if self.providers.get(provider_account).is_none() {
                return err!(Error::ProviderDoesNotExist);
            }

            self.check_provider_fee(fee)?;

            // provider cannot be an operator
            self.check_not_operator(provider_account)?;

            let existing = self.get_provider_details(provider_account)?;

            if existing.service_origin != service_origin {
                let service_origin_hash = self.hash_vec_u8(&service_origin);
                // prevent duplicate service origins
                if self.service_origins.get(service_origin_hash).is_some() {
                    return err!(Error::ProviderServiceOriginUsed);
                } else {
                    let existing_service_origin_hash = self.hash_vec_u8(&existing.service_origin);
                    self.service_origins.remove(existing_service_origin_hash);
                    self.service_origins.insert(service_origin_hash, &());
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
                payee,
            };

            self.provider_change_status(provider_account, old_status, new_status, payee);
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
            payee: Payee,
        ) {
            if current_provider_status != new_status {
                let current_key = ProviderState {
                    status: current_provider_status,
                    payee,
                };
                let new_key = ProviderState {
                    status: new_status,
                    payee,
                };
                // Retrieve indexes from storage mapping
                let mut current_status_provider_accounts =
                    self.provider_accounts.get(current_key).unwrap_or_default();

                let mut new_status_provider_accounts =
                    self.provider_accounts.get(new_key).unwrap_or_default();

                // Move provider to the correct index
                current_status_provider_accounts.remove(&provider_account);
                new_status_provider_accounts.insert(provider_account);

                // Store mapping
                self.provider_accounts
                    .insert(current_key, &current_status_provider_accounts);
                self.provider_accounts
                    .insert(new_key, &new_status_provider_accounts);
            }
        }

        /// De-Register a provider by setting their status to Deactivated
        #[ink(message)]
        pub fn provider_deregister(&mut self, provider_account: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != provider_account {
                return err!(Error::NotAuthorised);
            }

            // Get provider
            let mut provider = self
                .providers
                .get(provider_account)
                .ok_or_else(err_fn!(Error::ProviderDoesNotExist))?;

            // Update provider status
            self.provider_change_status(
                provider_account,
                provider.status,
                GovernanceStatus::Deactivated,
                provider.payee,
            );
            provider.status = GovernanceStatus::Deactivated;
            self.providers.insert(provider_account, &provider);

            self.env().emit_event(ProviderDeregister {
                account: provider_account,
            });
            Ok(())
        }

        /// Unstake and deactivate the provider's service, returning stake
        #[ink(message)]
        #[ink(payable)]
        pub fn provider_unstake(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if self.providers.get(caller).is_none() {
                return err!(Error::ProviderDoesNotExist);
            }

            let provider = self.get_provider_details(caller)?;
            let balance = provider.balance;
            if balance > 0 {
                self.env()
                    .transfer(caller, balance)
                    .map_err(|_| Error::ContractTransferFailed)?;
                self.provider_deregister(caller)?;
                self.env().emit_event(ProviderUnstake {
                    account: caller,
                    value: balance,
                });
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
                return err!(Error::DatasetIdSolutionsSame);
            }
            let provider_id = self.env().caller();
            // the calling account must belong to the provider
            self.validate_provider_exists_and_has_funds(provider_id)?;
            let dataset = CaptchaData {
                provider: provider_id,
                dataset_id,
                dataset_id_content,
                captcha_type: CaptchaType::ImageGrid,
            };

            let mut provider = self
                .providers
                .get(provider_id)
                .ok_or_else(err_fn!(Error::ProviderDoesNotExist))?;
            let dataset_id_old = provider.dataset_id;

            // create a new id and insert details of the new captcha data set if it doesn't exist
            if self.captcha_data.get(dataset_id).is_none() {
                self.captcha_data.insert(dataset_id, &dataset);
                // remove the old dataset_id from the Mapping
                self.captcha_data.remove(dataset_id_old);
            }

            // set the captcha data id on the provider
            provider.dataset_id = dataset_id;
            let old_status = provider.status;

            // change the provider status to active if it was not active
            if provider.status != GovernanceStatus::Active
                && provider.balance >= self.provider_stake_default
                && dataset_id != Hash::default()
            {
                provider.status = GovernanceStatus::Active;
                self.provider_change_status(
                    provider_id,
                    old_status,
                    provider.status,
                    provider.payee,
                );
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

        /// Configure a dapp's funds and status, handling transferred value
        fn dapp_configure_funding(&self, dapp: &mut Dapp) {
            // update the dapp funds
            dapp.balance += self.env().transferred_value();

            // update the dapp status
            dapp.status = if dapp.balance >= self.dapp_stake_default {
                GovernanceStatus::Active
            } else {
                GovernanceStatus::Suspended
            };
        }

        /// Configure a dapp (existing or new)
        fn dapp_configure(
            &mut self,
            contract: AccountId,
            payee: DappPayee,
            owner: AccountId,
        ) -> Result<Dapp, Error> {
            self.check_is_contract(contract)?;

            let dapp_lookup = self.dapps.get(contract);
            let new = dapp_lookup.is_none();
            let mut dapp = dapp_lookup.unwrap_or(Dapp {
                owner,
                balance: 0,
                status: GovernanceStatus::Suspended,
                payee,
                min_difficulty: 1,
            });

            // check current contract for ownership
            if !new {
                self.check_dapp_owner_is_caller(contract)?;
            }

            dapp.payee = payee; // update the dapp payee
            dapp.owner = owner; // update the owner

            // owner of the dapp cannot be an operator
            self.check_not_operator(owner)?;

            self.dapp_configure_funding(&mut dapp);

            // if the dapp is new then add it to the list of dapps
            if new {
                lazy_push!(self.dapp_accounts, contract);
            }

            // update the dapp in the mapping
            self.dapps.insert(contract, &dapp);

            Ok(dapp)
        }

        /// Register a dapp
        #[ink(message)]
        pub fn dapp_register(
            &mut self,
            contract: AccountId,
            payee: DappPayee,
        ) -> Result<(), Error> {
            // expect dapp to be new
            self.check_dapp_does_not_exist(contract)?;

            // configure the new dapp
            let dapp = self.dapp_configure(
                contract,
                payee,
                self.env().caller(), // the caller is made the owner of the contract
            )?;

            // emit event
            self.env().emit_event(DappRegister {
                contract,
                owner: dapp.owner,
                value: dapp.balance,
                payee,
                status: dapp.status,
            });

            Ok(())
        }

        /// Update a dapp with new funds, setting status as appropriate
        pub fn dapp_update(
            &mut self,
            contract: AccountId,
            payee: DappPayee,
            owner: AccountId,
        ) -> Result<(), Error> {
            // expect dapp to exist
            self.get_dapp(contract)?;

            // configure the new dapp
            let dapp = self.dapp_configure(contract, payee, owner)?;

            // emit event
            self.env().emit_event(DappUpdate {
                contract,
                owner,
                value: dapp.balance,
                payee,
                status: dapp.status,
            });

            Ok(())
        }

        /// Fund dapp account to pay for services, if the Dapp caller is registered in self.dapps
        #[ink(message)]
        #[ink(payable)]
        pub fn dapp_fund(&mut self, contract: AccountId) -> Result<(), Error> {
            let mut dapp = self.get_dapp(contract)?;

            // configure funds and status of the dapp
            self.dapp_configure_funding(&mut dapp);

            // update the dapp in the mapping
            self.dapps.insert(contract, &dapp);

            Ok(())
        }

        /// Cancel services as a dapp, returning remaining tokens
        #[ink(message)]
        pub fn dapp_cancel(&mut self, contract: AccountId) -> Result<(), Error> {
            let mut dapp = self.get_dapp(contract)?;

            // check current contract for ownership
            self.check_dapp_owner_is_caller(contract)?;

            let balance = dapp.balance;
            if balance > 0 {
                self.env()
                    .transfer(dapp.owner, balance)
                    .map_err(|_| Error::ContractTransferFailed)?;
            }

            dapp.status = GovernanceStatus::Deactivated;
            dapp.balance = 0;
            self.dapps.insert(contract, &dapp);

            self.env().emit_event(DappCancel {
                contract,
                value: balance,
            });

            Ok(())
        }

        fn check_not_operator(&self, operator: AccountId) -> Result<(), Error> {
            if self.operators.get(operator).is_some() {
                return err!(Error::AccountIsOperator);
            }

            Ok(())
        }

        /// Submit a captcha solution commit
        #[ink(message)]
        pub fn dapp_user_commit(
            &mut self,
            contract: AccountId,
            dataset_id: Hash,
            user_merkle_tree_root: Hash,
            provider: AccountId,
            dapp_user: AccountId,
            status_option: Option<CaptchaStatus>,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Guard against dapp submitting a commit on behalf of a user
            if self.dapps.get(caller).is_some() {
                return err!(Error::NotAuthorised);
            }

            // Guard against incorrect data being submitted
            self.get_captcha_data(dataset_id)?;

            // Guard against solution commitment being submitted more than once
            if self
                .captcha_solution_commitments
                .get(user_merkle_tree_root)
                .is_some()
            {
                return err!(Error::CaptchaSolutionCommitmentExists);
            }

            // Guard against inactive dapps and providers
            self.validate_dapp(contract)?;
            self.validate_provider_active(provider)?;

            // Create and insert the commitment
            let commitment = CaptchaSolutionCommitment {
                account: dapp_user,
                dataset_id,
                status: CaptchaStatus::Pending,
                contract,
                provider,
                completed_at: self.env().block_timestamp(),
            };

            self.record_commitment(dapp_user, user_merkle_tree_root, commitment);

            // Insert the commitment and mark as approved or disapproved if a Provider is the caller
            let provider_details = self.get_provider_details(caller);
            if provider_details.ok().is_some() {
                // Provider is not the caller
                if caller != provider {
                    // Provider cannot submit dapp user commits on behalf of another provider
                    ink::env::debug_println!("{}", "NotAuthorised");
                    return err!(Error::NotAuthorised);
                }

                // call provider_approve or provider_disapprove depending on whether the status is Approved or Disapproved
                match status_option.unwrap_or(CaptchaStatus::Pending) {
                    CaptchaStatus::Approved => self.provider_approve(user_merkle_tree_root, 0)?,
                    CaptchaStatus::Disapproved => {
                        self.provider_disapprove(user_merkle_tree_root)?
                    }
                    _ => {}
                }
            }

            self.env().emit_event(DappUserCommit {
                account: caller,
                merkle_tree_root: user_merkle_tree_root,
                contract,
                dataset_id,
            });
            Ok(())
        }

        /// Trim the user history to the max length and age.
        /// Returns the history and expired hashes.
        fn trim_user_history(&self, mut history: Vec<Hash>) -> (Vec<Hash>, Vec<Hash>) {
            // note that the age is based on the block timestamp, so calling this method as blocks roll over will result in different outcomes as the age threshold will change but the history will not (assuming no new results are added)
            let block_timestamp = self.env().block_timestamp();
            let max_age = if block_timestamp < self.max_user_history_age {
                block_timestamp
            } else {
                self.max_user_history_age
            };
            let age_threshold = block_timestamp - max_age;
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
        fn record_commitment(
            &mut self,
            account: AccountId,
            hash: Hash,
            result: CaptchaSolutionCommitment,
        ) {
            let mut user = self
                .dapp_users
                .get(account)
                .unwrap_or_else(|| self.create_new_dapp_user(account));
            // add the new commitment
            self.captcha_solution_commitments.insert(hash, &result);
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
                summary.score =
                    ((summary.correct * 100) / (summary.correct + summary.incorrect)) as u8;
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
            let mut dapp_user_accounts = self.dapp_user_accounts.get_or_default();
            dapp_user_accounts.push(account);
            self.dapp_user_accounts.set(&dapp_user_accounts);
            user
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

            let mut commitment = self
                .captcha_solution_commitments
                .get(captcha_solution_commitment_id)
                .ok_or_else(err_fn!(Error::CaptchaSolutionCommitmentDoesNotExist))?;
            // Guard against incorrect solution id
            if commitment.provider != caller {
                return err!(Error::NotAuthorised);
            }
            self.validate_dapp(commitment.contract)?;

            // only make changes if commitment is Pending approval or disapproval
            if commitment.status == CaptchaStatus::Pending {
                commitment.status = CaptchaStatus::Approved;

                self.record_commitment(
                    commitment.account,
                    captcha_solution_commitment_id,
                    commitment,
                );

                self.pay_fee(&caller, &commitment.contract)?;
                self.refund_transaction_fee(commitment, transaction_fee)?;
                self.env().emit_event(ProviderApprove {
                    captcha_solution_commitment_id,
                });
            } else {
                return err!(Error::CaptchaSolutionCommitmentAlreadyApproved);
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

            let mut commitment = self
                .captcha_solution_commitments
                .get(captcha_solution_commitment_id)
                .ok_or_else(err_fn!(Error::CaptchaSolutionCommitmentDoesNotExist))?;
            // Guard against incorrect solution id
            if commitment.provider != caller {
                return err!(Error::NotAuthorised);
            }
            self.validate_dapp(commitment.contract)?;

            // only make changes if commitment is Pending approval or disapproval
            if commitment.status == CaptchaStatus::Pending {
                commitment.status = CaptchaStatus::Disapproved;

                self.record_commitment(
                    commitment.account,
                    captcha_solution_commitment_id,
                    commitment,
                );

                self.pay_fee(&caller, &commitment.contract)?;
                self.env().emit_event(ProviderDisapprove {
                    captcha_solution_commitment_id,
                });
            } else {
                return err!(Error::CaptchaSolutionCommitmentAlreadyDisapproved);
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

        /// Transfer a refund fee from payer account to user account
        /// Payee == Provider => Dapp pays solve fee and Dapp pays Dapp User tx fee
        /// Payee == Dapp => Provider pays solve fee and Provider pays Dapp Use
        fn refund_transaction_fee(
            &mut self,
            commitment: CaptchaSolutionCommitment,
            amount: Balance,
        ) -> Result<(), Error> {
            if self.env().balance() < amount {
                return err!(Error::ContractInsufficientFunds);
            }

            if amount > 0 {
                let mut provider = self
                    .providers
                    .get(commitment.provider)
                    .ok_or_else(err_fn!(Error::ProviderDoesNotExist))?;
                let mut dapp = self
                    .dapps
                    .get(commitment.contract)
                    .ok_or_else(err_fn!(Error::DappDoesNotExist))?;
                if provider.payee == Payee::Provider {
                    if dapp.balance < amount {
                        return err!(Error::DappInsufficientFunds);
                    }
                    dapp.balance -= amount;
                    self.dapps.insert(commitment.contract, &dapp);
                } else {
                    if provider.balance < amount {
                        return err!(Error::ProviderInsufficientFunds);
                    }
                    provider.balance -= amount;
                    self.providers.insert(commitment.provider, &provider);
                }
                self.env()
                    .transfer(commitment.account, amount)
                    .map_err(|_| Error::ContractTransferFailed)?;
            }

            Ok(())
        }

        /// Checks if the user is a human (true) as they have a solution rate higher than a % threshold or a bot (false)
        /// Threshold is decided by the calling user
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

            Ok(LastCorrectCaptcha {
                before_ms: self.env().block_timestamp()
                    - last_correct_captcha.unwrap().completed_at,
                dapp_id: last_correct_captcha.unwrap().contract,
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
            if provider.balance < self.provider_stake_default {
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
            if dapp.balance <= self.dapp_stake_default {
                return err!(Error::DappInsufficientFunds);
            }
            Ok(dapp)
        }

        /// Get a single captcha dataset
        ///
        /// Returns an error if the dapp does not exist
        #[ink(message)]
        pub fn get_captcha_data(&self, dataset_id: Hash) -> Result<CaptchaData, Error> {
            self.captcha_data
                .get(dataset_id)
                .ok_or_else(err_fn!(Error::CaptchaDataDoesNotExist))
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
        ) -> Result<CaptchaSolutionCommitment, Error> {
            if self
                .captcha_solution_commitments
                .get(captcha_solution_commitment_id)
                .is_none()
            {
                return err!(Error::CaptchaSolutionCommitmentDoesNotExist);
            }
            let commitment = self
                .captcha_solution_commitments
                .get(captcha_solution_commitment_id)
                .ok_or_else(err_fn!(Error::CaptchaSolutionCommitmentDoesNotExist))?;

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

        /// Returns the operator votes for code hashes
        #[ink(message)]
        pub fn get_operator_votes(&self) -> Vec<OperatorVote> {
            let mut votes: Vec<OperatorVote> = Vec::new();
            for account_id in self.operator_accounts.get().unwrap().iter() {
                votes.push(OperatorVote {
                    account_id: *account_id,
                    vote: self.operator_votes.get(*account_id),
                });
            }
            votes
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
            for status in [
                GovernanceStatus::Active,
                GovernanceStatus::Suspended,
                GovernanceStatus::Deactivated,
            ] {
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
            let tmp1: [u8; BLOCK_TIMESTAMP_SIZE + BLOCK_NUMBER_SIZE] =
                crate::concat_u8(&block_number_arr, &block_timestamp_arr);
            let tmp2: [u8; BLOCK_TIMESTAMP_SIZE + BLOCK_NUMBER_SIZE + ACCOUNT_SIZE] =
                crate::concat_u8(&tmp1, user_account_bytes);
            let bytes: [u8; BLOCK_TIMESTAMP_SIZE
                + BLOCK_NUMBER_SIZE
                + ACCOUNT_SIZE
                + ACCOUNT_SIZE] = crate::concat_u8(&tmp2, dapp_account_bytes);
            // hash to ensure small changes (e.g. in the block timestamp) result in large change in the seed
            let mut hash_output = <Blake2x128 as HashOutput>::Type::default();
            <Blake2x128 as CryptoHash>::hash(&bytes, &mut hash_output);
            // the random number can be derived from the hash
            let next = u128::from_le_bytes(hash_output);
            // use modulo to get a number between 0 (inclusive) and len (exclusive)
            // e.g. if len = 10 then range would be 0-9

            next % len
        }

        /// Remove a vote from an operator
        #[ink(message)]
        pub fn operator_unvote(&mut self) -> Result<Option<Vote>, Error> {
            let caller = self.env().caller();

            // check if the caller is an operator
            if self.operators.get(caller).is_none() {
                return err!(Error::NotAuthorised);
            }

            let vote = self.operator_votes.get(caller);

            self.operator_votes.remove(caller);

            Ok(vote)
        }

        fn clear_votes(&mut self) {
            for operator in self.operator_accounts.get().unwrap().iter() {
                self.operator_votes.remove(operator);
            }
        }

        /// Carries out a vote from the set of operators
        #[ink(message)]
        pub fn operator_vote(&mut self, vote: Vote) -> Result<VoteStatus, Error> {
            let caller = self.env().caller();

            // check if the caller is an operator
            if self.operators.get(caller).is_none() {
                return err!(Error::NotAuthorised);
            }

            // save the vote
            self.operator_votes.insert(caller, &vote);

            for operator in self.operator_accounts.get().unwrap().iter() {
                let other_vote_lookup = self.operator_votes.get(operator);
                if other_vote_lookup.is_none() {
                    // not all operators have voted yet, so return pending indicating the vote has not yet passed
                    debug!("Vote pending");
                    return Ok(VoteStatus::Pending);
                }
            }

            // by here all operators have voted, so check if they all voted the same way
            for operator in self.operator_accounts.get().unwrap().iter() {
                let other_vote = self.operator_votes.get(operator).unwrap();
                if other_vote != vote {
                    // votes differ, so return false indicating the vote has not passed
                    // clear votes first to force a re-vote
                    self.clear_votes();
                    debug!("Vote failed: {:?} != {:?}", other_vote, vote);
                    return Ok(VoteStatus::Fail);
                }
            }

            // at this point all operators have voted the same way, so the vote has passed
            // clear the votes as the vote has passed
            // remove the votes
            self.clear_votes();

            debug!("Vote passed: {:?}", vote);

            // implement the voted action
            match vote {
                Vote::Terminate(recipient) => {
                    // terminate the contract and send the remaining balance to the recipient
                    ink::env::terminate_contract::<ink::env::DefaultEnvironment>(recipient);
                    // note that the contract is now terminated, so the remaining code will not be executed
                }
                Vote::Withdraw(recipient, amount) => {
                    let transfer_result =
                        ink::env::transfer::<ink::env::DefaultEnvironment>(recipient, amount);
                    if transfer_result.is_err() {
                        return err!(Error::ContractTransferFailed);
                    }
                }
                Vote::SetCodeHash(code_hash) => {
                    // Set the new code hash after all operators have voted for the same code hash.
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
                }
            }

            // return true indicating the vote has passed
            Ok(VoteStatus::Pass)
        }

        /// Modifies the code which is used to execute calls to this contract address (`AccountId`).
        /// We use this to upgrade the contract logic. The caller must be an operator.
        /// `true` is returned on successful upgrade, `false` otherwise
        /// Errors are returned if the caller is not an operator, if the code hash is the callers
        /// account_id, if the code is not found, and for any other unknown ink errors
        #[ink(message)]
        pub fn operator_set_code(&mut self, code_hash: [u8; 32]) -> Result<bool, Error> {
            let code_hash_account = AccountId::from(code_hash);
            let caller = self.env().caller();

            // check if the caller is an operator
            if self.operators.get(caller).is_none() {
                return err!(Error::NotAuthorised);
            }

            // Check that the caller has not submitted the AccountId of a contract instead of the code hash
            if self.env().is_contract(&code_hash_account) {
                return err!(Error::InvalidCodeHash);
            }

            // Check that caller has not submitted the code hash of the contract itself
            if self.env().own_code_hash().unwrap() == code_hash.into() {
                return err!(Error::InvalidCodeHash);
            }

            // // Insert the operators latest vote into the votes map
            // self.operator_code_hash_votes.insert(caller, &code_hash);

            // // Make sure each operator has voted for the same code hash. If an operator has not voted
            // // an Ok result is returned. If an operator has voted for a conflicting code hash, an error
            // // is returned.
            // for operator in self.operator_accounts.get().unwrap().iter() {
            //     if self.operator_code_hash_votes.get(operator).is_none() {
            //         return Ok(false);
            //     }

            //     let vote = self.operator_code_hash_votes.get(operator).unwrap();
            //     if vote != code_hash {
            //         return Ok(false);
            //     }
            // }

            // // Set the new code hash after all operators have voted for the same code hash.
            // let set_code_hash_result = ink::env::set_code_hash(&code_hash);

            // if let Err(e) = set_code_hash_result {
            //     match e {
            //         ink::env::Error::CodeNotFound => {
            //             return err!(Error::CodeNotFound);
            //         }
            //         _ => {
            //             return err!(Error::Unknown);
            //         }
            //     }
            // }

            // // remove the votes
            // for operator in self.operator_accounts.get().unwrap().iter() {
            //     self.operator_code_hash_votes.remove(operator);
            // }

            Ok(true)
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
        use schnorrkel::{ExpansionMode, Keypair, MiniSecretKey, SecretKey};

        use crate::prosopo::Error::{ProviderInactive, ProviderInsufficientFunds};

        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        type Event = <Prosopo as ::ink::reflect::ContractEventBase>::Type;

        const STAKE_DEFAULT: u128 = 1000000000000;

        /// We test if the default constructor does its job.
        #[ink::test]
        fn test_default_works() {
            let operator_accounts = get_operator_accounts();
            let operator_account = operator_accounts[0];
            let contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            assert!(contract.operators.get(operator_account).is_some());
            assert!(contract
                .operator_accounts
                .get()
                .unwrap()
                .contains(&operator_account));
        }

        /// Assert contract provider minimum stake default set from constructor.
        #[ink::test]
        pub fn test_provider_stake_default() {
            let operator_accounts = get_operator_accounts();
            let contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let provider_stake_default: u128 = contract.get_provider_stake_default();
            assert!(STAKE_DEFAULT.eq(&provider_stake_default));
        }

        /// Assert contract dapp minimum stake default set from constructor.
        #[ink::test]
        pub fn test_dapp_stake_default() {
            let operator_accounts = get_operator_accounts();
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(operator_accounts[0]);
            let contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let dapp_stake_default: u128 = contract.get_dapp_stake_default();
            assert!(STAKE_DEFAULT.eq(&dapp_stake_default));
        }

        /// Test provider register
        #[ink::test]
        fn test_provider_register() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let provider_account = AccountId::from([0x2; 32]);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let service_origin: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            contract.provider_register(service_origin, fee, Payee::Dapp);
            assert!(contract.providers.get(provider_account).is_some());
            assert!(contract
                .provider_accounts
                .get(ProviderState {
                    status: GovernanceStatus::Deactivated,
                    payee: Payee::Dapp
                })
                .unwrap_or_default()
                .contains(&provider_account));
        }

        /// Test provider deregister
        #[ink::test]
        fn test_provider_deregister() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let provider_account = AccountId::from([0x2; 32]);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let service_origin: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            contract.provider_register(service_origin, fee, Payee::Dapp);
            assert!(contract.providers.get(provider_account).is_some());
            contract.provider_deregister(provider_account);
            let provider_record = contract.providers.get(provider_account).unwrap();
            assert!(provider_record.status == GovernanceStatus::Deactivated);
        }

        /// Test list providers
        #[ink::test]
        fn test_list_providers_by_ids() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract.provider_register(service_origin, fee, Payee::Dapp);
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
            let operator_accounts = get_operator_accounts();
            let operator_account = operator_accounts[0];
            let contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            contract.get_random_number(0, operator_account, operator_account);
        }

        // Test get random number
        #[ink::test]
        fn test_get_random_number() {
            let operator_accounts = get_operator_accounts();
            let acc1 = AccountId::from([0x1; 32]);
            let acc2 = AccountId::from([0x2; 32]);
            let contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
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
            let service_origin = port.as_bytes().to_vec();

            (provider_account, service_origin, fee)
        }

        /// Test provider register and update
        #[ink::test]
        fn test_provider_register_and_update() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "2424", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin, fee, Payee::Dapp)
                .unwrap();
            assert!(contract.providers.get(provider_account).is_some());
            assert!(contract
                .provider_accounts
                .get(ProviderState {
                    status: GovernanceStatus::Deactivated,
                    payee: Payee::Dapp
                })
                .unwrap()
                .contains(&provider_account));

            let service_origin: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin.clone(), fee, Payee::Dapp);
            assert!(contract
                .provider_accounts
                .get(ProviderState {
                    status: GovernanceStatus::Deactivated,
                    payee: Payee::Dapp
                })
                .unwrap()
                .contains(&provider_account));
            let provider = contract.providers.get(provider_account).unwrap();
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
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // try creating the second provider and make sure the error is correct and that it doesn't exist
            let (provider_account, _, _) = generate_provider_data(0x3, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            match contract.provider_register(service_origin, fee, Payee::Dapp) {
                Result::Err(Error::ProviderServiceOriginUsed) => {}
                _ => {
                    unreachable!();
                }
            }
            assert!(contract.providers.get(provider_account).is_none());
            assert!(!contract
                .provider_accounts
                .get(ProviderState {
                    status: GovernanceStatus::Deactivated,
                    payee: Payee::Dapp
                })
                .unwrap()
                .contains(&provider_account));
        }

        /// Test provider update with service_origin error
        #[ink::test]
        fn test_provider_update_with_service_origin_error() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin, fee, Payee::Dapp)
                .unwrap();

            let (provider_account, service_origin, fee) = generate_provider_data(0x3, "2424", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin, fee, Payee::Dapp)
                .unwrap();

            let (_, service_origin, fee) = generate_provider_data(0x3, "4242", 100);

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);

            // try updating the second provider and make sure the error is correct and that it didn't change
            match contract.provider_update(service_origin.clone(), fee, Payee::Dapp) {
                Result::Err(Error::ProviderServiceOriginUsed) => {}
                _ => {
                    unreachable!();
                }
            }

            let provider = contract.providers.get(provider_account).unwrap();
            assert_ne!(provider.service_origin, service_origin);
            assert_ne!(provider.fee, fee);
            assert_ne!(provider.balance, balance);
            assert_ne!(provider.status, GovernanceStatus::Active);
        }

        /// Test provider unstake
        #[ink::test]
        fn test_provider_unstake() {
            let operator_accounts = get_operator_accounts();
            let operator_account = operator_accounts[0];
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 10;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .ok();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
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
            let operator_accounts = get_operator_accounts();
            let operator_account = operator_accounts[0];
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .ok();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                provider_account,
                balance,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
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
            let operator_accounts = get_operator_accounts();
            let operator_account = operator_accounts[0];
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            let balance: u128 = 10;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin, fee, Payee::Dapp)
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
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
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
            assert_eq!(dapp.status, GovernanceStatus::Suspended);
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
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract = AccountId::from([0x3; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the call
            let balance = STAKE_DEFAULT;
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
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            let data = "hello";
            let mut data_hash = [0u8; 16];
            Blake2x128::hash(data.as_bytes(), &mut data_hash);
            println!("data_hash: {:?}", data_hash);
            let data_hex = hex::encode(data_hash);
            println!("data_hex: {:?}", data_hex);
            // hex of prefix + hex of message hash + hex of suffix make the payload
            let payload = "<Bytes>0x".to_string() + &data_hex + &"</Bytes>".to_string();
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
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ];
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

            // verify the signature
            let valid = contract
                .verify_sr25519(signature_bytes, payload_bytes)
                .unwrap();
            assert!(valid);
        }

        #[ink::test]
        fn test_verify_sr25519_invalid_signature() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            let data = "hello";
            let mut data_hash = [0u8; 16];
            Blake2x128::hash(data.as_bytes(), &mut data_hash);
            println!("data_hash: {:?}", data_hash);
            let data_hex = hex::encode(data_hash);
            println!("data_hex: {:?}", data_hex);
            // hex of prefix + hex of message hash + hex of suffix make the payload
            let payload = "<Bytes>0x".to_string() + &data_hex + &"</Bytes>".to_string();
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
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ];
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

            // verify the signature
            let valid = contract
                .verify_sr25519(signature_bytes, payload_bytes)
                .unwrap();
            assert!(!valid);
        }

        #[ink::test]
        fn test_verify_sr25519_invalid_public_key() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            let data = "hello";
            let mut data_hash = [0u8; 16];
            Blake2x128::hash(data.as_bytes(), &mut data_hash);
            println!("data_hash: {:?}", data_hash);
            let data_hex = hex::encode(data_hash);
            println!("data_hex: {:?}", data_hex);
            // hex of prefix + hex of message hash + hex of suffix make the payload
            let payload = "<Bytes>0x".to_string() + &data_hex + &"</Bytes>".to_string();
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
                213, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ];
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

            // verify the signature
            let valid = contract
                .verify_sr25519(signature_bytes, payload_bytes)
                .unwrap_err();
            assert_eq!(Error::InvalidPublicKey, valid);
        }

        #[ink::test]
        fn test_verify_sr25519_invalid_data() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            let data = "hello2";
            let mut data_hash = [0u8; 16];
            Blake2x128::hash(data.as_bytes(), &mut data_hash);
            println!("data_hash: {:?}", data_hash);
            let data_hex = hex::encode(data_hash);
            println!("data_hex: {:?}", data_hex);
            // hex of prefix + hex of message hash + hex of suffix make the payload
            let payload = "<Bytes>0x".to_string() + &data_hex + &"</Bytes>".to_string();
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
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ];
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

            // verify the signature
            let valid = contract
                .verify_sr25519(signature_bytes, payload_bytes)
                .unwrap();
            assert!(!valid);
        }

        #[ink::test]
        fn test_verify_sr25519_invalid_payload() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            let data = "hello";
            let mut data_hash = [0u8; 16];
            Blake2x128::hash(data.as_bytes(), &mut data_hash);
            println!("data_hash: {:?}", data_hash);
            let data_hex = hex::encode(data_hash);
            println!("data_hex: {:?}", data_hex);
            // hex of prefix + hex of message hash + hex of suffix make the payload
            let payload = "<Aytes>0x".to_string() + &data_hex + &"</Bytes>".to_string();
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
                212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
                133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
            ];
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(AccountId::from(ALICE));

            // verify the signature
            let valid = contract
                .verify_sr25519(signature_bytes, payload_bytes)
                .unwrap();
            assert!(!valid);
        }

        /// Test dapp register and then update
        #[ink::test]
        fn test_dapp_register_and_update() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let caller = AccountId::from([0x2; 32]);
            let dapp_contract_account = AccountId::from([0x3; 32]);

            // Call from the dapp account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);

            // Transfer tokens with the call
            let balance_1 = STAKE_DEFAULT;
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
            let balance_2 = STAKE_DEFAULT;
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
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
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
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
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

            // Transfer tokens with the fund call
            contract.dapp_cancel(contract_account).ok();

            // check the funds are returned and the dapp's status is Deactivated
            let dapp = contract.dapps.get(contract_account).unwrap();
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
            let operator_accounts = get_operator_accounts();

            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            // Register the provider
            let provider_account = AccountId::from([0x2; 32]);

            let service_origin: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .ok();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

            // Register the dapp
            let dapp_user_account = AccountId::from([0x3; 32]);
            let dapp_contract_account = AccountId::from([0x4; 32]);
            // Mark the the dapp account as being a contract on-chain
            ink::env::test::set_contract::<ink::env::DefaultEnvironment>(dapp_contract_account);

            // Call from the dapp contract account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_contract_account);
            // Give the dap a balance
            let balance = 2000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.dapp_register(dapp_contract_account, DappPayee::Dapp);

            // Call from the dapp user account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);
            //Dapp User commit
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root,
                    provider_account,
                    dapp_user_account,
                    None,
                )
                .ok();

            // check that the data is in the captcha_solution_commitments hashmap
            assert!(contract
                .captcha_solution_commitments
                .get(user_root)
                .is_some());
        }

        /// Test provider approve
        #[ink::test]
        fn test_provider_approve() {
            let operator_accounts = get_operator_accounts();

            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);

            let provider = contract.providers.get(provider_account).unwrap();
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

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
            contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root,
                    provider_account,
                    dapp_user_account,
                    None,
                )
                .ok();

            // Call from the provider account to mark the solution as approved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_approve(solution_id, 0);
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
            contract.provider_disapprove(solution_id);
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
            let operator_accounts = get_operator_accounts();

            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

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
            contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root,
                    provider_account,
                    dapp_user_account,
                    None,
                )
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
            let operator_accounts = get_operator_accounts();

            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

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
            contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root,
                    provider_account,
                    dapp_user_account,
                    None,
                )
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_disapprove(solution_id);
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
            contract.provider_approve(solution_id, 0);
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
            let operator_accounts = get_operator_accounts();

            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2);

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
            // Call from the Dapp User Account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(dapp_user_account);
            let user_root = str_to_hash("user merkle tree root".to_string());
            contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root,
                    provider_account,
                    dapp_user_account,
                    None,
                )
                .ok();

            // Call from the provider account to mark the solution as disapproved
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let solution_id = user_root;
            contract.provider_disapprove(solution_id);
            let commitment = contract
                .captcha_solution_commitments
                .get(solution_id)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);

            // Now make sure that the dapp user does not pass the human test
            let result = contract.dapp_operator_is_human_user(dapp_user_account, 80);
            assert!(!result.unwrap());
        }

        /// Test non-existent dapp account has zero balance
        #[ink::test]
        fn test_non_existent_dapp_account_has_zero_balance() {
            let operator_accounts = get_operator_accounts();
            let dapp_account = AccountId::from([0x2; 32]);
            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            contract.get_dapp_balance(dapp_account).unwrap_err();
        }

        /// Test non-existent provider account has zero balance
        #[ink::test]
        fn test_non_existent_provider_account_has_zero_balance() {
            let operator_accounts = get_operator_accounts();
            let provider_account = AccountId::from([0x2; 32]);
            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts.clone(),
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            contract.get_provider_balance(provider_account).unwrap_err();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            contract.get_provider_balance(provider_account).unwrap_err();
        }

        // // Test get random provider
        #[ink::test]
        fn test_get_random_active_provider() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let provider_account = AccountId::from([0x2; 32]);
            let service_origin: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract.provider_register(service_origin.clone(), fee, Payee::Dapp);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Dapp);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            contract.provider_add_dataset(root1, root2);
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
            assert!(selected_provider.unwrap().provider == registered_provider_account.unwrap());
        }

        // // Test get random provider
        #[ink::test]
        fn test_get_random_active_provider_dapp_any() {
            let operator_accounts = get_operator_accounts();
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            let provider_account = AccountId::from([0x2; 32]);
            let dapp_user_account = AccountId::from([0x30; 32]);
            let service_origin: Vec<u8> = vec![1, 2, 3];
            let fee: u32 = 100;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract.provider_register(service_origin.clone(), fee, Payee::Provider);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let balance = 20000000000000;
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin.clone(), fee, Payee::Provider);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            contract.provider_add_dataset(root1, root2);

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
            contract.provider_update(service_origin, fee, Payee::Dapp);

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
            let operator_accounts = get_operator_accounts();

            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

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
            contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root1,
                    provider_account,
                    dapp_user_account,
                    Some(CaptchaStatus::Approved),
                )
                .ok();

            // Get the commitment and make sure it is approved
            let commitment = contract
                .get_captcha_solution_commitment(user_root1)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Approved);

            //Dapp User commit and disapprove
            let dapp_user_account = AccountId::from([0x5; 32]);
            let user_root2 = str_to_hash("user merkle tree root to disapprove".to_string());
            contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root2,
                    provider_account,
                    dapp_user_account,
                    Some(CaptchaStatus::Disapproved),
                )
                .ok();

            // Get the commitment and make sure it is disapproved
            let commitment = contract
                .get_captcha_solution_commitment(user_root2)
                .unwrap();
            assert_eq!(commitment.status, CaptchaStatus::Disapproved);
        }

        /// Test provider cannot supply a dapp user commit for a different Provider
        #[ink::test]
        fn test_provider_cannot_supply_commit_for_a_different_provider() {
            let operator_accounts = get_operator_accounts();

            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );

            // Register the provider
            let (provider_account, service_origin, fee) = generate_provider_data(0x2, "4242", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account);
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

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
            let (provider_account2, service_origin, fee) = generate_provider_data(0x5, "2424", 0);
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(provider_account2);
            contract
                .provider_register(service_origin.clone(), fee, Payee::Dapp)
                .unwrap();

            // Call from the provider account to add data and stake tokens
            let balance = 2000000000000;
            let root1 = str_to_hash("merkle tree1".to_string());
            let root2 = str_to_hash("merkle tree2".to_string());
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(balance);
            contract.provider_update(service_origin, fee, Payee::Provider);
            // can only add data set after staking
            contract.provider_add_dataset(root1, root2).ok();

            // Call from dapp_user_commit from provider_account2 to supply a commit for provider_account
            // Should not be authorised
            let dapp_user_account = AccountId::from([0x6; 32]);
            let user_root = str_to_hash("user merkle tree root".to_string());
            let dapp_user_commit_result = contract
                .dapp_user_commit(
                    dapp_contract_account,
                    root1,
                    user_root,
                    provider_account,
                    dapp_user_account,
                    Some(CaptchaStatus::Approved),
                )
                .err();
            assert_eq!(Error::NotAuthorised, dapp_user_commit_result.unwrap());
        }

        /// Test provider cannot supply a dapp user commit for a different Provider. We can't test
        /// this properly as `own_code_hash` is not available in the test environment. This causes
        /// the function to panic for all of the tests after `assert_eq!(Error::InvalidCodeHash, op1result.unwrap_err());`
        #[ink::test]
        #[should_panic(
            expected = "not implemented: off-chain environment does not support `own_code_hash`"
        )]
        fn test_operator_upgrade_code_hash() {
            let operator_accounts = get_operator_accounts();
            let operator1 = operator_accounts[0];
            let operator2 = operator_accounts[1];
            // initialise the contract
            let mut contract = Prosopo::default(
                operator_accounts,
                STAKE_DEFAULT,
                STAKE_DEFAULT,
                10,
                1000000,
                1000,
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(operator1);
            let op1result = contract.operator_set_code([0x01; 32]); // this is the operators AccountId, not a valid contract
            assert_eq!(Error::InvalidCodeHash, op1result.unwrap_err());
            let op1result = contract.operator_set_code([0x20; 32]);
            assert!(!op1result.unwrap());
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(operator2);
            let op2result = contract.operator_set_code([0x30; 32]);
            assert!(!op2result.unwrap());
            let op2result = contract.operator_set_code([0x20; 32]);
            // following panics due to set code hash not being available to off-chain environment
            op2result.unwrap();
        }

        /// Get some operator accounts as a vector
        fn get_operator_accounts() -> Vec<AccountId> {
            let operator_account1 = AccountId::from([0x1; 32]);
            let operator_account2 = AccountId::from([0x10; 32]);
            let mut operator_accounts = vec![operator_account1, operator_account2];
            operator_accounts
        }

        fn setup_contract() -> (AccountId, AccountId, Vec<AccountId>, Prosopo) {
            let op1 = AccountId::from([0x1; 32]);
            let op2 = AccountId::from([0x2; 32]);
            let ops = vec![op1, op2];
            // initialise the contract
            let contract =
                Prosopo::default(ops.clone(), STAKE_DEFAULT, STAKE_DEFAULT, 10, 1000000, 1000);
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
