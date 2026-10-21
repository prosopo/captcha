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

//! The TS `RedisIndex`: a RediSearch index definition in the shape of node-redis's
//! `RediSearchSchema` / `CreateOptions`.
//!
//! The TS stores `sha256(JSON.stringify(index))` in `_index_hashes` and only rebuilds an index
//! when that hash changes, so these types serialise to exactly the JSON the TS object produces:
//! JS number formatting, JS key order (array-index keys first, then insertion order), and the
//! key order each field or options object was written in (see [`KeyOrder`]).

use crate::js::{is_array_index, number_to_js_string};
use serde::de::{MapAccess, Visitor};
use serde::ser::SerializeMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::value::RawValue;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SchemaFieldType {
    #[serde(rename = "TEXT")]
    Text,
    #[serde(rename = "NUMERIC")]
    Numeric,
    #[serde(rename = "GEO")]
    Geo,
    #[serde(rename = "TAG")]
    Tag,
    #[serde(rename = "GEOSHAPE")]
    GeoShape,
}

impl SchemaFieldType {
    pub fn as_str(self) -> &'static str {
        match self {
            SchemaFieldType::Text => "TEXT",
            SchemaFieldType::Numeric => "NUMERIC",
            SchemaFieldType::Geo => "GEO",
            SchemaFieldType::Tag => "TAG",
            SchemaFieldType::GeoShape => "GEOSHAPE",
        }
    }
}

/// `SORTABLE?: boolean | 'UNF'`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Sortable {
    Bool(bool),
    Unf,
}

impl Serialize for Sortable {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Sortable::Bool(value) => serializer.serialize_bool(*value),
            Sortable::Unf => serializer.serialize_str("UNF"),
        }
    }
}

impl<'de> Deserialize<'de> for Sortable {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Sortable, D::Error> {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum Raw {
            Bool(bool),
            Str(String),
        }
        match Raw::deserialize(deserializer)? {
            Raw::Bool(value) => Ok(Sortable::Bool(value)),
            Raw::Str(value) if value == "UNF" => Ok(Sortable::Unf),
            Raw::Str(value) => Err(serde::de::Error::custom(format!(
                "SORTABLE must be a boolean or \"UNF\", got {value:?}"
            ))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TextFieldPhonetic {
    #[serde(rename = "dm:en")]
    DmEn,
    #[serde(rename = "dm:fr")]
    DmFr,
    #[serde(rename = "dm:pt")]
    DmPt,
    #[serde(rename = "dm:es")]
    DmEs,
}

impl TextFieldPhonetic {
    pub fn as_str(self) -> &'static str {
        match self {
            TextFieldPhonetic::DmEn => "dm:en",
            TextFieldPhonetic::DmFr => "dm:fr",
            TextFieldPhonetic::DmPt => "dm:pt",
            TextFieldPhonetic::DmEs => "dm:es",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GeoShapeCoordSystem {
    #[serde(rename = "SPHERICAL")]
    Spherical,
    #[serde(rename = "FLAT")]
    Flat,
}

impl GeoShapeCoordSystem {
    pub fn as_str(self) -> &'static str {
        match self {
            GeoShapeCoordSystem::Spherical => "SPHERICAL",
            GeoShapeCoordSystem::Flat => "FLAT",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IndexDataType {
    #[serde(rename = "HASH")]
    Hash,
    #[serde(rename = "JSON")]
    Json,
}

impl IndexDataType {
    pub fn as_str(self) -> &'static str {
        match self {
            IndexDataType::Hash => "HASH",
            IndexDataType::Json => "JSON",
        }
    }
}

/// node-redis `RedisVariadicArgument`: one string or a list, which serialise differently.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum RedisVariadic {
    One(String),
    Many(Vec<String>),
}

impl RedisVariadic {
    fn push_with_length(&self, args: &mut Vec<String>) {
        match self {
            RedisVariadic::One(value) => {
                args.push("1".to_string());
                args.push(value.clone());
            }
            RedisVariadic::Many(values) => {
                args.push(values.len().to_string());
                args.extend(values.iter().cloned());
            }
        }
    }
}

/// The order a JS object literal listed its keys in, which `JSON.stringify` (and so the index
/// hash) follows. Keys not listed come after the listed ones, in the canonical order: `type`
/// first, then the options in the order node-redis reads them, which is how this repo's TS
/// definitions are written. Empty (the default) therefore means canonical order. Parsing JSON
/// records the order it found.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct KeyOrder(pub Vec<String>);

impl KeyOrder {
    fn of(map: &Map<String, Value>) -> KeyOrder {
        KeyOrder(map.keys().cloned().collect())
    }
}

/// One value of a field or options object, borrowed for serialisation.
enum JsonValue<'a> {
    Str(&'a str),
    Bool(bool),
    Number(f64),
    Sortable(Sortable),
    Variadic(&'a RedisVariadic),
}

impl Serialize for JsonValue<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            JsonValue::Str(value) => serializer.serialize_str(value),
            JsonValue::Bool(value) => serializer.serialize_bool(*value),
            JsonValue::Number(value) if value.is_finite() => {
                let raw: Box<RawValue> = RawValue::from_string(number_to_js_string(*value))
                    .map_err(serde::ser::Error::custom)?;
                raw.serialize(serializer)
            }
            JsonValue::Number(_) => serializer.serialize_unit(),
            JsonValue::Sortable(value) => value.serialize(serializer),
            JsonValue::Variadic(value) => value.serialize(serializer),
        }
    }
}

type Entries<'a> = Vec<(&'static str, JsonValue<'a>)>;

fn push_entry<'a, T>(
    entries: &mut Entries<'a>,
    key: &'static str,
    value: &'a Option<T>,
    to_json: fn(&'a T) -> JsonValue<'a>,
) {
    if let Some(value) = value {
        entries.push((key, to_json(value)));
    }
}

fn string(value: &String) -> JsonValue<'_> {
    JsonValue::Str(value)
}

fn boolean(value: &bool) -> JsonValue<'_> {
    JsonValue::Bool(*value)
}

fn number(value: &f64) -> JsonValue<'_> {
    JsonValue::Number(*value)
}

fn sortable(value: &Sortable) -> JsonValue<'_> {
    JsonValue::Sortable(*value)
}

