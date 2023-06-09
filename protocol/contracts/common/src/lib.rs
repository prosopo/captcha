#![cfg_attr(not(feature = "std"), no_std)]

pub use self::common::{Common, CommonRef};

pub const INSTANTIATOR: [u8; 32] = [
    212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133, 88, 133,
    76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
]; // the account which can instantiate the contract

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

/// An ink contract must be defined in order to import functions into another contract
#[ink::contract]
pub mod common {

    /// No fields are stored in the util contract as it's just filler
    #[ink(storage)]
    pub struct Common {}

    /// Implementation of the contract
    impl Common {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {}
        }

        /// Print and get the caller of this function
        /// This will print and get the caller's account in byte format, e.g. [1,2,3...32]
        #[ink(message)]
        pub fn get_caller(&self) -> AccountId {
            ink::env::debug_println!("caller: {:?}", self.env().caller());
            self.env().caller()
        }
    }
}
