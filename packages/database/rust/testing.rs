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

//! Test doubles for crates that use this one: an in-memory Redis for [`crate::redis_cache`].
//! Built for this crate's tests and, with the `testing` feature, for other crates' tests.

use redis::aio::ConnectionLike;
use redis::{Arg, Cmd, ErrorKind, Pipeline, RedisError, RedisFuture, Value as RedisValue};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex};

/// Each key's value and, if it has one, when it expires.
pub type Store = BTreeMap<String, (String, Option<i64>)>;

/// An in-memory Redis: keeps each command it is sent, expires keys on its own clock, and fails
/// the commands it is told to.
#[derive(Clone, Default)]
pub struct FakeRedis {
    pub store: Arc<Mutex<Store>>,
    pub sent: Arc<Mutex<Vec<Vec<String>>>>,
    pub failing: Arc<Mutex<Vec<String>>>,
    pub now_ms: Arc<AtomicI64>,
}

impl FakeRedis {
    pub fn live(&self, key: &str) -> Option<String> {
        let mut store = self.store.lock().expect("lock");
        let now: i64 = self.now_ms.load(Ordering::SeqCst);
        match store.get(key) {
            Some((_, Some(expires_at))) if *expires_at <= now => {
                store.remove(key);
                None
            }
            Some((value, _)) => Some(value.clone()),
            None => None,
        }
    }

    fn answer(&self, args: &[String]) -> Result<RedisValue, RedisError> {
        self.sent.lock().expect("lock").push(args.to_vec());
        let command: String = args[0].to_uppercase();
        if self.failing.lock().expect("lock").contains(&command) {
            return Err(RedisError::from((ErrorKind::Io, "REDIS_DOWN")));
        }
        let now: i64 = self.now_ms.load(Ordering::SeqCst);
        match command.as_str() {
            "SET" => {
                let expires_at: Option<i64> = (args.get(3).map(String::as_str) == Some("EX"))
                    .then(|| now + args[4].parse::<i64>().expect("seconds") * 1000);
                self.store.lock().expect("lock").insert(args[1].clone(), (args[2].clone(), expires_at));
                Ok(RedisValue::Okay)
            }
            "GET" => Ok(self.live(&args[1]).map(|value| RedisValue::BulkString(value.into_bytes())).unwrap_or(RedisValue::Nil)),
            "DEL" => {
                let mut store = self.store.lock().expect("lock");
                Ok(RedisValue::Int(args[1..].iter().filter(|key| store.remove(*key).is_some()).count() as i64))
            }
            "EVAL" => {
                let (key, expected, next, ttl) = (&args[3], &args[4], &args[5], &args[6]);
                if self.live(key).as_ref() != Some(expected) {
                    return Ok(RedisValue::Int(0));
                }
                let expires_at: i64 = now + ttl.parse::<i64>().expect("seconds") * 1000;
                self.store.lock().expect("lock").insert(key.clone(), (next.clone(), Some(expires_at)));
                Ok(RedisValue::Int(1))
            }
            "SCAN" => {
                let prefix: &str = args[3].trim_end_matches('*');
                let keys: Vec<RedisValue> = self
                    .store
                    .lock()
                    .expect("lock")
                    .keys()
                    .filter(|key| key.starts_with(prefix))
                    .map(|key| RedisValue::BulkString(key.clone().into_bytes()))
                    .collect();
                Ok(RedisValue::Array(vec![RedisValue::BulkString(b"0".to_vec()), RedisValue::Array(keys)]))
            }
            other => Err(RedisError::from((ErrorKind::Client, "unexpected command", other.to_string()))),
        }
    }

    pub fn sent(&self) -> Vec<Vec<String>> {
        std::mem::take(&mut *self.sent.lock().expect("lock"))
    }
}

impl ConnectionLike for FakeRedis {
    fn req_packed_command<'a>(&'a mut self, cmd: &'a Cmd) -> RedisFuture<'a, RedisValue> {
        let args: Vec<String> = cmd
            .args_iter()
            .map(|arg| match arg {
                Arg::Simple(bytes) => String::from_utf8(bytes.to_vec()).expect("UTF-8"),
                _ => "0".to_string(),
            })
            .collect();
        let reply: Result<RedisValue, RedisError> = self.answer(&args);
        Box::pin(async move { reply })
    }

    fn req_packed_commands<'a>(&'a mut self, _pipeline: &'a Pipeline, _offset: usize, _count: usize) -> RedisFuture<'a, Vec<RedisValue>> {
        Box::pin(async { Err(RedisError::from((ErrorKind::Client, "no pipelines here"))) })
    }

    fn get_db(&self) -> i64 {
        0
    }
}

