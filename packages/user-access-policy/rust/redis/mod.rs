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

//! Rule storage in Redis hashes, searched through RediSearch (src/redis).

mod index;
mod query;
mod reader;
mod storage;
mod writer;

pub use index::{
    access_rule_redis_key, access_rules_redis_index, ACCESS_RULES_REDIS_INDEX_NAME,
    ACCESS_RULE_REDIS_KEY_PREFIX,
};
pub use query::{
    build_scoped_rules_sub_queries, get_block_pool_clause, get_rules_redis_query, SubQuery,
    EMPTY_FILTER_QUERY, REDIS_QUERY_DIALECT,
};
pub use reader::RedisRulesReader;
#[cfg(test)]
pub(crate) use reader::{search_keys, search_keys_command};
pub use storage::RedisAccessRulesStorage;
pub use writer::{get_redis_rule_value, RedisRulesWriter, REDIS_BATCH_SIZE};
