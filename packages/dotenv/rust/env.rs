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

use crate::node_path::{join, resolve};
use crate::parse::{parse, DotenvParsed};
use prosopo_logger::{get_logger, parse_log_level, LogLevel, LogRecord, Logger};
use serde_json::{json, Value};
use std::fmt;
use std::io;
use std::sync::{Arc, OnceLock};

const WORKSPACE_ROOT_PACKAGE_NAME: &str = "@prosopo/captcha-private";
const MAX_LEVELS_UP: u32 = 10;

/// The TS default for `filepath`: two directories above the compiled module, i.e. `packages/`.
pub const DEFAULT_FILEPATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/..");

/// The file system operations discovery and loading perform, so failures that a real file
/// system cannot produce on demand can be injected.
pub trait EnvFs: Send + Sync {
    /// `fs.existsSync`: errors count as "does not exist" on a real file system.
    fn exists(&self, path: &str) -> io::Result<bool>;
    /// `fs.readFileSync(path, "utf8")`, which replaces invalid UTF-8 rather than failing.
    fn read_to_string(&self, path: &str) -> io::Result<String>;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct RealFs;

impl EnvFs for RealFs {
    fn exists(&self, path: &str) -> io::Result<bool> {
        Ok(std::path::Path::new(path).exists())
    }

    fn read_to_string(&self, path: &str) -> io::Result<String> {
        let bytes = std::fs::read(path)?;
        Ok(String::from_utf8_lossy(&bytes).into_owned())
    }
}

/// The exceptions `getEnvFile` (and so `loadEnv`) lets escape.
#[derive(Debug)]
pub enum DotenvError {
    /// `process.cwd()` failed.
    Cwd(io::Error),
    /// `fs.existsSync` threw; only an injected [`EnvFs`] can do this.
    Exists { path: String, source: io::Error },
    /// Reading an ancestor `package.json` failed.
    Read { path: String, source: io::Error },
    /// `JSON.parse` of an ancestor `package.json` threw a `SyntaxError`.
    Syntax { path: String, message: String },
    /// The `package.json` held `null`, so reading `.name` threw a `TypeError`.
    NullPackageJson { path: String },
}

impl DotenvError {
    /// The JS error class, or the Node error code for file system errors.
    pub fn kind(&self) -> String {
        match self {
            DotenvError::Syntax { .. } => "SyntaxError".to_string(),
            DotenvError::NullPackageJson { .. } => "TypeError".to_string(),
            DotenvError::Cwd(source)
            | DotenvError::Exists { source, .. }
            | DotenvError::Read { source, .. } => node_error_code(source),
        }
    }
}

impl fmt::Display for DotenvError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DotenvError::Cwd(source) => write!(f, "{}: {source}, uv_cwd", node_error_code(source)),
            DotenvError::Exists { path, source } | DotenvError::Read { path, source } => {
                write!(f, "{}: {source}, '{path}'", node_error_code(source))
            }
            DotenvError::Syntax { path, message } => {
                write!(f, "invalid JSON in {path}: {message}")
            }
            DotenvError::NullPackageJson { .. } => {
                f.write_str("Cannot read properties of null (reading 'name')")
            }
        }
    }
}

impl std::error::Error for DotenvError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            DotenvError::Cwd(source)
            | DotenvError::Exists { source, .. }
            | DotenvError::Read { source, .. } => Some(source),
            DotenvError::Syntax { .. } | DotenvError::NullPackageJson { .. } => None,
        }
    }
}

/// libuv's names for the errno values a path lookup or read can fail with.
pub fn node_error_code(error: &io::Error) -> String {
    let name = match error.raw_os_error() {
        Some(1) => "EPERM",
        Some(2) => "ENOENT",
        Some(5) => "EIO",
        Some(13) => "EACCES",
        Some(20) => "ENOTDIR",
        Some(21) => "EISDIR",
        Some(24) => "EMFILE",
        Some(36) => "ENAMETOOLONG",
        Some(40) => "ELOOP",
        _ => match error.kind() {
            io::ErrorKind::NotFound => "ENOENT",
            io::ErrorKind::PermissionDenied => "EACCES",
            io::ErrorKind::IsADirectory => "EISDIR",
            io::ErrorKind::NotADirectory => "ENOTDIR",
            _ => "EIO",
        },
    };
    name.to_string()
}