fn variadic(value: &RedisVariadic) -> JsonValue<'_> {
    JsonValue::Variadic(value)
}

fn serialize_ordered<S: Serializer>(
    mut canonical: Entries<'_>,
    order: &KeyOrder,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    let mut map = serializer.serialize_map(Some(canonical.len()))?;
    for key in &order.0 {
        if let Some(at) = canonical
            .iter()
            .position(|(name, _): &(&str, JsonValue)| name == key)
        {
            let (name, value): (&str, JsonValue) = canonical.remove(at);
            map.serialize_entry(name, &value)?;
        }
    }
    for (name, value) in &canonical {
        map.serialize_entry(name, value)?;
    }
    map.end()
}

#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TextField {
    #[serde(rename = "AS", default)]
    pub alias: Option<String>,
    #[serde(rename = "INDEXMISSING", default)]
    pub index_missing: Option<bool>,
    #[serde(rename = "NOSTEM", default)]
    pub no_stem: Option<bool>,
    #[serde(rename = "WEIGHT", default)]
    pub weight: Option<f64>,
    #[serde(rename = "PHONETIC", default)]
    pub phonetic: Option<TextFieldPhonetic>,
    #[serde(rename = "WITHSUFFIXTRIE", default)]
    pub with_suffix_trie: Option<bool>,
    #[serde(rename = "INDEXEMPTY", default)]
    pub index_empty: Option<bool>,
    #[serde(rename = "SORTABLE", default)]
    pub sortable: Option<Sortable>,
    #[serde(rename = "NOINDEX", default)]
    pub no_index: Option<bool>,
    #[serde(skip)]
    pub key_order: KeyOrder,
}

/// The options shared by NUMERIC and GEO fields.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NumericField {
    #[serde(rename = "AS", default)]
    pub alias: Option<String>,
    #[serde(rename = "INDEXMISSING", default)]
    pub index_missing: Option<bool>,
    #[serde(rename = "SORTABLE", default)]
    pub sortable: Option<Sortable>,
    #[serde(rename = "NOINDEX", default)]
    pub no_index: Option<bool>,
    #[serde(skip)]
    pub key_order: KeyOrder,
}

