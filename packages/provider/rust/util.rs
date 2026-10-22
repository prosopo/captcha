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

//! The rest of util.ts: shuffling, and whether a scheduled task is already running.

use prosopo_common::ProsopoError;
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::scheduler::ScheduledTaskRecord;
use prosopo_types::client::{ScheduledTaskNames, ScheduledTaskStatus};

/// `shuffleArray`: Fisher-Yates in place, each swap drawing `random()` as `Math.random()`.
pub fn shuffle_array<T>(items: &mut [T], random: &mut dyn FnMut() -> f64) {
    for index in (1..items.len()).rev() {
        let other: usize = (random() * (index + 1) as f64).floor() as usize;
        items.swap(other, index);
    }
}

/// `checkIfTaskIsRunning`: true while the task's latest run started under two minutes ago and
/// has not been marked completed.
pub async fn check_if_task_is_running(task: ScheduledTaskNames, db: &ProviderDatabase, now_ms: i64) -> Result<bool, ProsopoError> {
    let running: Option<ScheduledTaskRecord> = db.get_last_scheduled_task_status(task, Some(ScheduledTaskStatus::Running)).await?;
    let two_minutes_ago: i64 = now_ms - 1000 * 60 * 2;
    match running {
        Some(running) if running.datetime.timestamp_millis() > two_minutes_ago => {
            Ok(db.get_scheduled_task_status(running.id, ScheduledTaskStatus::Completed).await?.is_none())
        }
        _ => Ok(false),
    }
}
