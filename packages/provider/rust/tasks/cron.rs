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

//! The `cron` package's `CronTime`, which times the schedulers (3.1.7), from `prosopo-util`.

pub use prosopo_util::cron::{CronError, CronTime, CronVersion};

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    const VECTORS: &str = include_str!("../equivalence/cron-vectors.json");

    fn iso(millis: i64) -> String {
        prosopo_logger::iso_timestamp(millis)
    }

    fn millis(text: &str) -> i64 {
        bson::DateTime::parse_rfc3339_str(text).expect("an ISO time").timestamp_millis()
    }

    #[test]
    fn schedules_as_the_cron_package_does() {
        let vectors: Value = serde_json::from_str(VECTORS).expect("vectors");
        let now: i64 = millis(vectors["generatedAt"].as_str().expect("the time the vectors were written"));
        for case in vectors["cases"].as_array().expect("cases") {
            let expression: &str = case["expression"].as_str().expect("an expression");
            let outcome: Result<(String, Vec<Value>), CronError> = CronTime::parse(expression).and_then(|time| {
                let mut runs: Vec<Value> = Vec::new();
                for run in case["runs"].as_array().into_iter().flatten() {
                    let start: &str = run["start"].as_str().expect("a start");
                    let mut date: i64 = millis(start);
                    let mut next: Vec<String> = Vec::new();
                    for _ in 0..6 {
                        date = time.next_date_from(date, now)?;
                        next.push(iso(date));
                    }
                    runs.push(serde_json::json!({ "start": start, "next": next }));
                }
                if case.get("error").is_some() {
                    for start in ["2026-01-01T00:00:00.000Z"] {
                        let mut date: i64 = millis(start);
                        for _ in 0..6 {
                            date = time.next_date_from(date, now)?;
                        }
                    }
                }
                Ok((time.to_expression(), runs))
            });
            match (outcome, case.get("error").and_then(Value::as_str)) {
                (Ok((parsed, runs)), None) => {
                    assert_eq!(parsed, case["parsed"].as_str().expect("parsed"), "{expression:?}");
                    assert_eq!(Value::Array(runs), case["runs"], "{expression:?}");
                }
                (Err(error), Some(expected)) if expected.starts_with("Something went wrong") => {
                    assert!(error.0.starts_with("Something went wrong") && error.0.contains(&format!("Cron String: {expression}")), "{expression:?}: {error}");
                }
                (Err(error), Some(expected)) => assert_eq!(error.0, expected, "{expression:?}"),
                (outcome, expected) => panic!("{expression:?}: rust {outcome:?}, ts {expected:?}"),
            }
        }
    }
}
