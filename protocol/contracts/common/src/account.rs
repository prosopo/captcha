use super::test_helper::TestHelper;
use ink::prelude::string::ToString;
use ink::primitives::*;
use scale::alloc::string::String;
use sp_core::crypto::Pair;
use sp_core::crypto::DEV_PHRASE;
use sp_core::sr25519;

pub struct Account {
    pair: sr25519::Pair,
    seed: String,
    role: String,
}

impl Account {
    /// Create the nth account with the given role
    /// The role is embedded in the seed to ensure the same nth account is unique for each role. E.g. the 1st account with role1 is different to the 1st account with role2, etc.
    pub fn nth_role(n: u128, role: &str) -> Self {
        // use the dev seed to generate a key pair for the nth account
        let mut result = Self::new(
            &[
                DEV_PHRASE.to_string(),
                "//".to_string(),
                role.to_string(),
                n.to_string(),
            ]
            .join(""),
        );
        result.role = role.to_string();
        result
    }

    /// Create an account with the given seed
    pub fn new(seed: &String) -> Self {
        let result = Self {
            pair: sr25519::Pair::from_string(seed, None).expect("Generates key pair"),
            seed: seed.to_string(),
            role: "".to_string(),
        };
        // set the account balance to 0
        result.fund(0);
        result
    }

    /// Create the nth account with no role (role set to "")
    pub fn nth(n: u128) -> Self {
        Self::nth_role(n, "")
    }

    pub fn pair(&self) -> &sr25519::Pair {
        &self.pair
    }

    pub fn account_id(&self) -> AccountId {
        let public = self.pair().public();
        let bytes = public.as_array_ref();
        AccountId::from(*bytes)
    }

    pub fn seed(&self) -> &String {
        &self.seed
    }

    pub fn balance(&self) -> u128 {
        TestHelper::get_account_balance(self.account_id()).unwrap()
    }

    pub fn fund(&self, value: u128) {
        TestHelper::set_account_balance(self.account_id(), value);
    }

    pub fn role(&self) -> &String {
        &self.role
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[ink::test]
    fn test_nth_account_unique_with_roles() {
        let mut account_ids: Vec<AccountId> = Vec::new();
        let mut seeds: Vec<String> = Vec::new();
        for role in ["", "role1", "role2"].iter() {
            for i in 0..10 {
                let account = Account::nth_role(i, role);
                let account_id = account.account_id();
                let seed = account.seed().clone();
                assert!(!account_ids.contains(&account_id));
                assert!(!seeds.contains(&seed));
                account_ids.push(account_id);
                seeds.push(seed);
                assert_eq!(account.role(), role);
            }
        }
    }

    #[ink::test]
    fn test_account_balance_zero_on_creation() {
        let account = Account::nth(0);
        assert_eq!(account.balance(), 0);
    }
}
