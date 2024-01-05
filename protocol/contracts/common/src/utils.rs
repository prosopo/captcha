use crate::Error;
use core::marker::PhantomData;
use scale_info::prelude::vec::Vec;

/// Print and return an error in ink
#[macro_export]
macro_rules! err {
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
        Err($err)
    }};
}

#[macro_export]
macro_rules! err_fn {
    ($self_:ident, $err:expr) => {
        || {
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
        }
    };
}

#[macro_export]
macro_rules! lazy {
    ($lazy:expr, $func:ident, $value:expr) => {
        let mut contents = $lazy.get_or_default();
        contents.$func($value);
        $lazy.set(&contents);
    };
}

/// Convert a byte array to payload. This wraps the '<Bytes>' tag around the byte array to conform with signing convention.
pub fn to_payload(message: &Vec<u8>) -> Vec<u8> {
    // if payload is already wrapped in <Bytes> tag, return it
    if message.starts_with(b"<Bytes>") && message.ends_with(b"</Bytes>") {
        return message.clone();
    }
    [b"<Bytes>", message.as_slice(), b"</Bytes>"].concat()
}

/// EnvUtils contains several util fns which need the environment to be defined.
pub trait Utils<Env: ink::env::Environment> {
    /// get the account id in byte array format
    fn account_id_bytes(account: &Env::AccountId) -> [u8; 32] {
        let bytes = account.as_ref();
        // this will panic if account is not 32 bytes long, which may be the case in non-standard environments.
        // Note: this is a weird issue with ink, accounts are used as 32-byte arrays in some places but the environment can set their length to something else, rendering the two incompatible.
        bytes.try_into().expect("account length to be 32-bytes")
    }

    /// Sr25519 verify a message, converting message to payload before verifying
    fn sr25519_verify(
        signature: &[u8; 64],
        message: &Vec<u8>,
        account: &Env::AccountId,
    ) -> Result<(), Error<Env>> {
        let public_key = Self::account_id_bytes(account);
        ink::env::sr25519_verify(signature, to_payload(message).as_slice(), &public_key).map_err(
            |_| Error::InvalidSignature {
                public_key: public_key.to_vec(),
                message: message.clone(),
                signature: signature.to_vec(),
            },
        )
    }
}

/// DefaultEnvUtils implements EnvUtils for the default environment
pub enum DefaultUtils<Env: ink::env::Environment> {
    _Marker(PhantomData<Env>), // marker to use generic parameter
}

impl<Env: ink::env::Environment> Utils<Env> for DefaultUtils<Env> {}

#[cfg(test)]
mod tests {
    use crate::Account;

    use super::Utils as UtilsTrait;
    use crate::to_payload;
    type Env = ink::env::DefaultEnvironment;
    type Utils = super::DefaultUtils<Env>;
    use ink::primitives::AccountId;
    use scale_info::TypeInfo;

    #[test]
    fn test_sr25519_verify() {
        let message = vec![1, 2, 3];
        let account = Account::nth(0);
        let signature = account.sr25519_sign(&message);
        Utils::sr25519_verify(&signature, &message, &account.account_id()).unwrap();
    }

    #[test]
    fn test_sr25519_verify_incorrect_payload() {
        let mut message = vec![1, 2, 3];
        let account = Account::nth(0);
        let signature = account.sr25519_sign(&message);
        let len = message.len();
        // deliberately change the last byte of the payload
        message[len - 1] = message[len - 1] + 1;
        Utils::sr25519_verify(&signature, &message, &account.account_id())
            .expect_err("should fail to verify due to incorrect payload");
    }

    #[test]
    fn test_sr25519_verify_incorrect_signature() {
        let message = vec![1, 2, 3];
        let account = Account::nth(0);
        let mut signature = account.sr25519_sign(&message);
        // deliberately change the last byte of the signature
        signature[63] = signature[63] + 1;
        Utils::sr25519_verify(&signature, &message, &account.account_id())
            .expect_err("should fail to verify due to incorrect signature");
    }

    #[test]
    fn test_sr25519_verify_incorrect_public_key() {
        let message = vec![1, 2, 3];
        let account = Account::nth(0);
        let account_id = account.account_id();
        let mut pub_key: [u8; 32] = Utils::account_id_bytes(&account_id);
        // deliberately change the last byte of the public key
        pub_key[31] = pub_key[31] + 1;
        let signature = account.sr25519_sign(&message);
        Utils::sr25519_verify(&signature, &message, &AccountId::from(pub_key))
            .expect_err("should fail to verify due to incorrect public key");
    }

    #[test]
    fn test_to_payload() {
        let message = vec![1, 2, 3];
        let payload = to_payload(&message);
        assert_eq!(
            payload,
            vec![
                b'<', b'B', b'y', b't', b'e', b's', b'>', 1, 2, 3, b'<', b'/', b'B', b'y', b't',
                b'e', b's', b'>'
            ]
        );
        // check a subsequent call returns the same result, i.e. doesn't wrap the payload again
        let payload2 = to_payload(&payload);
        assert_eq!(payload, payload2);
    }

    #[test]
    fn test_account_id_bytes() {
        let account = ink::primitives::AccountId::from([1u8; 32]);
        let bytes = Utils::account_id_bytes(&account);
        assert_eq!(bytes, [1u8; 32]);
    }

    /// A dummy env with long account ids
    #[derive(Debug, Clone, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(TypeInfo))]
    pub enum LongAccountEnvironment {}

    impl ink::env::Environment for LongAccountEnvironment {
        const MAX_EVENT_TOPICS: usize = 4;

        type AccountId = [u8; 64];
        type Balance = u128;
        type Hash = [u8; 32];
        type Timestamp = u128;
        type BlockNumber = u128;
        type ChainExtension = ink::env::NoChainExtension;
    }
    type LongAccountEnvironmentUtils = super::DefaultUtils<LongAccountEnvironment>;

    #[test]
    #[should_panic(expected = "account length to be 32-bytes")]
    fn test_account_id_bytes_long() {
        let account = [1u8; 64];
        // should panic, account is not 32bytes long
        LongAccountEnvironmentUtils::account_id_bytes(&account);
    }

    /// A dummy env with short account ids
    #[derive(Debug, Clone, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(TypeInfo))]
    pub enum ShortAccountEnvironment {}

    impl ink::env::Environment for ShortAccountEnvironment {
        const MAX_EVENT_TOPICS: usize = 4;

        type AccountId = [u8; 0];
        type Balance = u128;
        type Hash = [u8; 32];
        type Timestamp = u128;
        type BlockNumber = u128;
        type ChainExtension = ink::env::NoChainExtension;
    }
    type ShortAccountEnvironmentUtils = super::DefaultUtils<ShortAccountEnvironment>;

    #[test]
    #[should_panic(expected = "account length to be 32-bytes")]
    fn test_account_id_bytes_short() {
        let account = [1u8; 0];
        // should panic, account is not 32bytes long
        ShortAccountEnvironmentUtils::account_id_bytes(&account);
    }
}
