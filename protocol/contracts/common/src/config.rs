use super::errors::Error;
use scale::Decode;

// Trait implementing config functions for contracts
pub trait Config<Env: ink::env::Environment> {
    fn check_is_admin(
        account: <Env as ink::env::Environment>::AccountId,
    ) -> Result<(), Error<Env>> {
        if account != Self::get_admin()? {
            return Err(Error::NotAuthorised);
        }
        Ok(())
    }

    /// Get the git commit id from when this contract was built
    fn get_git_commit_id() -> [u8; 20] {
        let env_git_commit_id: [u8; 20] = [
            140, 181, 84, 101, 1, 92, 209, 139, 64, 142, 94, 248, 85, 148, 53, 25, 237, 19, 80, 147,
        ];
        env_git_commit_id
    }

    /// the admin which can control this contract. set to author/instantiator by default
    fn get_admin() -> Result<<Env as ink::env::Environment>::AccountId, Error<Env>> {
        let env_admin_bytes: [u8; 32] = [
            212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133,
            88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
        ];
        let encoded = scale::Encode::encode(&env_admin_bytes);
        <Env as ink::env::Environment>::AccountId::decode(&mut &encoded[..]).map_err(|_| {
            Error::AccountIdDecodeFailed {
                account_id_bytes: encoded,
            }
        })
    }
}
