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

//! The CLI's commands (argv.ts, commands/*.ts): their command lines read as the yargs set-up
//! reads them, its checks (demanded arguments, positional count, choices) and the site-key
//! middleware in its order, each handler's own argument parsing, and the handlers.

use crate::start::version;
use prosopo_api::{ClientOptions, ProviderApi};
use prosopo_api_route::schema::{array, coerce_number, number, object, string, Schema};
use prosopo_api_route::ValidationError;
use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_database::captcha::CaptchaDatabase;
use prosopo_database::clients::ClientRecord;
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::{MongoConnectionTimeouts, MongoDatabase};
use prosopo_env::ProviderEnvironment;
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use prosopo_provider::ip_validation::encode_string_address;
use prosopo_provider::tasks::schedulers::{store_commitments_external, update_spam_email_domains};
use prosopo_types::captcha_type::selectable_captcha_type_schema;
use prosopo_types::client::Tier;
use prosopo_types::settings::{
    frictionless_types_default, FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT, ICON_ORDER_TOLERANCE_DEFAULT, IMAGE_MAX_ROUNDS_DEFAULT, IMAGE_MIN_ROUNDS_DEFAULT,
    PUZZLE_MAX_DIFFICULTY_DEFAULT, PUZZLE_TOLERANCE_DEFAULT,
};
use serde_json::{json, Map, Value};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Kind {
    Boolean,
    String,
    Number,
    Array,
}

/// An option a command declares, and the type yargs reads it as.
fn option_kind(command: &str, name: &str) -> Option<Kind> {
    let registration: bool = matches!(command, "site_key_register" | "site_key_register_api");
    match name {
        "api" | "adminApi" => Some(Kind::Boolean),
        "dryRun" if command == "migrate_abuser_score_threshold" => Some(Kind::Boolean),
        "file" if command == "provider_set_data_set" => Some(Kind::String),
        "url" if command == "site_key_register_api" => Some(Kind::String),
        "tier" | "captcha_type" if registration => Some(Kind::String),
        "domains" if registration => Some(Kind::Array),
        "frictionless_threshold" | "frictionless_image_threshold" | "pow_difficulty" | "image_threshold" | "image_max_rounds" | "image_min_rounds"
            if registration =>
        {
            Some(Kind::Number)
        }
        _ => None,
    }
}

/// yargs' camel-case expansion of a hyphenated name.
fn camel(name: &str) -> String {
    let mut out: String = String::new();
    let mut upper: bool = false;
    for c in name.chars() {
        if c == '-' {
            upper = true;
        } else if upper {
            out.extend(c.to_uppercase());
            upper = false;
        } else {
            out.push(c);
        }
    }
    out
}

/// `Number(text)` for a command-line value.
fn js_number(text: &str) -> f64 {
    prosopo_api_route::schema::string_to_number(text)
}

fn looks_like_number(text: &str) -> bool {
    !text.trim().is_empty() && !js_number(text).is_nan()
}

/// A value yargs read: a JSON value, or NaN (`Number("x")`).
#[derive(Debug, Clone, PartialEq)]
enum Arg {
    Value(Value),
    NaN,
}

fn number_arg(text: &str) -> Arg {
    let number: f64 = js_number(text);
    if number.is_nan() {
        Arg::NaN
    } else {
        Arg::Value(json!(number))
    }
}

/// What yargs-parser makes of a command line, for the options the commands declare.
#[derive(Debug, Default)]
struct Parsed {
    positionals: Vec<String>,
    options: Map<String, Value>,
    nan: BTreeSet<String>,
}

impl Parsed {
    fn set(&mut self, name: &str, value: Arg, kind: Option<Kind>) {
        let key: String = camel(name);
        if key != name && !name.contains('_') {
            self.set_one(&key, value.clone(), kind);
        }
        self.set_one(name, value, kind);
    }

