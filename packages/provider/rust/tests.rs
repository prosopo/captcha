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
//! util.unit.test.ts: the cases the vectors do not cover; ipMatch.unit.test.ts.
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

/// ipMatch.unit.test.ts. Its "halves as they come back from Mongo" cases have no Rust
/// counterpart: `IpHalf` is a `u64` decoded from either BSON encoding, so there is no
/// unconverted or unparseable half to compare.
mod ip_matches_session {
    use crate::composite_ip::get_composite_ip_address;
    use crate::tasks::verify::ip_matches_session;
    use prosopo_database::records::{CompositeIpAddress, IpHalf};
    use prosopo_types::stored::IpAddressType;

    fn matches(operator_ip: &str, session_ip: &str) -> bool {
        ip_matches_session(operator_ip, &get_composite_ip_address(session_ip))
    }

    #[test]
    fn compares_v4_addresses_exactly() {
        assert!(matches("192.0.2.42", "192.0.2.42"));
        assert!(!matches("192.0.2.43", "192.0.2.42"));
        assert!(!matches("192.0.3.42", "192.0.2.42"));
    }

    #[test]
    fn compares_v6_addresses_across_canonicalisations_and_both_halves() {
        assert!(matches("2001:db8::1", "2001:db8::1"));
        assert!(matches("2001:db8::1", "2001:db8:0:0:0:0:0:1"));
        assert!(!matches("2001:db8::2", "2001:db8::1"));
        assert!(!matches("2001:db9::1", "2001:db8::1"));
    }

    #[test]
    fn rejects_a_cross_family_pair() {
        assert!(!matches("192.0.2.42", "2001:db8::1"));
        assert!(!matches("2001:db8::1", "192.0.2.42"));
    }

    #[test]
    fn unmaps_ipv4_mapped_v6_on_either_side() {
        assert!(matches("192.0.2.42", "::ffff:192.0.2.42"));
        assert!(matches("::ffff:192.0.2.42", "192.0.2.42"));
        assert!(!matches("192.0.2.43", "::ffff:192.0.2.42"));
    }

    #[test]
    fn does_not_unmap_a_v6_address_that_only_shares_the_low_32_bits() {
        assert!(!matches("192.0.2.42", "2001:db8::ffff:c000:22a"));
    }

    #[test]
    fn rejects_an_empty_or_garbage_operator_ip_against_a_real_session() {
        assert!(!matches("", "192.0.2.42"));
        assert!(!matches("", "2001:db8::1"));
        assert!(!matches("not.an.ip", "192.0.2.42"));
        assert!(!matches("g:h:i", "2001:db8::1"));
        assert!(!matches("", "1.1.1.1"));
    }

    #[test]
    fn the_unparseable_sentinel_matches_a_zero_v4_session() {
        let zero: CompositeIpAddress = CompositeIpAddress { lower: IpHalf(0), upper: None, ip_type: IpAddressType::V4 };
        assert!(ip_matches_session("", &zero));
        assert!(ip_matches_session("not.an.ip", &zero));
    }
}
