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

//! The `User` model (models/user.ts, utils/connection.ts) on the `mongodb` driver: the reads and
//! writes mongoose sends for it, its string casts, and the id `@typegoose/auto-increment` 5
//! numbers new users with from the `identitycounters` collection.

use crate::inspect::inspect;
use bson::oid::ObjectId;
use bson::{doc, Bson, Document};
use mongodb::options::{FindOneAndUpdateOptions, ReturnDocument};
use mongodb::{Client, Collection, Database};
use prosopo_types_database::number::js_number;
use prosopo_util::number_to_string;
use serde_json::Value;
use tokio::sync::OnceCell;

const USERS: &str = "users";
const COUNTERS: &str = "identitycounters";
const MODEL: &str = "User";
const FIELD: &str = "id";

/// A failure, carrying the message the handlers answer with.
#[derive(Debug, Clone, PartialEq)]
pub struct StoreError(pub String);

impl From<mongodb::error::Error> for StoreError {
    fn from(error: mongodb::error::Error) -> StoreError {
        StoreError(error.to_string())
    }
}

/// A stored user, as the handlers read it.
#[derive(Debug, Clone, PartialEq)]
pub struct StoredUser {
    pub password: String,
    pub salt: String,
}

/// mongoose's `castString`: `null` stays, a document's string `_id` is taken, anything with
/// its own `toString` is written with it; a plain object or an array cannot be cast.
fn cast_string(value: &Value) -> Option<Bson> {
    match value {
        Value::Null => Some(Bson::Null),
        Value::String(text) => Some(Bson::String(text.clone())),
        Value::Bool(flag) => Some(Bson::String(flag.to_string())),
        Value::Number(number) => Some(Bson::String(number_to_string(number.as_f64().unwrap_or(f64::NAN)))),
        Value::Object(fields) => match fields.get("_id") {
            Some(Value::String(id)) => Some(Bson::String(id.clone())),
            _ => None,
        },
        Value::Array(_) => None,
    }
}

/// mongoose's `CastError` message for a string path.
fn cast_error(value: &Value, path: &str) -> String {
    let kind: &str = match value {
        Value::Array(_) => "Array",
        Value::Object(_) => "Object",
        Value::String(_) => "string",
        Value::Number(_) => "number",
        Value::Bool(_) => "boolean",
        Value::Null => "null",
    };
    format!("Cast to string failed for value \"{}\" (type {kind}) at path \"{path}\"", inspect(value))
}

/// The user collection and its id counter.
pub struct UserStore {
    database: Database,
    /// The plugin's once-per-process check that the counter exists.
    counter_checked: OnceCell<()>,
}

impl UserStore {
    /// The database the URI names, or `test`, as mongoose picks it.
    pub fn new(client: &Client) -> UserStore {
        let database: Database = client.default_database().unwrap_or_else(|| client.database("test"));
        UserStore { database, counter_checked: OnceCell::new() }
    }

    fn users(&self) -> Collection<Document> {
        self.database.collection(USERS)
    }

    fn counters(&self) -> Collection<Document> {
        self.database.collection(COUNTERS)
    }

    /// `User.findOne({ email: { $eq: email } })`. An absent email is sent as `null`, as the
    /// driver serialises `undefined`.
    pub async fn find_by_email(&self, email: Option<&Value>) -> Result<Option<StoredUser>, StoreError> {
        let email: Bson = match email {
            None => Bson::Null,
            Some(value) => cast_string(value).ok_or_else(|| StoreError(format!("{} for model \"{MODEL}\"", cast_error(value, "email"))))?,
        };
        let found: Option<Document> = self.users().find_one(doc! { "email": { "$eq": email } }).await?;
        Ok(found.map(|user: Document| StoredUser {
            password: user.get_str("password").unwrap_or_default().to_string(),
            salt: user.get_str("salt").unwrap_or_default().to_string(),
        }))
    }

    /// The plugin's first save in a process: the counter created one below its start if missing.
    async fn ensure_counter(&self) -> Result<(), StoreError> {
        self.counter_checked
            .get_or_try_init(|| async {
                let filter: Document = doc! { "modelName": MODEL, "field": FIELD };
                if self.counters().find_one(filter).await?.is_none() {
                    let counter: Document = doc! { "_id": ObjectId::new(), "field": FIELD, "modelName": MODEL, "count": -1_i32 };
                    self.counters().insert_one(counter).await?;
                }
                Ok::<(), StoreError>(())
            })
            .await
            .map(|_| ())
    }

    /// The next id: the counter incremented, created at 1 if it has gone.
    async fn next_id(&self) -> Result<Bson, StoreError> {
        let options: FindOneAndUpdateOptions = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .projection(doc! { "count": 1, "_id": 0 })
            .upsert(true)
            .build();
        let counter: Option<Document> = self
            .counters()
            .find_one_and_update(doc! { "field": FIELD, "modelName": MODEL }, doc! { "$inc": { "count": 1_i32 } })
            .with_options(options)
            .await?;
        let count: f64 = match counter.as_ref().and_then(|counter| counter.get("count")) {
            Some(Bson::Int32(count)) => f64::from(*count),
            Some(Bson::Int64(count)) => *count as f64,
            Some(Bson::Double(count)) => *count,
            _ => return Err(StoreError(format!("\"findOneAndUpdate\" incrementing count failed for \"{MODEL}\" on field \"{FIELD}\""))),
        };
        Ok(js_number(count))
    }

    /// `User.create({ email, name, password, salt })`: the name cast before anything is counted,
    /// the counter checked and incremented by the pre-save hook, the id appended last.
    pub async fn create(&self, email: &str, name: Option<&Value>, password: &str, salt: &str) -> Result<(), StoreError> {
        let mut user: Document = doc! { "_id": ObjectId::new(), "email": email };
        if let Some(name) = name {
            let cast: Bson = cast_string(name).ok_or_else(|| StoreError(format!("User validation failed: name: {}", cast_error(name, "name"))))?;
            user.insert("name", cast);
        }
        user.insert("password", password);
        user.insert("salt", salt);
        self.ensure_counter().await?;
        user.insert(FIELD, self.next_id().await?);
        user.insert("__v", 0_i32);
        self.users().insert_one(user).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn casts_as_mongoose_casts_strings() {
        assert_eq!(cast_string(&json!(42)), Some(Bson::String("42".to_string())));
        assert_eq!(cast_string(&json!(1.5e21)), Some(Bson::String("1.5e+21".to_string())));
        assert_eq!(cast_string(&json!(true)), Some(Bson::String("true".to_string())));
        assert_eq!(cast_string(&json!(null)), Some(Bson::Null));
        assert_eq!(cast_string(&json!({ "_id": "x" })), Some(Bson::String("x".to_string())));
        assert_eq!(cast_string(&json!({ "first": "A" })), None);
        assert_eq!(cast_string(&json!(["a"])), None);
    }

    #[test]
    fn describes_a_failed_cast_as_mongoose_does() {
        assert_eq!(cast_error(&json!({ "$ne": null }), "email"), "Cast to string failed for value \"{ '$ne': null }\" (type Object) at path \"email\"");
    }
}