    /// A repeated option collects its values, as `duplicate-arguments-array` does.
    fn set_one(&mut self, name: &str, value: Arg, kind: Option<Kind>) {
        let value: Value = match value {
            Arg::NaN => {
                self.nan.insert(name.to_string());
                Value::Null
            }
            Arg::Value(value) => value,
        };
        match (self.options.get_mut(name), kind) {
            (Some(Value::Array(items)), Some(Kind::Array)) => match value {
                Value::Array(more) => items.extend(more),
                other => items.push(other),
            },
            (Some(existing), _) if kind != Some(Kind::Array) => {
                let previous: Value = existing.take();
                *existing = match previous {
                    Value::Array(mut items) => {
                        items.push(value);
                        Value::Array(items)
                    }
                    previous => json!([previous, value]),
                };
            }
            _ => {
                self.options.insert(name.to_string(), value);
            }
        }
    }
}

fn is_flag(token: &str) -> bool {
    token.starts_with('-') && token.len() > 1 && !looks_like_number(token)
}

/// The tokens after the binary, read as yargs-parser reads them for `command`'s options.
fn parse_tokens(tokens: &[String]) -> Parsed {
    let command: &str = tokens.iter().find(|token| !token.starts_with('-')).map_or("", String::as_str);
    let mut parsed: Parsed = Parsed::default();
    let mut at: usize = 0;
    while at < tokens.len() {
        let token: &str = &tokens[at];
        at += 1;
        // yargs leaves what follows `--` out of the command's positionals and options.
        if token == "--" {
            break;
        }
        if !is_flag(token) {
            parsed.positionals.push(token.to_string());
            continue;
        }
        let name: &str = token.trim_start_matches('-');
        if let Some((name, value)) = name.split_once('=') {
            let kind: Option<Kind> = option_kind(command, &camel(name)).or_else(|| option_kind(command, name));
            let arg: Arg = match kind {
                Some(Kind::Boolean) => Arg::Value(json!(value != "false")),
                Some(Kind::Number) => number_arg(value),
                Some(Kind::Array) => Arg::Value(json!([value])),
                _ => Arg::Value(json!(value)),
            };
            parsed.set(name, arg, kind);
            continue;
        }
        if let Some(negated) = name.strip_prefix("no-") {
            parsed.set(negated, Arg::Value(json!(false)), option_kind(command, &camel(negated)));
            continue;
        }
        let kind: Option<Kind> = option_kind(command, &camel(name)).or_else(|| option_kind(command, name));
        match kind {
            Some(Kind::Boolean) => match tokens.get(at).map(String::as_str) {
                Some(value @ ("true" | "false")) => {
                    at += 1;
                    parsed.set(name, Arg::Value(json!(value == "true")), kind);
                }
                _ => parsed.set(name, Arg::Value(json!(true)), kind),
            },
            Some(Kind::Array) => {
                let mut values: Vec<Value> = Vec::new();
                while let Some(value) = tokens.get(at).filter(|value| !is_flag(value)) {
                    values.push(json!(value));
                    at += 1;
                }
                parsed.set(name, Arg::Value(Value::Array(values)), kind);
            }
            _ => match tokens.get(at).filter(|value| !is_flag(value)) {
                Some(value) => {
                    at += 1;
                    let arg: Arg = if kind == Some(Kind::Number) { number_arg(value) } else { Arg::Value(json!(value)) };
                    parsed.set(name, arg, kind);
                }
                None => parsed.set(name, Arg::Value(if kind.is_some() { Value::String(String::new()) } else { json!(true) }), kind),
            },
        }
    }
    parsed
}

/// What a command line asks for: a command and its arguments, after yargs' checks.
#[derive(Debug, Clone, PartialEq)]
pub enum Invocation {
    /// A check or the middleware refused the line, with yargs' message.
    Refused(String),
    /// No command (the API, or nothing).
    None,
    Version,
    EnsureIndexes,
    EnsureExternalIndexes,
    StoreCaptchas,
    UpdateSpamEmailDomains,
    MigrateAbuserScoreThreshold { dry_run: bool },
    /// The handler's own parse: its output, or the issues it logs.
    ProviderSetDataSet(Result<String, Value>),
    SiteKeyRegister(Result<Value, Value>),
    SiteKeyRegisterApi(Result<Value, Value>),
}