pub type GeoField = NumericField;

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagField {
    #[serde(rename = "AS", default)]
    pub alias: Option<String>,
    #[serde(rename = "INDEXMISSING", default)]
    pub index_missing: Option<bool>,
    #[serde(rename = "SEPARATOR", default)]
    pub separator: Option<String>,
    #[serde(rename = "CASESENSITIVE", default)]
    pub case_sensitive: Option<bool>,
    #[serde(rename = "WITHSUFFIXTRIE", default)]
    pub with_suffix_trie: Option<bool>,
    #[serde(rename = "INDEXEMPTY", default)]
    pub index_empty: Option<bool>,
    #[serde(rename = "SORTABLE", default)]
    pub sortable: Option<Sortable>,
    #[serde(rename = "NOINDEX", default)]
    pub no_index: Option<bool>,
    #[serde(skip)]
    pub key_order: KeyOrder,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GeoShapeField {
    #[serde(rename = "AS", default)]
    pub alias: Option<String>,
    #[serde(rename = "COORD_SYSTEM", default)]
    pub coord_system: Option<GeoShapeCoordSystem>,
    #[serde(rename = "INDEXMISSING", default)]
    pub index_missing: Option<bool>,
    #[serde(skip)]
    pub key_order: KeyOrder,
}

/// A field written as an object, `{ type: SCHEMA_FIELD_TYPE.TAG, ... }`.
#[derive(Debug, Clone, PartialEq)]
pub enum SchemaField {
    Text(TextField),
    Numeric(NumericField),
    Geo(GeoField),
    Tag(TagField),
    GeoShape(GeoShapeField),
}

impl SchemaField {
    pub fn field_type(&self) -> SchemaFieldType {
        match self {
            SchemaField::Text(_) => SchemaFieldType::Text,
            SchemaField::Numeric(_) => SchemaFieldType::Numeric,
            SchemaField::Geo(_) => SchemaFieldType::Geo,
            SchemaField::Tag(_) => SchemaFieldType::Tag,
            SchemaField::GeoShape(_) => SchemaFieldType::GeoShape,
        }
    }

    fn key_order(&self) -> &KeyOrder {
        match self {
            SchemaField::Text(field) => &field.key_order,
            SchemaField::Numeric(field) | SchemaField::Geo(field) => &field.key_order,
            SchemaField::Tag(field) => &field.key_order,
            SchemaField::GeoShape(field) => &field.key_order,
        }
    }

    fn entries(&self) -> Entries<'_> {
        let mut entries: Entries<'_> = vec![("type", JsonValue::Str(self.field_type().as_str()))];
        match self {
            SchemaField::Text(text) => {
                push_entry(&mut entries, "AS", &text.alias, string);
                push_entry(&mut entries, "INDEXMISSING", &text.index_missing, boolean);
                push_entry(&mut entries, "NOSTEM", &text.no_stem, boolean);
                push_entry(&mut entries, "WEIGHT", &text.weight, number);
                if let Some(phonetic) = text.phonetic {
                    entries.push(("PHONETIC", JsonValue::Str(phonetic.as_str())));
                }
                push_entry(
                    &mut entries,
                    "WITHSUFFIXTRIE",
                    &text.with_suffix_trie,
                    boolean,
                );
                push_entry(&mut entries, "INDEXEMPTY", &text.index_empty, boolean);
                push_entry(&mut entries, "SORTABLE", &text.sortable, sortable);
                push_entry(&mut entries, "NOINDEX", &text.no_index, boolean);
            }
            SchemaField::Numeric(numeric) | SchemaField::Geo(numeric) => {
                push_entry(&mut entries, "AS", &numeric.alias, string);
                push_entry(
                    &mut entries,
                    "INDEXMISSING",
                    &numeric.index_missing,
                    boolean,
                );
                push_entry(&mut entries, "SORTABLE", &numeric.sortable, sortable);
                push_entry(&mut entries, "NOINDEX", &numeric.no_index, boolean);
            }
            SchemaField::Tag(tag) => {
                push_entry(&mut entries, "AS", &tag.alias, string);
                push_entry(&mut entries, "INDEXMISSING", &tag.index_missing, boolean);
                push_entry(&mut entries, "SEPARATOR", &tag.separator, string);
                push_entry(&mut entries, "CASESENSITIVE", &tag.case_sensitive, boolean);
                push_entry(
                    &mut entries,
                    "WITHSUFFIXTRIE",
                    &tag.with_suffix_trie,
                    boolean,
                );
                push_entry(&mut entries, "INDEXEMPTY", &tag.index_empty, boolean);
                push_entry(&mut entries, "SORTABLE", &tag.sortable, sortable);
                push_entry(&mut entries, "NOINDEX", &tag.no_index, boolean);
            }
            SchemaField::GeoShape(shape) => {
                push_entry(&mut entries, "AS", &shape.alias, string);
                if let Some(coord_system) = shape.coord_system {
                    entries.push(("COORD_SYSTEM", JsonValue::Str(coord_system.as_str())));
                }
                push_entry(&mut entries, "INDEXMISSING", &shape.index_missing, boolean);
            }
        }
        entries
    }
}

