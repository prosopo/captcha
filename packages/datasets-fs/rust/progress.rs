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

//! cli-progress's `shades_classic` bar on stdout. Like cli-progress, it draws nothing when
//! stdout is not a terminal.

use std::io::{IsTerminal, Write};
use std::time::Instant;

const BAR_SIZE: usize = 40;

pub struct Progress {
    total: f64,
    value: f64,
    started: Instant,
    terminal: bool,
}

impl Progress {
    pub fn start(total: f64) -> Progress {
        let progress: Progress = Progress {
            total,
            value: 0.0,
            started: Instant::now(),
            terminal: std::io::stdout().is_terminal(),
        };
        progress.render();
        progress
    }

    pub fn increment(&mut self) {
        self.value += 1.0;
        self.render();
    }

    pub fn stop(self) {
        self.render();
        if self.terminal {
            println!();
        }
    }

    fn render(&self) {
        if !self.terminal {
            return;
        }
        let ratio: f64 = if self.total > 0.0 {
            (self.value / self.total).clamp(0.0, 1.0)
        } else {
            0.0
        };
        let complete: usize = (ratio * BAR_SIZE as f64).round() as usize;
        let elapsed: f64 = self.started.elapsed().as_secs_f64();
        let eta: f64 = if self.value > 0.0 {
            (elapsed / self.value * (self.total - self.value))
                .max(0.0)
                .round()
        } else {
            0.0
        };
        let line: String = format!(
            "\r {}{} {}% | ETA: {}s | {}/{}",
            "\u{2588}".repeat(complete),
            "\u{2591}".repeat(BAR_SIZE - complete),
            (ratio * 100.0).round(),
            eta,
            self.value,
            self.total
        );
        let mut stdout = std::io::stdout();
        let _ = stdout.write_all(line.as_bytes());
        let _ = stdout.flush();
    }
}
