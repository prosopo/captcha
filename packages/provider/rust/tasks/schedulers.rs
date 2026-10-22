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

//! The schedulers (src/schedulers) and the jobs they run: records sent to the central
//! database (`storeCommitmentsExternal`), the site list pulled from the client database
//! (`getClientList`), and the spam email domain lists fetched (`updateSpamEmailDomains`). A
//! job does not start while a run of it began in the last two minutes and has not completed
//! (`checkIfTaskIsRunning`).

use crate::tasks::cron::CronTime;
use bson::{doc, Bson, DateTime, Document};
use indexmap::IndexSet;
use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_database::captcha::{CaptchaBatch, CaptchaDatabase};
use prosopo_database::client::ClientDatabase;
use prosopo_database::clients::SpamEmailDomainUpdate;
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::{MongoConnectionTimeouts, MongoDatabase};
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::client::{ScheduledTaskNames, ScheduledTaskStatus};
use prosopo_types_database::scheduled_task::ScheduledTaskResult;
use prosopo_util::{cache_file, CacheFileLogger, CacheLogEntry, HttpCacheFileFetcher, ReqwestHttpClient};
use serde_json::json;
use std::future::Future;
use std::sync::Arc;
use std::time::Duration;

const BATCH_SIZE: f64 = 1000.0;

/// `new Error(message)`.
fn plain_error(message: impl Into<String>) -> ProsopoError {
    ProsopoError::new(ErrorClass::Prosopo, ErrorSource::message(message), ErrorOptions { name: Some("Error".to_string()), silent: true, ..ErrorOptions::default() })
}

/// `String(error)`: its name and message.
fn js_string(error: &ProsopoError) -> String {
    format!("{}: {}", error.error_type(), error.message())
}

/// `new Date(millis).toDateString()`, in UTC.
fn date_string(millis: i64) -> String {
    const DAYS: [&str; 7] = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
    const MONTHS: [&str; 12] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let iso: String = prosopo_logger::iso_timestamp(millis);
    let month: usize = iso[5..7].parse::<usize>().unwrap_or(1);
    let weekday: usize = millis.div_euclid(86_400_000).rem_euclid(7) as usize;
    format!("{} {} {} {}", DAYS[weekday], MONTHS[month - 1], &iso[8..10], &iso[0..4])
}
const RUNNING_WINDOW_MS: i64 = 2 * 60 * 1000;
const CLIENT_LIST_WINDOW_MS: i64 = 10 * 60 * 1000;

/// `checkIfTaskIsRunning`: a run that began in the last two minutes and has no completed
/// status. An older one is taken to have failed.
pub async fn check_if_task_is_running(name: ScheduledTaskNames, db: &ProviderDatabase) -> Result<bool, ProsopoError> {
    let Some(running) = db.get_last_scheduled_task_status(name, Some(ScheduledTaskStatus::Running)).await? else {
        return Ok(false);
    };
    if running.datetime.timestamp_millis() <= db.source().now().timestamp_millis() - RUNNING_WINDOW_MS {
        return Ok(false);
    }
    Ok(db.get_scheduled_task_status(running.id, ScheduledTaskStatus::Completed).await?.is_none())
}

fn task_result(data: Option<Document>, error: Option<String>) -> ScheduledTaskResult {
    ScheduledTaskResult { data: data.map(Bson::Document), error: error.map(Bson::String) }
}

/// `isRecordUpdated`: changed since it was last stored, or never stamped either way.
fn is_record_updated(record: &Document) -> bool {
    match (record.get_datetime("lastUpdatedTimestamp").ok(), record.get_datetime("storedAtTimestamp").ok()) {
        (Some(updated), Some(stored)) => updated.timestamp_millis() > stored.timestamp_millis(),
        _ => true,
    }
}

/// `processBatchesWithCursor`: batches read after the previous batch's last `_id` until one
/// comes back empty.
async fn process_batches<Fetch, FetchFuture, Process, ProcessFuture>(fetch: Fetch, mut process: Process) -> Result<(), ProsopoError>
where
    Fetch: Fn(Option<Bson>) -> FetchFuture,
    FetchFuture: Future<Output = Result<Vec<Document>, ProsopoError>>,
    Process: FnMut(Vec<Document>) -> ProcessFuture,
    ProcessFuture: Future<Output = Result<(), ProsopoError>>,
{
    let mut after: Option<Bson> = None;
    loop {
        let batch: Vec<Document> = fetch(after.clone()).await?;
        let Some(last) = batch.last().and_then(|row| row.get("_id")).cloned() else {
            if !batch.is_empty() {
                process(batch).await?;
            }
            return Ok(());
        };
        process(batch).await?;
        after = Some(last);
    }
}