impl Serialize for SchemaField {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serialize_ordered(self.entries(), self.key_order(), serializer)
    }
}

fn from_object<T: serde::de::DeserializeOwned, E: serde::de::Error>(
    object: Map<String, Value>,
) -> Result<T, E> {
    serde_json::from_value(Value::Object(object)).map_err(E::custom)
}

impl<'de> Deserialize<'de> for SchemaField {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<SchemaField, D::Error> {
        let mut object: Map<String, Value> = Map::deserialize(deserializer)?;
        let key_order: KeyOrder = KeyOrder::of(&object);
        let field_type: SchemaFieldType = match object.shift_remove("type") {
            Some(value) => serde_json::from_value(value).map_err(serde::de::Error::custom)?,
            None => return Err(serde::de::Error::missing_field("type")),
        };
        Ok(match field_type {
            SchemaFieldType::Text => SchemaField::Text(TextField {
                key_order,
                ..from_object(object)?
            }),
            SchemaFieldType::Numeric => SchemaField::Numeric(NumericField {
                key_order,
                ..from_object(object)?
            }),
            SchemaFieldType::Geo => SchemaField::Geo(GeoField {
                key_order,
                ..from_object(object)?
            }),
            SchemaFieldType::Tag => SchemaField::Tag(TagField {
                key_order,
                ..from_object(object)?
            }),
            SchemaFieldType::GeoShape => SchemaField::GeoShape(GeoShapeField {
                key_order,
                ..from_object(object)?
            }),
        })
    }
}

/// node-redis `SchemaFieldDefinition`. `Type` is the shorthand `field: SCHEMA_FIELD_TYPE.TAG`,
/// which serialises (and so hashes) differently from `{ type: "TAG" }`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SchemaFieldDefinition {
    Type(SchemaFieldType),
    Field(SchemaField),
}

/// One schema value: a definition, or several to index the same attribute more than once.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SchemaEntry {
    One(SchemaFieldDefinition),
    Many(Vec<SchemaFieldDefinition>),
}

impl From<SchemaFieldDefinition> for SchemaEntry {
    fn from(definition: SchemaFieldDefinition) -> SchemaEntry {
        SchemaEntry::One(definition)
    }
}

impl From<SchemaFieldType> for SchemaEntry {
    fn from(field_type: SchemaFieldType) -> SchemaEntry {
        SchemaEntry::One(SchemaFieldDefinition::Type(field_type))
    }
}

impl From<SchemaField> for SchemaEntry {
    fn from(field: SchemaField) -> SchemaEntry {
        SchemaEntry::One(SchemaFieldDefinition::Field(field))
    }
}

impl From<TextField> for SchemaEntry {
    fn from(field: TextField) -> SchemaEntry {
        SchemaField::Text(field).into()
    }
}

impl From<TagField> for SchemaEntry {
    fn from(field: TagField) -> SchemaEntry {
        SchemaField::Tag(field).into()
    }
}

impl From<GeoShapeField> for SchemaEntry {
    fn from(field: GeoShapeField) -> SchemaEntry {
        SchemaField::GeoShape(field).into()
    }
}

impl From<Vec<SchemaFieldDefinition>> for SchemaEntry {
    fn from(definitions: Vec<SchemaFieldDefinition>) -> SchemaEntry {
        SchemaEntry::Many(definitions)
    }
}

/// node-redis `RediSearchSchema`, with JS object semantics: re-inserting a key replaces its
/// value in place, and array-index keys (`"0"`, `"42"`) come first in ascending order.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct RediSearchSchema {
    entries: Vec<(String, SchemaEntry)>,
}

impl RediSearchSchema {
    pub fn new() -> RediSearchSchema {
        RediSearchSchema::default()
    }

