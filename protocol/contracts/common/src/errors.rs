use core::marker::PhantomData;

/// The errors that can be returned by contracts. This is generic so it can be adjusted to any environment which the contract is being run on.
#[derive(PartialEq, Debug, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(
    any(feature = "std", feature = "ink-as-dependency"),
    derive(scale_info::TypeInfo)
)]
pub enum ContractError<Env: ink::env::Environment> {
    _PhantomVariant(PhantomData<Env>), // this is a placeholder to allow the enum to be generic, do not use! This can be removed when at least 1 of the error variants use the env type
    AccountIdDecodeFailed, // returned if the account id decode fails, e.g. due to array of wrong length
    NotAuthorised,
    TransferFailed,
    SetCodeHashFailed,
    InvalidDestination,
    UnknownMessage,
    /// Returned if provider account exists when it shouldn't
    ProviderAccountExists,
    /// Returned if provider exists when it shouldn't
    ProviderExists,
    /// Returned if provider account does not exists when it shouldn't
    ProviderAccountDoesNotExist,
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
    /// Returned if the caller is not the author
    NotAuthor,
}
