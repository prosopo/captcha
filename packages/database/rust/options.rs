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

//! The connection options (src/mongooseOptions.ts).

use mongodb::options::{ClientOptions, ServerApi, ServerApiVersion};
use std::fmt;
use std::time::Duration;
use url::Url;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MongoCompressor {
    Zstd,
    None,
    Snappy,
    Zlib,
}

impl MongoCompressor {
    pub fn as_str(self) -> &'static str {
        match self {
            MongoCompressor::Zstd => "zstd",
            MongoCompressor::None => "none",
            MongoCompressor::Snappy => "snappy",
            MongoCompressor::Zlib => "zlib",
        }
    }
}

/// No compression by default: the TS provider ships as a bundle that cannot load the driver's
/// native compressors, so nothing in production ever asks for one.
pub const DEFAULT_COMPRESSORS: [MongoCompressor; 0] = [];

pub const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 10_000;
pub const DEFAULT_SERVER_SELECTION_TIMEOUT_MS: u64 = 20_000;
/// The TS sets `socketTimeoutMS`, which the Rust driver does not support; [`crate::MongoDatabase`]
/// bounds each operation by it instead.
pub const SOCKET_TIMEOUT_MS: u64 = 30_000;
const MAX_IDLE_TIME_MS: u64 = 300_000;
const MAX_CONNECTING: u32 = 2;

/// `getMongoCompressors`: compression only for a remote host, one whose name has a `.` or a `:`.
/// Not for localhost, a single-label host (a container name) or no host; and the given list,
/// copied, if the host cannot be parsed.
pub fn get_mongo_compressors(url: &str, compressors: &[MongoCompressor]) -> Vec<MongoCompressor> {
    let without_protocol: &str = match url.find("://") {
        Some(index) => &url[index + 3..],
        None => url,
    };
    if without_protocol.trim().is_empty() {
        return Vec::new();
    }
    let Ok(parsed) = Url::parse(&format!("mongodb://{without_protocol}")) else {
        return compressors.to_vec();
    };
    let hostname: &str = parsed.host_str().unwrap_or("");
    if matches!(hostname, "localhost" | "127.0.0.1" | "[::1]" | "::1") {
        return Vec::new();
    }
    if hostname.contains('.') || hostname.contains(':') {
        compressors.to_vec()
    } else {
        Vec::new()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmptyUrl;

impl fmt::Display for EmptyUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("MongoDB connection URL is required and cannot be empty or whitespace-only")
    }
}

impl std::error::Error for EmptyUrl {}

/// The arguments of `getMongoConnectionOptions`.
#[derive(Debug, Clone, Default)]
pub struct ConnectionArgs {
    pub url: String,
    pub app_name: String,
    pub max_pool_size: Option<u32>,
    pub min_pool_size: Option<u32>,
    pub db_name: Option<String>,
    pub connect_timeout_ms: Option<u64>,
    pub server_selection_timeout_ms: Option<u64>,
}

/// What `getMongoConnectionOptions` returns, field for field.
#[derive(Debug, Clone, PartialEq)]
pub struct ConnectionOptions {
    pub max_pool_size: u32,
    pub min_pool_size: u32,
    pub max_connecting: u32,
    pub connect_timeout_ms: u64,
    pub socket_timeout_ms: u64,
    pub max_idle_time_ms: u64,
    pub app_name: String,
    pub server_selection_timeout_ms: u64,
    pub compressors: Vec<MongoCompressor>,
    pub db_name: Option<String>,
}

/// `getMongoConnectionOptions`: the stable API v1 (not strict), a pool of 10 down to 0, two
/// connections opening at a time, and compression as [`get_mongo_compressors`] decides.
pub fn get_mongo_connection_options(args: &ConnectionArgs) -> Result<ConnectionOptions, EmptyUrl> {
    if args.url.trim().is_empty() {
        return Err(EmptyUrl);
    }
    Ok(ConnectionOptions {
        max_pool_size: args.max_pool_size.unwrap_or(10),
        min_pool_size: args.min_pool_size.unwrap_or(0),
        max_connecting: MAX_CONNECTING,
        connect_timeout_ms: args.connect_timeout_ms.unwrap_or(DEFAULT_CONNECT_TIMEOUT_MS),
        socket_timeout_ms: SOCKET_TIMEOUT_MS,
        max_idle_time_ms: MAX_IDLE_TIME_MS,
        app_name: args.app_name.clone(),
        server_selection_timeout_ms: args.server_selection_timeout_ms.unwrap_or(DEFAULT_SERVER_SELECTION_TIMEOUT_MS),
        compressors: get_mongo_compressors(&args.url, &DEFAULT_COMPRESSORS),
        db_name: args.db_name.clone().filter(|name| !name.is_empty()),
    })
}

impl ConnectionOptions {
    /// The driver's options, on top of those the URL itself carries. Compression is never
    /// requested (see [`DEFAULT_COMPRESSORS`]), so the driver is built without compressors.
    pub fn apply(&self, options: &mut ClientOptions) {
        options.server_api = Some(
            ServerApi::builder()
                .version(ServerApiVersion::V1)
                .strict(false)
                .deprecation_errors(false)
                .build(),
        );
        options.max_pool_size = Some(self.max_pool_size);
        options.min_pool_size = Some(self.min_pool_size);
        options.max_connecting = Some(self.max_connecting);
        options.connect_timeout = Some(Duration::from_millis(self.connect_timeout_ms));
        options.max_idle_time = Some(Duration::from_millis(self.max_idle_time_ms));
        options.app_name = Some(self.app_name.clone());
        options.server_selection_timeout = Some(Duration::from_millis(self.server_selection_timeout_ms));
        if let Some(name) = &self.db_name {
            options.default_database = Some(name.clone());
        }
    }
}