    pub fn insert(&mut self, field: impl Into<String>, entry: impl Into<SchemaEntry>) {
        let field: String = field.into();
        let entry: SchemaEntry = entry.into();
        match self
            .entries
            .iter_mut()
            .find(|(name, _): &&mut (String, SchemaEntry)| *name == field)
        {
            Some(existing) => existing.1 = entry,
            None => self.entries.push((field, entry)),
        }
    }

    pub fn with(mut self, field: impl Into<String>, entry: impl Into<SchemaEntry>) -> Self {
        self.insert(field, entry);
        self
    }

    /// `{ ...this, ...other }`.
    pub fn extend(&mut self, other: &RediSearchSchema) {
        for (field, entry) in &other.entries {
            self.insert(field.clone(), entry.clone());
        }
    }

    pub fn get(&self, field: &str) -> Option<&SchemaEntry> {
        self.entries
            .iter()
            .find(|(name, _): &&(String, SchemaEntry)| name == field)
            .map(|(_, entry): &(String, SchemaEntry)| entry)
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// `Object.entries(schema)`.
    pub fn entries(&self) -> Vec<(&str, &SchemaEntry)> {
        let mut indexed: Vec<(u32, &str, &SchemaEntry)> = Vec::new();
        let mut named: Vec<(&str, &SchemaEntry)> = Vec::new();
        for (field, entry) in &self.entries {
            match field.parse::<u32>() {
                Ok(position) if is_array_index(field) => indexed.push((position, field, entry)),
                _ => named.push((field, entry)),
            }
        }
        indexed.sort_by_key(|(position, _, _): &(u32, &str, &SchemaEntry)| *position);
        indexed
            .into_iter()
            .map(|(_, field, entry): (u32, &str, &SchemaEntry)| (field, entry))
            .chain(named)
            .collect()
    }
}

impl Serialize for RediSearchSchema {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let entries: Vec<(&str, &SchemaEntry)> = self.entries();
        let mut map = serializer.serialize_map(Some(entries.len()))?;
        for (field, entry) in entries {
            map.serialize_entry(field, entry)?;
        }
        map.end()
    }
}

impl<'de> Deserialize<'de> for RediSearchSchema {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<RediSearchSchema, D::Error> {
        struct SchemaVisitor;

        impl<'de> Visitor<'de> for SchemaVisitor {
            type Value = RediSearchSchema;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a RediSearch schema object")
            }

            fn visit_map<A: MapAccess<'de>>(
                self,
                mut access: A,
            ) -> Result<RediSearchSchema, A::Error> {
                let mut schema: RediSearchSchema = RediSearchSchema::new();
                while let Some((field, entry)) = access.next_entry::<String, SchemaEntry>()? {
                    schema.insert(field, entry);
                }
                Ok(schema)
            }
        }

        deserializer.deserialize_map(SchemaVisitor)
    }
}

/// node-redis `CreateOptions` for `FT.CREATE`.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateOptions {
    #[serde(rename = "ON", default)]
    pub on: Option<IndexDataType>,
    #[serde(rename = "PREFIX", default)]
    pub prefix: Option<RedisVariadic>,
    #[serde(rename = "FILTER", default)]
    pub filter: Option<String>,
    #[serde(rename = "LANGUAGE", default)]
    pub language: Option<String>,
    #[serde(rename = "LANGUAGE_FIELD", default)]
    pub language_field: Option<String>,
    #[serde(rename = "SCORE", default)]
    pub score: Option<f64>,
    #[serde(rename = "SCORE_FIELD", default)]
    pub score_field: Option<String>,
    #[serde(rename = "MAXTEXTFIELDS", default)]
    pub max_text_fields: Option<bool>,
    #[serde(rename = "TEMPORARY", default)]
    pub temporary: Option<f64>,
    #[serde(rename = "NOOFFSETS", default)]
    pub no_offsets: Option<bool>,
    #[serde(rename = "NOHL", default)]
    pub no_hl: Option<bool>,
    #[serde(rename = "NOFIELDS", default)]
    pub no_fields: Option<bool>,
    #[serde(rename = "NOFREQS", default)]
    pub no_freqs: Option<bool>,
    #[serde(rename = "SKIPINITIALSCAN", default)]
    pub skip_initial_scan: Option<bool>,
    #[serde(rename = "STOPWORDS", default)]
    pub stopwords: Option<RedisVariadic>,
    #[serde(skip)]
    pub key_order: KeyOrder,
}

