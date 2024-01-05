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

#[cfg(any(feature = "test-dependency", test))]
mod account;
#[cfg(any(feature = "test-dependency", test))]
pub use account::{Account, Pair};

#[cfg(any(feature = "test-dependency", test))]
pub mod account_utils;

#[cfg(any(feature = "test-dependency", test))]
pub mod contract_utils;

#[cfg(any(feature = "test-dependency", test))]
pub mod test_utils;
#[cfg(any(feature = "test-dependency", test))]
pub use test_utils::*;

mod errors;
pub use errors::Error;

mod config;
pub use config::*;

mod utils;
pub use utils::*;

mod contract;
pub use contract::*;