fn issues(error: &ValidationError) -> Value {
    Value::Array(error.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect())
}

/// A number field of `SiteKeyRegisterCommandArgsSpec`, coercing where yargs read NaN so its
/// issue is zod's `received: "nan"`.
fn number_field(nan: bool) -> Schema {
    if nan {
        coerce_number()
    } else {
        number()
    }
}

/// `SiteKeyRegisterCommandArgsSpec`, and its `url` extension.
fn site_key_register_spec(nan: &BTreeSet<String>, with_url: bool) -> Schema {
    let field = |name: &str| number_field(nan.contains(name));
    let mut shape: Vec<(&str, Schema)> = vec![
        ("sitekey", string()),
        ("tier", Tier::schema()),
        ("captcha_type", selectable_captcha_type_schema()),
        ("frictionless_threshold", field("frictionless_threshold").max(1.0).min(0.0)),
        ("frictionless_image_threshold", field("frictionless_image_threshold").min(0.0).optional()),
        ("pow_difficulty", field("pow_difficulty")),
        ("domains", array(string())),
        ("image_threshold", field("image_threshold").max(1.0).min(0.0)),
        ("image_max_rounds", field("image_max_rounds").int().positive().optional().default(IMAGE_MAX_ROUNDS_DEFAULT)),
        ("image_min_rounds", field("image_min_rounds").int().positive().optional().default(IMAGE_MIN_ROUNDS_DEFAULT)),
    ];
    if with_url {
        shape.push(("url", string()));
    }
    object(shape)
}

/// The arguments object a handler is given, NaN values left as the text that made them, for
/// the coercing field to turn back into NaN.
fn argv(parsed: &Parsed, positionals: &[(&str, Option<&String>)]) -> Value {
    let mut out: Map<String, Value> = parsed.options.clone();
    for (name, value) in positionals {
        if let Some(value) = value {
            out.insert(name.to_string(), json!(value));
        }
    }
    for name in &parsed.nan {
        out.insert(name.clone(), json!("NaN"));
    }
    Value::Object(out)
}

fn missing(names: &[&str]) -> Option<String> {
    match names {
        [] => None,
        [name] => Some(format!("Missing required argument: {name}")),
        names => Some(format!("Missing required arguments: {}", names.join(", "))),
    }
}