impl CreateOptions {
    fn entries(&self) -> Entries<'_> {
        let mut entries: Entries<'_> = Vec::new();
        if let Some(on) = self.on {
            entries.push(("ON", JsonValue::Str(on.as_str())));
        }
        push_entry(&mut entries, "PREFIX", &self.prefix, variadic);
        push_entry(&mut entries, "FILTER", &self.filter, string);
        push_entry(&mut entries, "LANGUAGE", &self.language, string);
        push_entry(&mut entries, "LANGUAGE_FIELD", &self.language_field, string);
        push_entry(&mut entries, "SCORE", &self.score, number);
        push_entry(&mut entries, "SCORE_FIELD", &self.score_field, string);
        push_entry(
            &mut entries,
            "MAXTEXTFIELDS",
            &self.max_text_fields,
            boolean,
        );
        push_entry(&mut entries, "TEMPORARY", &self.temporary, number);
        push_entry(&mut entries, "NOOFFSETS", &self.no_offsets, boolean);
        push_entry(&mut entries, "NOHL", &self.no_hl, boolean);
        push_entry(&mut entries, "NOFIELDS", &self.no_fields, boolean);
        push_entry(&mut entries, "NOFREQS", &self.no_freqs, boolean);
        push_entry(
            &mut entries,
            "SKIPINITIALSCAN",
            &self.skip_initial_scan,
            boolean,
        );
        push_entry(&mut entries, "STOPWORDS", &self.stopwords, variadic);
        entries
    }
}

impl Serialize for CreateOptions {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serialize_ordered(self.entries(), &self.key_order, serializer)
    }
}

/// The TS `RedisIndex`. Field order matters: it is the key order of the hashed JSON.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RedisIndex {
    pub name: String,
    pub schema: RediSearchSchema,
    pub options: CreateOptions,
}

impl<'de> Deserialize<'de> for RedisIndex {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<RedisIndex, D::Error> {
        #[derive(Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Raw {
            name: String,
            schema: RediSearchSchema,
            options: Map<String, Value>,
        }
        let raw: Raw = Raw::deserialize(deserializer)?;
        let key_order: KeyOrder = KeyOrder::of(&raw.options);
        Ok(RedisIndex {
            name: raw.name,
            schema: raw.schema,
            options: CreateOptions {
                key_order,
                ..from_object(raw.options)?
            },
        })
    }
}

impl RedisIndex {
    /// `JSON.stringify(index)`.
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).expect("a RedisIndex always serialises to JSON")
    }
}

/// `createIndexHash`: the hex sha256 of `JSON.stringify(index)` kept in `_index_hashes`.
pub fn create_index_hash(index: &RedisIndex) -> String {
    hex::encode(Sha256::digest(index.to_json().as_bytes()))
}

fn is_true(flag: Option<bool>) -> bool {
    flag == Some(true)
}

fn non_empty(value: &Option<String>) -> Option<&str> {
    value.as_deref().filter(|value: &&str| !value.is_empty())
}

fn push_common(args: &mut Vec<String>, sortable: Option<Sortable>, no_index: Option<bool>) {
    match sortable {
        Some(Sortable::Bool(true)) => args.push("SORTABLE".to_string()),
        Some(Sortable::Unf) => {
            args.push("SORTABLE".to_string());
            args.push("UNF".to_string());
        }
        Some(Sortable::Bool(false)) | None => {}
    }
    push_flag(args, no_index, "NOINDEX");
}

fn push_flag(args: &mut Vec<String>, flag: Option<bool>, name: &str) {
    if is_true(flag) {
        args.push(name.to_string());
    }
}

fn push_option(args: &mut Vec<String>, name: &str, value: Option<&str>) {
    if let Some(value) = value {
        args.push(name.to_string());
        args.push(value.to_string());
    }
}

