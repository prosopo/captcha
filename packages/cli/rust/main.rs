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

//! `prosopo-provider [--api] [--adminApi] [command]` (cli.ts, argv.ts, reloader.ts).

use clap::Parser;
use prosopo_cli::{get_config, start, Environment};
use prosopo_env::{Environment as ProviderEnvironmentBase, ProviderEnvironment};
use prosopo_keyring::{get_pair, KeyringPair, Secret};
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use prosopo_types::config::{AccountConfig, ProsopoConfig};
use prosopo_util_crypto::U8aLike;
use serde_json::json;
use std::process::ExitCode;

/// The commands of argv.ts, which this binary does not run yet.
const COMMANDS: [&str; 9] = [
    "ensure_indexes",
    "ensure_external_indexes",
    "migrate_abuser_score_threshold",
    "provider_set_data_set",
    "store_captchas",
    "update_spam_email_domains",
    "site_key_register",
    "site_key_register_api",
    "version",
];

#[derive(Parser, Debug)]
#[command(name = "prosopo-provider", about = "CLI for Prosopo Provider", override_usage = "prosopo-provider [global options] <command> [options]")]
struct Cli {
    /// Start the provider API.
    #[arg(long, num_args = 0..=1, default_value_t = false, default_missing_value = "true")]
    api: bool,
    /// Accepted for compatibility; the API does not use it.
    #[arg(long = "adminApi", visible_alias = "admin-api", num_args = 0..=1, default_value_t = false, default_missing_value = "true")]
    admin_api: bool,
    /// A command, and its arguments.
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
    rest: Vec<String>,
}

fn pair(account: &AccountConfig) -> Result<KeyringPair, String> {
    let secret: Option<Secret<'_>> = account.secret.as_deref().map(Secret::Text);
    let address: Option<U8aLike<'_>> = account.address.as_deref().map(U8aLike::Str);
    get_pair(secret, address, None, None).map_err(|error| error.to_string())
}

async fn run(log: &Logger) -> Result<(), String> {
    let load = || prosopo_dotenv::load_env(None, None, None, None, false).map_err(|error| error.to_string());
    load()?;
    let config: ProsopoConfig = get_config(&Environment::from_process(), None, None, None, None).map_err(|error| error.to_string())?;
    let provider_pair: KeyringPair = pair(&config.account)?;
    let auth_account: KeyringPair = pair(&config.auth_account)?;
    log.info(|| LogRecord::default().with_data(json!({ "pairAddress": provider_pair.address().ok() })));
    let cli: Cli = Cli::try_parse().map_err(|error| error.to_string())?;
    log.info(|| {
        LogRecord::default().with_data(json!({ "cliArgs": { "_": cli.rest, "api": cli.api, "adminApi": cli.admin_api, "admin-api": cli.admin_api } }))
    });
    if let Some(command) = cli.rest.first().filter(|command| COMMANDS.contains(&command.as_str())) {
        return Err(format!("the {command} command is not in the Rust provider yet; run it with the Node CLI"));
    }
    if !cli.api {
        return Ok(());
    }
    log.info(|| LogRecord::msg("Starting API"));
    load()?;
    let env: ProviderEnvironment =
        ProviderEnvironment(ProviderEnvironmentBase::new(config, Some(provider_pair), Some(auth_account)).map_err(|error| error.to_string())?);
    start(env, None).await
}

#[tokio::main]
async fn main() -> ExitCode {
    let log: Logger = get_logger(LogLevel::Info, "cli");
    match run(&log).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            log.error(|| LogRecord::default().with_err(error));
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Cli;
    use clap::Parser;

    fn parse(args: &[&str]) -> Cli {
        Cli::try_parse_from([&["prosopo-provider"], args].concat()).expect("parses")
    }

    #[test]
    fn reads_the_flags_as_yargs_does() {
        assert!(!parse(&[]).api);
        assert!(parse(&["--api"]).api);
        assert!(parse(&["--api=true"]).api);
        assert!(!parse(&["--api=false"]).api);
        assert!(parse(&["--api", "--adminApi"]).admin_api);
        assert!(parse(&["--admin-api"]).admin_api);
        assert_eq!(parse(&["ensure_indexes", "--foo"]).rest, vec!["ensure_indexes", "--foo"]);
    }
}
