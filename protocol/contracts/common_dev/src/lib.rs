// Copyright 2021-2023 Prosopo (UK) Ltd.
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
#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub use self::common_dev::{CommonDev, CommonDevRef};

/// An ink contract must be defined in order to import functions into another contract
#[ink::contract]
pub mod common_dev {

    /// No fields are stored in the util contract as it's just filler
    #[ink(storage)]
    pub struct CommonDev {}

    /// Implementation of the contract
    impl CommonDev {
        #[ink(constructor)]
        pub fn noop_ctor() -> Self {
            Self {}
        }

        /// No-op function to fill the mandatory ink message requirement
        #[ink(message)]
        pub fn noop_func(&self) {}
    }

}