fn keys(batch: &[Document], key: &str) -> Vec<String> {
    batch.iter().filter_map(|record| record.get_str(key).ok().map(str::to_string)).collect()
}

/// The records a sweep sends: those changed since they were stored, when an earlier sweep
/// completed, else all.
fn changed(batch: Vec<Document>, filter: bool) -> Vec<Document> {
    if filter {
        batch.into_iter().filter(is_record_updated).collect()
    } else {
        batch
    }
}

/// `storeCommitmentsExternal`: image commitments, PoW records and sessions not yet in the
/// central database, sent there in batches and marked stored as of the sweep's start.
pub async fn store_commitments_external(db: &ProviderDatabase, captcha_uri: Option<&str>, logger: &Logger) -> Result<(), ProsopoError> {
    let Some(uri) = captcha_uri.filter(|uri| !uri.is_empty()) else {
        logger.info(|| LogRecord::msg("Mongo env not set"));
        return Ok(());
    };
    let last = db.get_last_scheduled_task_status(ScheduledTaskNames::StoreCommitmentsExternal, Some(ScheduledTaskStatus::Completed)).await?;
    let task_id = db.create_scheduled_task_status(ScheduledTaskNames::StoreCommitmentsExternal, ScheduledTaskStatus::Running).await?;
    let only_changed: bool = last.as_ref().is_some_and(|task| task.updated.is_some());
    let captcha_db: Option<CaptchaDatabase> = MongoDatabase::new(uri, None, None, Some(logger.clone()), MongoConnectionTimeouts::default())
        .ok()
        .map(|mongo| CaptchaDatabase::new(mongo, db.shared_source(), logger.clone()));
    let sweep = async {
        let captcha_db: &CaptchaDatabase = captcha_db.as_ref().ok_or_else(|| plain_error("Invalid scheme, expected connection string to start with \"mongodb://\" or \"mongodb+srv://\""))?;
        let swept_at: DateTime = db.source().now();
        let mut commitments: usize = 0;
        process_batches(
            |after| async move { db.get_unstored_dapp_user_commitments(Some(BATCH_SIZE), after.as_ref()).await },
            |batch| {
                let batch: Vec<Document> = changed(batch, only_changed).into_iter().filter(|record| record.get_str("id").ok() != Some("")).collect();
                commitments += batch.len();
                async move {
                    if !batch.is_empty() {
                        captcha_db.save_captchas(&CaptchaBatch { commitments: batch.clone(), ..CaptchaBatch::default() }).await?;
                        db.mark_dapp_user_commitments_stored(&keys(&batch, "id"), Some(swept_at)).await?;
                    }
                    Ok(())
                }
            },
        )
        .await?;
        let mut pow: usize = 0;
        process_batches(
            |after| async move { db.get_unstored_dapp_user_pow_commitments(Some(BATCH_SIZE), after.as_ref()).await },
            |batch| {
                let batch: Vec<Document> = changed(batch, only_changed);
                pow += batch.len();
                async move {
                    if !batch.is_empty() {
                        captcha_db.save_captchas(&CaptchaBatch { pow: batch.clone(), ..CaptchaBatch::default() }).await?;
                        db.mark_dapp_user_pow_commitments_stored(&keys(&batch, "challenge"), Some(swept_at)).await?;
                    }
                    Ok(())
                }
            },
        )
        .await?;
        let mut sessions: usize = 0;
        process_batches(
            |after| async move { db.get_unstored_session_records(Some(BATCH_SIZE), after.as_ref()).await },
            |batch| {
                let batch: Vec<Document> = changed(batch, only_changed);
                sessions += batch.len();
                async move {
                    if !batch.is_empty() {
                        captcha_db.save_captchas(&CaptchaBatch { sessions: batch.clone(), ..CaptchaBatch::default() }).await?;
                        db.mark_session_records_stored(&keys(&batch, "sessionId"), Some(swept_at)).await?;
                    }
                    Ok(())
                }
            },
        )
        .await?;
        Ok::<Document, ProsopoError>(doc! {
            "processedSessionRecords": sessions as i64,
            "processedCommitments": commitments as i64,
            "processedPowRecords": pow as i64,
        })
    };
    match sweep.await {
        Ok(data) => {
            db.update_scheduled_task_status(task_id, ScheduledTaskStatus::Completed, Some(&task_result(Some(data), None))).await?;
            if let Some(captcha_db) = &captcha_db {
                captcha_db.close().await;
            }
        }
        Err(error) => {
            logger.error(|| LogRecord::msg("Error processing client tasks").with_err(error.message().to_string()));
            if let Some(captcha_db) = &captcha_db {
                captcha_db.close().await;
            }
            db.update_scheduled_task_status(task_id, ScheduledTaskStatus::Failed, Some(&task_result(None, Some(js_string(&error))))).await?;
        }
    }
    Ok(())
}

