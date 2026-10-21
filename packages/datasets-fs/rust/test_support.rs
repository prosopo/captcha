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

//! What the unit and equivalence tests share: scratch directories, and running a command
//! from one, as the TS tests' relative paths need.

use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::Mutex;

/// The repository root, which the fixtures' `${repo}` stands for.
pub fn repo_dir() -> String {
    std::fs::canonicalize(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .expect("the repository root")
        .to_string_lossy()
        .into_owned()
}

pub fn fixtures_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("src/tests/data")
}

/// A fresh directory, resolved through any symlinks, removed when dropped.
pub struct ScratchDir(PathBuf);

impl ScratchDir {
    pub fn new() -> ScratchDir {
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        let path: PathBuf = std::env::temp_dir().join(format!(
            "datasets-fs-rust-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::SeqCst)
        ));
        std::fs::create_dir_all(&path).expect("a scratch directory");
        ScratchDir(std::fs::canonicalize(&path).expect("a scratch directory"))
    }

    pub fn path(&self) -> &Path {
        &self.0
    }

    pub fn join(&self, relative: &str) -> String {
        self.0.join(relative).to_string_lossy().into_owned()
    }
}

impl Drop for ScratchDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// Runs `future` with `dir` as the working directory; one at a time, as the directory is
/// the process's.
pub async fn run_in<T>(dir: &Path, future: impl Future<Output = T>) -> T {
    static CWD: Mutex<()> = Mutex::const_new(());
    let _guard = CWD.lock().await;
    let previous: PathBuf = std::env::current_dir().expect("a working directory");
    std::env::set_current_dir(dir).expect("enter the directory");
    let result: T = future.await;
    std::env::set_current_dir(previous).expect("leave the directory");
    result
}