/// `processArgs`: the command line read, checked and handed to its command's parse.
pub fn invocation(tokens: &[String]) -> Invocation {
    let parsed: Parsed = parse_tokens(tokens);
    let Some(command) = parsed.positionals.first().cloned() else {
        return Invocation::None;
    };
    let rest: Vec<String> = parsed.positionals[1..].to_vec();
    match command.as_str() {
        "version" => Invocation::Version,
        "ensure_indexes" => Invocation::EnsureIndexes,
        "ensure_external_indexes" => Invocation::EnsureExternalIndexes,
        "store_captchas" => Invocation::StoreCaptchas,
        "update_spam_email_domains" => Invocation::UpdateSpamEmailDomains,
        "migrate_abuser_score_threshold" => Invocation::MigrateAbuserScoreThreshold {
            dry_run: parsed.options.get("dryRun").and_then(Value::as_bool).unwrap_or(false),
        },
        "provider_set_data_set" => {
            if !parsed.options.contains_key("file") {
                return Invocation::Refused(missing(&["file"]).unwrap_or_default());
            }
            let spec: Schema = object(vec![("file", string())]);
            Invocation::ProviderSetDataSet(
                spec.validate(Some(&argv(&parsed, &[])))
                    .map(|args| args["file"].as_str().unwrap_or_default().to_string())
                    .map_err(|error| issues(&error)),
            )
        }
        "site_key_register" | "site_key_register_api" => {
            let api: bool = command == "site_key_register_api";
            let second: &str = if api { "url" } else { "tier" };
            let sitekey: Option<&String> = rest.first();
            let positional: Option<&String> = rest.get(1);
            let mut absent: Vec<&str> = Vec::new();
            if sitekey.is_none() {
                absent.push("sitekey");
            }
            if api && positional.is_none() && !parsed.options.contains_key("url") {
                absent.push("url");
            }
            if let Some(message) = missing(&absent) {
                return Invocation::Refused(message);
            }
            if rest.len() < 2 {
                return Invocation::Refused(format!("Not enough non-option arguments: got {}, need at least 2", rest.len()));
            }
            if let Some(tier) = parsed.options.get("tier").filter(|_| api) {
                let given: String = tier.as_str().map_or_else(|| tier.to_string(), str::to_string);
                if Tier::ALL.iter().all(|choice| choice.as_str() != given) {
                    let choices: Vec<String> = Tier::ALL.iter().map(|choice| format!("\"{}\"", choice.as_str())).collect();
                    return Invocation::Refused(format!("Invalid values:\n  Argument: tier, Given: \"{given}\", Choices: {}", choices.join(", ")));
                }
            }
            let encoded: String = match encode_string_address(sitekey.map_or("", String::as_str)) {
                Ok(encoded) => encoded,
                Err(error) => return Invocation::Refused(error.message().to_string()),
            };
            let args: Value = argv(&parsed, &[("sitekey", Some(&encoded)), (second, positional)]);
            let parsed_args = site_key_register_spec(&parsed.nan, api).validate(Some(&args)).map_err(|error| issues(&error));
            if api {
                Invocation::SiteKeyRegisterApi(parsed_args)
            } else {
                Invocation::SiteKeyRegister(parsed_args)
            }
        }
        _ => Invocation::None,
    }
}

/// A value with each whole number written as an integer, as `JSON.stringify` writes `4` where
/// serde writes `4.0`.
fn as_js_numbers(value: Value) -> Value {
    const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;
    match value {
        Value::Number(number) => match number.as_f64() {
            Some(float) if number.is_f64() && float.fract() == 0.0 && float.abs() <= MAX_SAFE_INTEGER => json!(float as i64),
            _ => Value::Number(number),
        },
        Value::Array(items) => Value::Array(items.into_iter().map(as_js_numbers).collect()),
        Value::Object(fields) => Value::Object(fields.into_iter().map(|(name, value)| (name, as_js_numbers(value))).collect()),
        other => other,
    }
}

/// The settings `site_key_register` gives a site, from its parsed arguments.
fn registration_settings(args: &Value) -> Value {
    as_js_numbers(json!({
        "captchaType": args["captcha_type"],
        "frictionlessThreshold": {
            "frictionlessPuzzleThreshold": args["frictionless_threshold"],
            "frictionlessImageThreshold": args.get("frictionless_image_threshold").cloned().unwrap_or(json!(FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT)),
        },
        "frictionlessTypes": frictionless_types_default(),
        "domains": args.get("domains").cloned().unwrap_or(json!([])),
        "powDifficulty": args["pow_difficulty"],
        "imageThreshold": args["image_threshold"],
        "imageMaxRounds": args["image_max_rounds"],
        "imageMinRounds": args["image_min_rounds"],
        "puzzleTolerance": PUZZLE_TOLERANCE_DEFAULT,
        "iconOrderTolerance": ICON_ORDER_TOLERANCE_DEFAULT,
        "puzzleMaxDifficulty": PUZZLE_MAX_DIFFICULTY_DEFAULT,
        "disallowWebView": false,
        "verifiedTimeout": 60000,
        "solutionTimeout": 60000,
    }))
}

