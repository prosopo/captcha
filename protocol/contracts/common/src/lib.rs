#![cfg_attr(not(feature = "std"), no_std)]

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
