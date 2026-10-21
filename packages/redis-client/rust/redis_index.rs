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

//! `createRedisIndex` / `deleteRedisIndex`. Re-creating an index is expensive on large sets, so
//! the hash of each index definition is kept in the `_index_hashes` Redis hash and an index is
//! only dropped and re-created when its definition changes.

use crate::index::{create_index_args, create_index_hash, RedisIndex};
use redis::aio::ConnectionLike;
use redis::{Cmd, RedisResult};
use std::future::Future;

pub const INDEX_HASHES_KEY: &str = "_index_hashes";

/// The commands index setup sends, as node-redis sends them.
pub trait IndexCommands: Send {
    /// `FT._LIST`.
    fn ft_list(&mut self) -> impl Future<Output = RedisResult<Vec<String>>> + Send;
    /// `HGET key field`.
    fn hget(
        &mut self,
        key: &str,
        field: &str,
    ) -> impl Future<Output = RedisResult<Option<String>>> + Send;
    /// `HSET key field value`.
    fn hset(
        &mut self,
        key: &str,
        field: &str,
        value: &str,
    ) -> impl Future<Output = RedisResult<()>> + Send;
    /// `HDEL key field`.
    fn hdel(&mut self, key: &str, field: &str) -> impl Future<Output = RedisResult<()>> + Send;
    /// `FT.DROPINDEX index`.
    fn ft_dropindex(&mut self, index_name: &str) -> impl Future<Output = RedisResult<()>> + Send;
    /// The whole `FT.CREATE` command line built by [`create_index_args`], name included.
    fn ft_create(&mut self, command: &[String]) -> impl Future<Output = RedisResult<()>> + Send;
}

pub async fn create_redis_index<C: IndexCommands>(
    client: &mut C,
    index: &RedisIndex,
) -> RedisResult<()> {
    let index_hash: String = create_index_hash(index);
    let existing_indexes: Vec<String> = client.ft_list().await?;
    if existing_indexes.contains(&index.name) {
        let existing_hash: Option<String> = client.hget(INDEX_HASHES_KEY, &index.name).await?;
        if existing_hash.as_deref() == Some(index_hash.as_str()) {
            return Ok(());
        }
        client.ft_dropindex(&index.name).await?;
    }
    client.ft_create(&create_index_args(index)).await?;
    client
        .hset(INDEX_HASHES_KEY, &index.name, &index_hash)
        .await
}

pub async fn delete_redis_index<C: IndexCommands>(
    client: &mut C,
    index_name: &str,
) -> RedisResult<()> {
    client.ft_dropindex(index_name).await?;
    client.hdel(INDEX_HASHES_KEY, index_name).await
}

pub(crate) fn ft_list_cmd() -> Cmd {
    redis::cmd("FT._LIST")
}

pub(crate) fn hget_cmd(key: &str, field: &str) -> Cmd {
    redis::cmd("HGET").arg(key).arg(field).to_owned()
}

pub(crate) fn hset_cmd(key: &str, field: &str, value: &str) -> Cmd {
    redis::cmd("HSET").arg(key).arg(field).arg(value).to_owned()
}

pub(crate) fn hdel_cmd(key: &str, field: &str) -> Cmd {
    redis::cmd("HDEL").arg(key).arg(field).to_owned()
}

pub(crate) fn ft_dropindex_cmd(index_name: &str) -> Cmd {
    redis::cmd("FT.DROPINDEX").arg(index_name).to_owned()
}

pub(crate) fn ft_create_cmd(command: &[String]) -> Cmd {
    let mut cmd: Cmd = Cmd::new();
    for arg in command {
        cmd.arg(arg);
    }
    cmd
}

/// Runs the six commands over any redis-rs async connection; replies the TS ignores (the
/// `HSET`/`HDEL` counts, `OK`) are discarded.
pub(crate) struct OnConnection<'a, C: ConnectionLike + Send>(pub &'a mut C);

impl<C: ConnectionLike + Send> IndexCommands for OnConnection<'_, C> {
    async fn ft_list(&mut self) -> RedisResult<Vec<String>> {
        ft_list_cmd().query_async(self.0).await
    }

    async fn hget(&mut self, key: &str, field: &str) -> RedisResult<Option<String>> {
        hget_cmd(key, field).query_async(self.0).await
    }

    async fn hset(&mut self, key: &str, field: &str, value: &str) -> RedisResult<()> {
        hset_cmd(key, field, value).exec_async(self.0).await
    }

    async fn hdel(&mut self, key: &str, field: &str) -> RedisResult<()> {
        hdel_cmd(key, field).exec_async(self.0).await
    }

    async fn ft_dropindex(&mut self, index_name: &str) -> RedisResult<()> {
        ft_dropindex_cmd(index_name).exec_async(self.0).await
    }

    async fn ft_create(&mut self, command: &[String]) -> RedisResult<()> {
        ft_create_cmd(command).exec_async(self.0).await
    }
}