fn tier_of(args: &Value) -> Option<Tier> {
    args["tier"].as_str().and_then(|tier| tier.parse::<Tier>().ok())
}

fn database(env: &ProviderEnvironment) -> Result<std::sync::Arc<ProviderDatabase>, String> {
    env.db.clone().ok_or_else(|| "db not setup! Please call isReady() first".to_string())
}

/// `loadJSONFile`.
fn load_json_file(file: &str) -> Result<Value, String> {
    let failed = || {
        ProsopoError::new(ErrorClass::Cli, ErrorSource::key("GENERAL.JSON_LOAD_FAILED"), ErrorOptions::default()).message().to_string()
    };
    let text: String = std::fs::read_to_string(file).map_err(|_| failed())?;
    serde_json::from_str(&text).map_err(|_| failed())
}

/// The message a command's handler logs its failure with, if any.
fn failure_message(invocation: &Invocation) -> Option<&'static str> {
    match invocation {
        Invocation::MigrateAbuserScoreThreshold { .. } => Some("Failed to migrate abuserScoreThreshold"),
        Invocation::ProviderSetDataSet(_) => Some("Error loading JSON"),
        Invocation::SiteKeyRegister(_) | Invocation::SiteKeyRegisterApi(_) => Some("Error registering Site Key"),
        Invocation::UpdateSpamEmailDomains => Some("Failed to update spam email domains"),
        _ => None,
    }
}

/// The command's handler, with the environment made ready. Its failures are logged under the
/// `cli` scope, as argv.ts hands every command that logger. Only the spam domain update passes
/// its failure on.
pub async fn run(invocation: Invocation, mut env: ProviderEnvironment) -> Result<(), String> {
    let logger: Logger = get_logger(LogLevel::Info, "cli");
    match invocation {
        Invocation::Refused(message) => Err(message),
        Invocation::None => Ok(()),
        Invocation::Version => {
            logger.info(|| LogRecord::default().with_data(json!({ "version": version() })));
            Ok(())
        }
        invocation => {
            let message: Option<&str> = failure_message(&invocation);
            let passes_on: bool = invocation == Invocation::UpdateSpamEmailDomains;
            let Err(error) = handle(invocation, &mut env, &logger).await else {
                return Ok(());
            };
            logger.error(|| {
                let record: LogRecord = LogRecord::default().with_err(error.clone());
                match message {
                    Some(message) => record.with_msg(message),
                    None => record,
                }
            });
            if passes_on {
                Err(error)
            } else {
                Ok(())
            }
        }
    }
}

