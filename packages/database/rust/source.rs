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

//! Where the methods get the time, `Math.random()` and new ids: the system, or a test's
//! recording.

use bson::oid::ObjectId;
use bson::DateTime;
use prosopo_types_database::schema::Ids;

pub trait Source: Send + Sync {
    fn now(&self) -> DateTime;
    /// `Math.random()`: uniform in [0, 1).
    fn random(&self) -> f64;
    fn object_id(&self) -> ObjectId;
}

pub struct SystemSource;

impl Source for SystemSource {
    fn now(&self) -> DateTime {
        DateTime::now()
    }

    fn random(&self) -> f64 {
        let mut bytes: [u8; 8] = [0; 8];
        getrandom::fill(&mut bytes).expect("the system random source");
        (u64::from_le_bytes(bytes) >> 11) as f64 / (1u64 << 53) as f64
    }

    fn object_id(&self) -> ObjectId {
        ObjectId::new()
    }
}

/// A [`Source`] seen as the schema engine's [`Ids`].
pub struct SourceIds<'a>(pub &'a dyn Source);

impl Ids for SourceIds<'_> {
    fn object_id(&mut self) -> ObjectId {
        self.0.object_id()
    }

    fn now(&mut self) -> DateTime {
        self.0.now()
    }
}
