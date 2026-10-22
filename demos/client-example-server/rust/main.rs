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

//! `client-example-server` (app.ts run as the entrypoint): exits 1 when the server cannot start.

use prosopo_client_example_server::app::main_with;
use prosopo_load_balancer::EnvLookup;
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use std::process::ExitCode;
use std::sync::Arc;

#[tokio::main]
async fn main() -> ExitCode {
    let logger: Logger = get_logger(LogLevel::Info, "client-example-server:app");
    let env: EnvLookup = Arc::new(|name: &str| std::env::var(name).ok());
    match main_with(&env).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            logger.error(|| LogRecord::default().with_err(error));
            ExitCode::FAILURE
        }
    }
}