async fn handle(invocation: Invocation, env: &mut ProviderEnvironment, logger: &Logger) -> Result<(), String> {
    if let Invocation::MigrateAbuserScoreThreshold { dry_run } = &invocation {
        logger.info(|| LogRecord::msg("Starting abuserScoreThreshold migration on provider DB...").with_data(json!({ "dryRun": dry_run })));
    }
    env.is_ready().await.map_err(|error| error.to_string())?;
    let config = env.config.clone();
    match invocation {
        Invocation::EnsureIndexes => {
            if config.mongo_captcha_uri.as_deref().is_none_or(str::is_empty) {
                return Err("mongoCaptchaUri not set in config".to_string());
            }
            database(env)?.ensure_indexes().await;
            Ok(())
        }
        Invocation::EnsureExternalIndexes => {
            let uri: String = config.mongo_captcha_uri.clone().filter(|uri| !uri.is_empty()).ok_or("mongoCaptchaUri not set in config")?;
            let db = database(env)?;
            let mongo: MongoDatabase = MongoDatabase::new(&uri, None, None, Some(env.logger.clone()), MongoConnectionTimeouts::default()).map_err(|error| error.to_string())?;
            // Never connected, as `getCaptchaDB` never connects it: each collection is skipped.
            CaptchaDatabase::new(mongo, db.shared_source(), env.logger.clone()).ensure_indexes().await;
            Ok(())
        }
        Invocation::StoreCaptchas => {
            let db = database(env)?;
            if let Err(error) = store_commitments_external(&db, config.mongo_captcha_uri.as_deref(), &env.logger).await {
                env.logger.error(|| LogRecord::default().with_err(error.message().to_string()));
            }
            Ok(())
        }
        Invocation::UpdateSpamEmailDomains => {
            let urls: Vec<String> = config.spam_email_domains_urls.clone().unwrap_or_default();
            if urls.is_empty() {
                logger.warn(|| LogRecord::msg("No spam email domains URLs configured. Set SPAM_EMAIL_DOMAINS_URLS in environment."));
                return Ok(());
            }
            logger.info(|| LogRecord::msg("Starting spam email domains update").with_data(json!({ "urlCount": urls.len() })));
            let db = database(env)?;
            update_spam_email_domains(&db, &env.logger, &urls, "./spam-cache").await.map_err(|error| {
                env.logger.error(|| LogRecord::msg("Error updating spam email domains").with_err(error.message().to_string()));
                error.message().to_string()
            })?;
            logger.info(|| LogRecord::msg("Spam email domains update completed successfully"));
            Ok(())
        }
        Invocation::MigrateAbuserScoreThreshold { dry_run } => {
            let db = database(env)?;
            let count: u64 = db.count_clients_without_abuser_score_threshold().await.map_err(|error| error.to_string())?;
            logger.info(|| LogRecord::msg(format!("Found {count} client records needing migration")));
            if !dry_run && count > 0 {
                let modified: u64 = db.set_missing_abuser_score_threshold().await.map_err(|error| error.to_string())?;
                logger.info(|| LogRecord::msg(format!("Updated {modified} client records")));
            }
            logger.info(|| LogRecord::msg("Migration completed").with_data(json!({ "recordsFound": count, "dryRun": dry_run })));
            if dry_run {
                logger.info(|| LogRecord::msg("DRY RUN: No changes were made. Run without --dryRun to apply changes."));
            }
            Ok(())
        }
        Invocation::ProviderSetDataSet(file) => {
            let file: String = file.map_err(|issues| issues.to_string())?;
            let json: Value = load_json_file(&file)?;
            logger.info(|| LogRecord::msg("Loading JSON").with_data(json!({ "file": file })));
            let db = database(env)?;
            let dataset: Value = crate::dataset::provider_dataset(&json, &config.captchas)?;
            db.store_dataset(&dataset).await.map_err(|error| error.to_string())?;
            logger.info(|| LogRecord::msg("Loaded JSON").with_data(json!({ "file": file })));
            Ok(())
        }
        Invocation::SiteKeyRegister(args) => {
            let args: Value = args.map_err(|issues| issues.to_string())?;
            let tier: Tier = tier_of(&args).ok_or("a tier")?;
            let site_key: &str = args["sitekey"].as_str().unwrap_or_default();
            validate(site_key)?;
            let settings = bson::serialize_to_document(&registration_settings(&args)).map_err(|error| error.to_string())?;
            let record: ClientRecord = ClientRecord { account: Some(site_key.to_string()), settings: Some(settings), tier };
            database(env)?.update_client_records(&[record]).await.map_err(|error| error.to_string())?;
            logger.info(|| LogRecord::msg("Site Key registered").with_data(json!({ "sitekey": site_key })));
            Ok(())
        }
        Invocation::SiteKeyRegisterApi(args) => {
            let args: Value = args.map_err(|issues| issues.to_string())?;
            let tier: Tier = tier_of(&args).ok_or("a tier")?;
            let site_key: &str = args["sitekey"].as_str().unwrap_or_default();
            let pair = env.pair.clone().ok_or("pair not setup! Please call isReady() first")?;
            let address: String = pair.address().map_err(|error| error.to_string())?;
            let jwt: String = pair.jwt_issue(&Default::default(), &[]).map_err(|error| error.to_string())?;
            let api: ProviderApi = ProviderApi::new(args["url"].as_str().unwrap_or_default(), &address, ClientOptions::default());
            api.register_site_key_settings(site_key, tier, &registration_settings(&args), &jwt).await.map_err(|error| error.to_string())?;
            logger.info(|| LogRecord::msg("Site Key registered").with_data(json!({ "sitekey": site_key })));
            Ok(())
        }
        Invocation::Refused(_) | Invocation::None | Invocation::Version => Ok(()),
    }
}

