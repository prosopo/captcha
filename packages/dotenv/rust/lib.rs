// Copyright 2021-2026 Prosopo (UK) Ltd.
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

//! Rust port of `@prosopo/dotenv`: finds the `.env.<NODE_ENV>` file by walking up from a
//! directory, and parses it exactly as the `dotenv` 16.4.5 npm package does.

mod env;
mod node_path;
mod parse;

pub use env::{
    apply_env, get_env, get_env_file, load_env, node_error_code, populate, sanitise_node_env,
    DotenvError, EnvContext, EnvFs, LoadedEnv, RealFs, DEFAULT_FILEPATH,
};
pub use parse::{parse, DotenvParsed};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;