/// `getClientList`: the sites the client database changed since ten minutes before the last
/// completed pull (everything, the first time), stored as client records.
pub async fn get_client_list(db: &ProviderDatabase, client_uri: Option<&str>, logger: &Logger) -> Result<(), ProsopoError> {
    let Some(uri) = client_uri.filter(|uri| !uri.is_empty()) else {
        logger.info(|| LogRecord::msg("Mongo env not set"));
        return Ok(());
    };
    let last = db.get_last_scheduled_task_status(ScheduledTaskNames::GetClientList, Some(ScheduledTaskStatus::Completed)).await?;
    let task_id = db.create_scheduled_task_status(ScheduledTaskNames::GetClientList, ScheduledTaskStatus::Running).await?;
    let pull = async {
        let mongo: MongoDatabase =
            MongoDatabase::new(uri, None, None, Some(logger.clone()), MongoConnectionTimeouts::default()).map_err(|error| plain_error(error.to_string()))?;
        let client_db: ClientDatabase = ClientDatabase::new(mongo, db.shared_source(), logger.clone());
        let since: i64 = last.as_ref().and_then(|task| task.updated).map_or(0, |updated| (updated.timestamp_millis() - CLIENT_LIST_WINDOW_MS).max(0));
        logger.info(|| LogRecord::msg(format!("Getting updated client records since {}", date_string(since))));
        let records = client_db.get_updated_clients(since as f64).await?;
        db.update_client_records(&records).await?;
        Ok::<usize, ProsopoError>(records.len())
    };
    match pull.await {
        Ok(count) => {
            let data: Document = doc! { "clientRecords": count as i64 };
            db.update_scheduled_task_status(task_id, ScheduledTaskStatus::Completed, Some(&task_result(Some(data), None))).await?;
        }
        Err(error) => {
            logger.error(|| LogRecord::msg("Error getting client list").with_err(error.message().to_string()));
            db.update_scheduled_task_status(task_id, ScheduledTaskStatus::Failed, Some(&task_result(None, Some(js_string(&error))))).await?;
        }
    }
    Ok(())
}

const SPAM_CACHE_FILE_PREFIX: &str = "spam-email-domains";
const SPAM_CACHE_FILE_TYPE: &str = ".txt";

/// The provider's logger as `cacheFile` logs.
struct CacheLog<'a>(&'a Logger);

impl CacheFileLogger for CacheLog<'_> {
    fn debug(&self, entry: &dyn Fn() -> CacheLogEntry) {
        self.0.debug(|| record(entry()));
    }

    fn info(&self, entry: &dyn Fn() -> CacheLogEntry) {
        self.0.info(|| record(entry()));
    }

    fn warn(&self, entry: &dyn Fn() -> CacheLogEntry) {
        self.0.warn(|| record(entry()));
    }

    fn error(&self, entry: &dyn Fn() -> CacheLogEntry) {
        self.0.error(|| record(entry()));
    }
}

fn record(entry: CacheLogEntry) -> LogRecord {
    match entry.err {
        Some(error) => LogRecord::msg(entry.msg).with_err(error),
        None => LogRecord::msg(entry.msg),
    }
}

