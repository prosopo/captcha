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

//! util.unit.test.ts: the cases the vectors do not cover.

mod shuffle_array {
    use crate::util::shuffle_array;

    fn draws(values: Vec<f64>) -> impl FnMut() -> f64 {
        let mut values = values.into_iter().cycle();
        move || values.next().expect("a draw")
    }

    #[test]
    fn keeps_the_length_and_the_elements() {
        let mut items: Vec<i32> = vec![1, 2, 3, 4, 5, 2];
        shuffle_array(&mut items, &mut draws(vec![0.1, 0.9, 0.5, 0.3]));
        let mut sorted: Vec<i32> = items.clone();
        sorted.sort();
        assert_eq!(sorted, vec![1, 2, 2, 3, 4, 5]);
    }

    #[test]
    fn handles_an_empty_and_a_single_element_array() {
        let mut empty: Vec<i32> = Vec::new();
        shuffle_array(&mut empty, &mut draws(vec![0.5]));
        assert!(empty.is_empty());
        let mut single: Vec<i32> = vec![7];
        shuffle_array(&mut single, &mut draws(vec![0.5]));
        assert_eq!(single, vec![7]);
    }

    #[test]
    fn swaps_as_math_random_directs_in_place() {
        let mut items: Vec<char> = vec!['a', 'b', 'c'];
        shuffle_array(&mut items, &mut draws(vec![0.0, 0.0]));
        assert_eq!(items, vec!['b', 'c', 'a']);
    }
}

mod check_if_task_is_running {
    use crate::util::check_if_task_is_running;
    use bson::oid::ObjectId;
    use bson::{doc, DateTime, Document};
    use prosopo_database::operation::{Executor, Operation, Reply, ReplyFuture};
    use prosopo_database::provider::ProviderDatabase;
    use prosopo_database::source::SystemSource;
    use prosopo_logger::{get_logger, LogLevel};
    use prosopo_types::client::ScheduledTaskNames;
    use std::sync::Arc;

    const NOW: i64 = 1_700_000_000_000;

    /// The scheduler collection: a running record started at `started`, and a completed record
    /// for it if `completed`.
    struct Scheduler {
        started: Option<i64>,
        completed: bool,
        id: ObjectId,
    }

    impl Executor for Scheduler {
        fn run(&self, operation: Operation) -> ReplyFuture<'_> {
            let filter: Document = match &operation {
                Operation::Find { filter, .. } => filter.clone(),
                _ => Document::new(),
            };
            let status: &str = filter.get_str("status").unwrap_or_default();
            let documents: Vec<Document> = match (status, self.started) {
                ("Running", Some(started)) => vec![doc! {
                    "_id": self.id,
                    "processName": "StoreCommitmentsExternal",
                    "datetime": DateTime::from_millis(started),
                    "status": "Running",
                }],
                ("Completed", Some(started)) if self.completed => vec![doc! {
                    "_id": self.id,
                    "processName": "StoreCommitmentsExternal",
                    "datetime": DateTime::from_millis(started),
                    "status": "Completed",
                }],
                _ => Vec::new(),
            };
            Box::pin(async move { Ok(Reply::Documents(documents)) })
        }
    }

    async fn running(started: Option<i64>, completed: bool) -> bool {
        let db: ProviderDatabase = ProviderDatabase::new(
            Arc::new(Scheduler { started, completed, id: ObjectId::new() }),
            Arc::new(SystemSource),
            get_logger(LogLevel::Error, "test"),
        );
        check_if_task_is_running(ScheduledTaskNames::StoreCommitmentsExternal, &db, NOW).await.expect("reads")
    }

    #[tokio::test]
    async fn is_false_when_no_run_is_recorded() {
        assert!(!running(None, false).await);
    }

    #[tokio::test]
    async fn is_false_when_the_run_started_over_two_minutes_ago() {
        assert!(!running(Some(NOW - 3 * 60 * 1000), false).await);
    }

    #[tokio::test]
    async fn is_true_when_a_recent_run_has_not_completed() {
        assert!(running(Some(NOW - 30 * 1000), false).await);
    }

    #[tokio::test]
    async fn is_false_when_a_recent_run_has_completed() {
        assert!(!running(Some(NOW - 30 * 1000), true).await);
    }
}
