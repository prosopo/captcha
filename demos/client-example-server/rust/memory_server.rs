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

//! utils/database.ts: a throw-away `mongod` for development, as `mongodb-memory-server` starts
//! one: on a free local port, with a fresh data directory, stopped with the process. It runs a
//! binary already on the machine (`MONGOMS_SYSTEM_BINARY`, else the newest `mongod-*` in
//! `mongodb-memory-server`'s cache); unlike the package, it does not download one.

use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::process::{Child, Command};

/// A running `mongod` and the URI that reaches it. Dropping it stops the server.
pub struct MemoryServer {
    pub uri: String,
    _child: Child,
    directory: PathBuf,
}

impl Drop for MemoryServer {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.directory);
    }
}

fn cached_binary() -> Option<PathBuf> {
    let home: PathBuf = std::env::var_os("HOME").map(PathBuf::from)?;
    let cache: PathBuf = home.join(".cache/mongodb-binaries");
    let mut binaries: Vec<PathBuf> = std::fs::read_dir(cache)
        .ok()?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| path.file_name().and_then(|name| name.to_str()).is_some_and(|name| name.starts_with("mongod-")))
        .collect();
    binaries.sort();
    binaries.pop()
}

fn binary() -> Result<PathBuf, String> {
    std::env::var_os("MONGOMS_SYSTEM_BINARY")
        .map(PathBuf::from)
        .or_else(cached_binary)
        .filter(|path: &PathBuf| path.exists())
        .ok_or_else(|| "No mongod binary found: set MONGO_URI, or MONGOMS_SYSTEM_BINARY to a mongod".to_string())
}

fn free_port() -> Result<u16, String> {
    let listener: std::net::TcpListener = std::net::TcpListener::bind("127.0.0.1:0").map_err(|error| error.to_string())?;
    listener.local_addr().map(|address| address.port()).map_err(|error| error.to_string())
}

async fn wait_for(port: u16) -> Result<(), String> {
    for _ in 0..200 {
        if tokio::net::TcpStream::connect(("127.0.0.1", port)).await.is_ok() {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    Err(format!("mongod did not start listening on port {port}"))
}

impl MemoryServer {
    /// `memoryServerSetup`.
    pub async fn start() -> Result<MemoryServer, String> {
        let binary: PathBuf = binary()?;
        let port: u16 = free_port()?;
        let directory: PathBuf = std::env::temp_dir().join(format!("mongo-mem-{}-{port}", std::process::id()));
        std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        let child: Child = Command::new(Path::new(&binary))
            .args(["--port", &port.to_string(), "--bind_ip", "127.0.0.1", "--dbpath"])
            .arg(&directory)
            .stdout(std::process::Stdio::null())
            .kill_on_drop(true)
            .spawn()
            .map_err(|error| error.to_string())?;
        let server: MemoryServer = MemoryServer { uri: format!("mongodb://127.0.0.1:{port}/"), _child: child, directory };
        wait_for(port).await?;
        Ok(server)
    }
}