/// `updateSpamEmailDomains`: each list fetched (through the file cache), its valid domains
/// lower-cased, comments left out, and all of them upserted.
pub async fn update_spam_email_domains(db: &ProviderDatabase, logger: &Logger, urls: &[String], cache_dir: &str) -> Result<(), ProsopoError> {
    let task_id = db.create_scheduled_task_status(ScheduledTaskNames::UpdateSpamEmailDomains, ScheduledTaskStatus::Running).await?;
    let fetcher = HttpCacheFileFetcher::new(ReqwestHttpClient::new(reqwest::Client::new()));
    let update = async {
        let mut domains: IndexSet<String> = IndexSet::new();
        for (index, url) in urls.iter().enumerate() {
            let prefix: String = format!("{SPAM_CACHE_FILE_PREFIX}-{index}-");
            let path: String =
                cache_file(cache_dir, url, &CacheLog(logger), &prefix, SPAM_CACHE_FILE_TYPE, &fetcher).await.map_err(|error| plain_error(error.to_string()))?;
            let text: String = tokio::fs::read_to_string(&path).await.map_err(|error| plain_error(error.to_string()))?;
            for line in prosopo_util::js_trim(&text).split('\n') {
                let domain: String = prosopo_util::js_trim(line).to_lowercase();
                if !domain.is_empty() && !domain.starts_with('#') && !domain.starts_with("//") && prosopo_util::validate_domain(&domain) {
                    domains.insert(domain);
                }
            }
        }
        let updates: Vec<SpamEmailDomainUpdate> =
            domains.iter().map(|domain| SpamEmailDomainUpdate { filter: prosopo_util::js_trim(domain).to_string(), update: prosopo_util::js_trim(domain).to_string() }).collect();
        db.bulk_update_spam_email_domains(&updates, true).await?;
        Ok::<usize, ProsopoError>(domains.len())
    };
    match update.await {
        Ok(count) => {
            let data: Document = doc! { "domainsProcessed": count as i64 };
            db.update_scheduled_task_status(task_id, ScheduledTaskStatus::Completed, Some(&task_result(Some(data), None))).await?;
            logger.info(|| LogRecord::msg("Successfully updated spam email domains.").with_data(json!({ "domainsProcessed": count })));
            Ok(())
        }
        Err(error) => {
            logger.error(|| LogRecord::msg("Error updating spam email domains.").with_err(error.message().to_string()));
            db.update_scheduled_task_status(task_id, ScheduledTaskStatus::Failed, Some(&task_result(None, Some(error.message().to_string())))).await?;
            Err(error)
        }
    }
}

/// A scheduler: the job run at each firing time of `schedule` (`new CronJob(schedule, tick)`),
/// a tick not awaited by the next, unless a run of it is still going.
pub fn start_scheduler<Job, JobFuture>(name: ScheduledTaskNames, schedule: &str, db: Arc<ProviderDatabase>, logger: Logger, job: Job) -> Result<tokio::task::JoinHandle<()>, ProsopoError>
where
    Job: Fn() -> JobFuture + Send + Sync + 'static,
    JobFuture: Future<Output = ()> + Send + 'static,
{
    let time: CronTime = CronTime::parse(schedule).map_err(|error| plain_error(error.0))?;
    let job: Arc<Job> = Arc::new(job);
    Ok(tokio::spawn(async move {
        loop {
            let now: i64 = db.source().now().timestamp_millis();
            let next: i64 = match time.next_date_from(now, now) {
                Ok(next) => next,
                Err(error) => {
                    logger.error(|| LogRecord::msg("Scheduler stopped").with_err(error.0).with_data(json!({ "task": name.as_str() })));
                    return;
                }
            };
            tokio::time::sleep(Duration::from_millis(u64::try_from(next - now).unwrap_or(0))).await;
            let (db, logger, job) = (db.clone(), logger.clone(), job.clone());
            tokio::spawn(async move {
                let running: bool = check_if_task_is_running(name, &db).await.unwrap_or(false);
                logger.info(|| LogRecord::msg(format!("{} task running: {running}", name.as_str())).with_data(json!({ "taskRunning": running })));
                if !running {
                    logger.info(|| LogRecord::msg(format!("{} task....", name.as_str())));
                    job().await;
                }
            });
        }
    }))
}