fn module_logger() -> &'static Logger {
    static LOGGER: OnceLock<Logger> = OnceLock::new();
    LOGGER.get_or_init(|| {
        let level = std::env::var("PROSOPO_LOG_LEVEL").ok();
        get_logger(parse_log_level(level.as_deref(), LogLevel::Info), "dotenv")
    })
}

fn non_empty(value: Option<&str>) -> Option<&str> {
    value.filter(|v| !v.is_empty())
}

/// `getEnv` for a given `NODE_ENV`: non-word characters stripped, `"development"` when unset
/// or empty.
pub fn sanitise_node_env(node_env: Option<&str>) -> String {
    match non_empty(node_env) {
        Some(value) => value
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
            .collect(),
        None => "development".to_string(),
    }
}

/// `getEnv`, reading `NODE_ENV` from the process environment.
pub fn get_env() -> String {
    let node_env = std::env::var("NODE_ENV").ok();
    sanitise_node_env(node_env.as_deref())
}

/// What `loadEnv` read, before anything is written to the environment.
#[derive(Debug)]
pub struct LoadedEnv {
    pub path: String,
    pub parsed: DotenvParsed,
    /// dotenv reports a failed read on its return value, which `loadEnv` discards.
    pub read_error: Option<io::Error>,
}

/// The process state the TS reads implicitly: `process.cwd()`, `process.env.NODE_ENV`, the
/// file system, the module logger and the module's own location.
#[derive(Clone)]
pub struct EnvContext {
    pub cwd: String,
    pub node_env_var: Option<String>,
    pub default_filepath: String,
    pub fs: Arc<dyn EnvFs>,
    pub logger: Logger,
}

impl fmt::Debug for EnvContext {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("EnvContext")
            .field("cwd", &self.cwd)
            .field("node_env_var", &self.node_env_var)
            .field("default_filepath", &self.default_filepath)
            .finish_non_exhaustive()
    }
}

impl EnvContext {
    pub fn from_process() -> Result<EnvContext, DotenvError> {
        let cwd = std::env::current_dir().map_err(DotenvError::Cwd)?;
        Ok(EnvContext {
            cwd: cwd.to_string_lossy().into_owned(),
            node_env_var: std::env::var("NODE_ENV").ok(),
            default_filepath: crate::node_path::normalize(DEFAULT_FILEPATH),
            fs: Arc::new(RealFs),
            logger: module_logger().clone(),
        })
    }

    fn exists(&self, path: &str) -> Result<bool, DotenvError> {
        self.fs.exists(path).map_err(|source| DotenvError::Exists {
            path: path.to_string(),
            source,
        })
    }

    fn is_workspace_root(&self, package_json: &str) -> Result<bool, DotenvError> {
        let contents =
            self.fs
                .read_to_string(package_json)
                .map_err(|source| DotenvError::Read {
                    path: package_json.to_string(),
                    source,
                })?;
        let value: Value =
            serde_json::from_str(&contents).map_err(|error| DotenvError::Syntax {
                path: package_json.to_string(),
                message: error.to_string(),
            })?;
        match value {
            Value::Null => Err(DotenvError::NullPackageJson {
                path: package_json.to_string(),
            }),
            Value::Object(map) => Ok(map
                .get("name")
                .is_some_and(|name| name.as_str() == Some(WORKSPACE_ROOT_PACKAGE_NAME))),
            _ => Ok(false),
        }
    }

