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

use crate::{ConsoleMethod, DirectiveStore, LogRuntime, Sink};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex};

#[derive(Debug, Default)]
pub struct CaptureSink {
    lines: Mutex<Vec<(ConsoleMethod, String)>>,
}

impl CaptureSink {
    pub fn take(&self) -> Vec<(ConsoleMethod, String)> {
        std::mem::take(&mut *self.lines.lock().expect("capture lock"))
    }

    pub fn lines_for(&self, method: ConsoleMethod) -> Vec<String> {
        self.lines
            .lock()
            .expect("capture lock")
            .iter()
            .filter(|(m, _)| *m == method)
            .map(|(_, line)| line.clone())
            .collect()
    }

    pub fn count(&self) -> usize {
        self.lines.lock().expect("capture lock").len()
    }
}

impl Sink for CaptureSink {
    fn write(&self, method: ConsoleMethod, line: &str) {
        self.lines
            .lock()
            .expect("capture lock")
            .push((method, line.to_string()));
    }
}

#[derive(Debug, Default)]
pub struct FixedClock(pub AtomicI64);

impl crate::Clock for FixedClock {
    fn now_ms(&self) -> i64 {
        self.0.load(Ordering::Relaxed)
    }
}

pub struct Harness {
    pub runtime: LogRuntime,
    pub sink: Arc<CaptureSink>,
    pub clock: Arc<FixedClock>,
    pub directives: Arc<DirectiveStore>,
}

/// A runtime isolated from the process-wide directives, so tests can run in parallel.
pub fn harness() -> Harness {
    let sink = Arc::new(CaptureSink::default());
    let clock = Arc::new(FixedClock::default());
    let directives = Arc::new(DirectiveStore::new(""));
    let runtime = LogRuntime {
        sink: sink.clone(),
        clock: clock.clone(),
        directives: directives.clone(),
    };
    Harness {
        runtime,
        sink,
        clock,
        directives,
    }
}