/// `validateSiteKey` as `ClientTaskManager.registerSiteKey` applies it.
fn validate(site_key: &str) -> Result<(), String> {
    match prosopo_util_crypto::validate_address(Some(site_key), false, Some(42)) {
        Ok(true) => Ok(()),
        _ => Err(ProsopoError::new(
            prosopo_common::ErrorClass::Api,
            prosopo_common::ErrorSource::key("API.INVALID_SITE_KEY"),
            prosopo_common::ErrorOptions::default(),
        )
        .message()
        .to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const VECTORS: &str = include_str!("equivalence/commands-vectors.json");

    /// Numbers compared as f64, so `4` and `4.0` agree.
    fn numeric(value: &Value) -> Value {
        match value {
            Value::Number(number) => json!(number.as_f64()),
            Value::Array(items) => Value::Array(items.iter().map(numeric).collect()),
            Value::Object(fields) => Value::Object(fields.iter().map(|(key, value)| (key.clone(), numeric(value))).collect()),
            other => other.clone(),
        }
    }

    fn outcome(invocation: &Invocation) -> (Value, Value) {
        let parse = |result: &Result<Value, Value>| match result {
            Ok(args) => json!({ "args": args }),
            Err(issues) => json!({ "issues": issues }),
        };
        match invocation {
            Invocation::Refused(message) => (Value::Null, json!(message)),
            Invocation::None => (Value::Null, Value::Null),
            Invocation::Version => (json!({ "command": "version" }), Value::Null),
            Invocation::EnsureIndexes => (json!({ "command": "ensure_indexes" }), Value::Null),
            Invocation::EnsureExternalIndexes => (json!({ "command": "ensure_external_indexes" }), Value::Null),
            Invocation::StoreCaptchas => (json!({ "command": "store_captchas" }), Value::Null),
            Invocation::UpdateSpamEmailDomains => (json!({ "command": "update_spam_email_domains" }), Value::Null),
            Invocation::MigrateAbuserScoreThreshold { dry_run } => (json!({ "command": "migrate_abuser_score_threshold", "args": { "dryRun": dry_run } }), Value::Null),
            Invocation::ProviderSetDataSet(file) => {
                let mut recorded: Value = parse(&file.clone().map(|file| json!({ "file": file })));
                recorded["command"] = json!("provider_set_data_set");
                (recorded, Value::Null)
            }
            Invocation::SiteKeyRegister(args) => {
                let mut recorded: Value = parse(args);
                recorded["command"] = json!("site_key_register");
                (recorded, Value::Null)
            }
            Invocation::SiteKeyRegisterApi(args) => {
                let mut recorded: Value = parse(args);
                recorded["command"] = json!("site_key_register_api");
                (recorded, Value::Null)
            }
        }
    }

    #[test]
    fn command_lines_are_read_as_yargs_reads_them() {
        let vectors: Value = serde_json::from_str(VECTORS).expect("vectors");
        for case in vectors["outcomes"].as_array().expect("outcomes") {
            let line: Vec<String> = serde_json::from_value(case["line"].clone()).expect("a line");
            let (recorded, failure) = outcome(&invocation(&line));
            if !case["failure"].is_null() {
                assert_eq!(failure, case["failure"], "{line:?}");
                continue;
            }
            assert_eq!(failure, Value::Null, "{line:?}");
            assert_eq!(numeric(&recorded), numeric(&case["recorded"]), "{line:?}");
        }
    }
}