fn push_field(args: &mut Vec<String>, field: &SchemaField) {
    let alias: &Option<String> = match field {
        SchemaField::Text(text) => &text.alias,
        SchemaField::Numeric(numeric) | SchemaField::Geo(numeric) => &numeric.alias,
        SchemaField::Tag(tag) => &tag.alias,
        SchemaField::GeoShape(shape) => &shape.alias,
    };
    push_option(args, "AS", non_empty(alias));
    args.push(field.field_type().as_str().to_string());
    match field {
        SchemaField::Text(text) => {
            push_flag(args, text.index_missing, "INDEXMISSING");
            push_flag(args, text.no_stem, "NOSTEM");
            let weight: Option<String> = text.weight.map(number_to_js_string);
            push_option(args, "WEIGHT", weight.as_deref());
            push_option(
                args,
                "PHONETIC",
                text.phonetic.map(TextFieldPhonetic::as_str),
            );
            push_flag(args, text.with_suffix_trie, "WITHSUFFIXTRIE");
            push_flag(args, text.index_empty, "INDEXEMPTY");
            push_common(args, text.sortable, text.no_index);
        }
        SchemaField::Numeric(numeric) | SchemaField::Geo(numeric) => {
            push_flag(args, numeric.index_missing, "INDEXMISSING");
            push_common(args, numeric.sortable, numeric.no_index);
        }
        SchemaField::Tag(tag) => {
            push_flag(args, tag.index_missing, "INDEXMISSING");
            push_option(args, "SEPARATOR", non_empty(&tag.separator));
            push_flag(args, tag.case_sensitive, "CASESENSITIVE");
            push_flag(args, tag.with_suffix_trie, "WITHSUFFIXTRIE");
            push_flag(args, tag.index_empty, "INDEXEMPTY");
            push_common(args, tag.sortable, tag.no_index);
        }
        SchemaField::GeoShape(shape) => {
            push_option(
                args,
                "COORD_SYSTEM",
                shape.coord_system.map(GeoShapeCoordSystem::as_str),
            );
            push_flag(args, shape.index_missing, "INDEXMISSING");
        }
    }
}

/// node-redis `parseSchema`.
fn push_schema(args: &mut Vec<String>, schema: &RediSearchSchema) {
    for (field, entry) in schema.entries() {
        let definitions: &[SchemaFieldDefinition] = match entry {
            SchemaEntry::One(definition) => std::slice::from_ref(definition),
            SchemaEntry::Many(definitions) => definitions,
        };
        for definition in definitions {
            args.push(field.to_string());
            match definition {
                SchemaFieldDefinition::Type(field_type) => {
                    args.push(field_type.as_str().to_string())
                }
                SchemaFieldDefinition::Field(schema_field) => push_field(args, schema_field),
            }
        }
    }
}

/// The `FT.CREATE` arguments node-redis sends for `client.ft.create(name, schema, options)`.
pub fn create_index_args(index: &RedisIndex) -> Vec<String> {
    let options: &CreateOptions = &index.options;
    let mut args: Vec<String> = vec!["FT.CREATE".to_string(), index.name.clone()];
    push_option(&mut args, "ON", options.on.map(IndexDataType::as_str));
    if let Some(prefix) = &options.prefix {
        args.push("PREFIX".to_string());
        prefix.push_with_length(&mut args);
    }
    push_option(&mut args, "FILTER", non_empty(&options.filter));
    push_option(&mut args, "LANGUAGE", non_empty(&options.language));
    push_option(
        &mut args,
        "LANGUAGE_FIELD",
        non_empty(&options.language_field),
    );
    let score: Option<String> = options.score.map(number_to_js_string);
    push_option(&mut args, "SCORE", score.as_deref());
    push_option(&mut args, "SCORE_FIELD", non_empty(&options.score_field));
    push_flag(&mut args, options.max_text_fields, "MAXTEXTFIELDS");
    let temporary: Option<String> = options
        .temporary
        .filter(|temporary: &f64| *temporary != 0.0 && !temporary.is_nan())
        .map(number_to_js_string);
    push_option(&mut args, "TEMPORARY", temporary.as_deref());
    push_flag(&mut args, options.no_offsets, "NOOFFSETS");
    push_flag(&mut args, options.no_hl, "NOHL");
    push_flag(&mut args, options.no_fields, "NOFIELDS");
    push_flag(&mut args, options.no_freqs, "NOFREQS");
    push_flag(&mut args, options.skip_initial_scan, "SKIPINITIALSCAN");
    if let Some(stopwords) = &options.stopwords {
        args.push("STOPWORDS".to_string());
        stopwords.push_with_length(&mut args);
    }
    args.push("SCHEMA".to_string());
    push_schema(&mut args, &index.schema);
    args
}
