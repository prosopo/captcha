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

//! The rules index (src/redis/redisRuleIndex.ts). Its definition hashes to the one in
//! production's `_index_hashes`, so starting the Rust service does not rebuild it.

use crate::rule::AccessRule;
use crate::transform::make_access_rule_hash;
use prosopo_redis_client::index::{
    CreateOptions, IndexDataType, NumericField, RediSearchSchema, RedisVariadic, SchemaField,
    TagField,
};
use prosopo_redis_client::RedisIndex;

pub const ACCESS_RULES_REDIS_INDEX_NAME: &str = "index:user-access-rules";

/// An acronym, since key names take space.
pub const ACCESS_RULE_REDIS_KEY_PREFIX: &str = "uar:";

fn tag() -> SchemaField {
    SchemaField::Tag(TagField {
        index_missing: Some(true),
        ..TagField::default()
    })
}

fn numeric() -> SchemaField {
    SchemaField::Numeric(NumericField {
        index_missing: Some(true),
        ..NumericField::default()
    })
}

/// `accessRulesRedisIndex`. Every field is TAG (exact matching) or NUMERIC, and indexes its
/// absence. `coords` holds JSON, which has commas, so it is split on `|`.
pub fn access_rules_redis_index() -> RedisIndex {
    let schema: RediSearchSchema = RediSearchSchema::new()
        .with("clientId", tag())
        .with("userId", tag())
        .with("ja4Hash", tag())
        .with("headersHash", tag())
        .with("userAgentHash", tag())
        .with("headHash", tag())
        .with(
            "coords",
            TagField {
                index_missing: Some(true),
                separator: Some("|".to_string()),
                ..TagField::default()
            },
        )
        .with("countryCode", tag())
        .with("asn", numeric())
        .with("os", tag())
        .with("browser", tag())
        .with("headerMatch", tag())
        .with("headerName", tag())
        .with("headerValue", tag())
        .with("headerOperator", tag())
        .with("webBotAuthAgent", tag())
        .with("numericIpMaskMin", numeric())
        .with("numericIpMaskMax", numeric())
        .with("numericIp", numeric())
        .with("groupId", tag())
        .with("type", tag())
        .with("deferToVerify", tag());
    RedisIndex {
        name: ACCESS_RULES_REDIS_INDEX_NAME.to_string(),
        schema,
        options: CreateOptions {
            on: Some(IndexDataType::Hash),
            prefix: Some(RedisVariadic::Many(vec![
                ACCESS_RULE_REDIS_KEY_PREFIX.to_string()
            ])),
            ..CreateOptions::default()
        },
    }
}

/// `getAccessRuleRedisKey`.
pub fn access_rule_redis_key(rule: &AccessRule) -> String {
    format!(
        "{ACCESS_RULE_REDIS_KEY_PREFIX}{}",
        make_access_rule_hash(rule)
    )
}