    /// `getEnvFile`. Arguments are the TS positional ones; `None` is `undefined`.
    pub fn get_env_file(
        &self,
        root_dir: Option<&str>,
        filename: Option<&str>,
        filepath: Option<&str>,
        node_env: Option<&str>,
    ) -> Result<String, DotenvError> {
        let filename = filename.unwrap_or(".env");
        let filepath = filepath.unwrap_or(&self.default_filepath);
        let env = match non_empty(node_env) {
            Some(env) => env.to_string(),
            None => sanitise_node_env(self.node_env_var.as_deref()),
        };
        let file_name_full = if env.is_empty() {
            filename.to_string()
        } else {
            format!("{filename}.{env}")
        };
        let root_dir = non_empty(root_dir);

        let mut search_path = resolve(&self.cwd, &[root_dir.unwrap_or(".")]);

        self.logger.debug(|| {
            LogRecord::msg("Searching")
                .with_data(json!({ "fileName": file_name_full, "searchPath": search_path }))
        });

        let mut level_count: u32 = 0;

        while !self.exists(&join(&[&search_path, &file_name_full]))? {
            let package_json = join(&[&search_path, "package.json"]);
            if self.exists(&package_json)? && self.is_workspace_root(&package_json)? {
                self.logger.debug(|| {
                    LogRecord::msg("Reached the workspace root package.json, stopping search.")
                        .with_data(json!({ "fileName": file_name_full }))
                });
                break;
            }
            search_path = resolve(&search_path, &[".."]);
            level_count += 1;
            if level_count > MAX_LEVELS_UP {
                self.logger.debug(|| {
                    LogRecord::msg("Checked directories above, stopping search.")
                        .with_data(json!({ "fileName": file_name_full, "levelCount": level_count }))
                });
                break;
            }
        }

        let found_path = join(&[&search_path, &file_name_full]);
        if self.exists(&found_path)? {
            Ok(found_path)
        } else {
            Ok(join(&[root_dir.unwrap_or(filepath), &file_name_full]))
        }
    }

    /// The reading half of `loadEnv`: discovers and parses the file without touching the
    /// environment. Apply the result with [`populate`] and [`apply_env`].
    pub fn read_env(
        &self,
        root_dir: Option<&str>,
        filename: Option<&str>,
        file_path: Option<&str>,
        node_env: Option<&str>,
    ) -> Result<LoadedEnv, DotenvError> {
        let root_dir = resolve(&self.cwd, &[non_empty(root_dir).unwrap_or(".")]);
        let env_path = self.get_env_file(Some(&root_dir), filename, file_path, node_env)?;
        self.logger
            .debug(|| LogRecord::msg("Loading env").with_data(json!({ "envPath": env_path })));
        let (parsed, read_error) = match self.fs.read_to_string(&env_path) {
            Ok(contents) => (parse(&contents), None),
            Err(error) => (DotenvParsed::new(), Some(error)),
        };
        Ok(LoadedEnv {
            path: env_path,
            parsed,
            read_error,
        })
    }
}

/// dotenv's `populate` into `process.env`: the assignments to make, given which keys are
/// already set. Node stores environment values as C strings, so a value is cut at its first
/// NUL, as `process.env[key] = value` does.
pub fn populate(
    parsed: &DotenvParsed,
    is_set: impl Fn(&str) -> bool,
    override_existing: bool,
) -> Vec<(String, String)> {
    parsed
        .iter()
        .filter(|(key, _)| override_existing || !is_set(key))
        .map(|(key, value)| {
            let stored = value.split('\0').next().unwrap_or_default();
            (key.clone(), stored.to_string())
        })
        .collect()
}

/// Writes assignments from [`populate`] to the process environment. Not safe to call while
/// other threads read the environment through libc (`getenv`).
pub fn apply_env(assignments: &[(String, String)]) {
    for (key, value) in assignments {
        std::env::set_var(key, value);
    }
}

/// `getEnvFile` against the real process state.
pub fn get_env_file(
    root_dir: Option<&str>,
    filename: Option<&str>,
    filepath: Option<&str>,
    node_env: Option<&str>,
) -> Result<String, DotenvError> {
    EnvContext::from_process()?.get_env_file(root_dir, filename, filepath, node_env)
}

/// `loadEnv`: finds the env file, loads it into the process environment and returns its path.
/// A missing or unreadable env file is not an error, as in the TS.
pub fn load_env(
    root_dir: Option<&str>,
    filename: Option<&str>,
    file_path: Option<&str>,
    node_env: Option<&str>,
    override_existing: bool,
) -> Result<String, DotenvError> {
    let loaded = EnvContext::from_process()?.read_env(root_dir, filename, file_path, node_env)?;
    let assignments = populate(
        &loaded.parsed,
        |key| std::env::var_os(key).is_some(),
        override_existing,
    );
    apply_env(&assignments);
    Ok(loaded.path)
}
