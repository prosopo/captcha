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

//! utils/honeypot: the question a site's honeypot puts in the `x-prosopo-meta` header, and the
//! phrase bank it falls back to.

use base64::Engine;
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::settings::EncodingType;
use serde_json::{json, Value};
use std::sync::Mutex;

/// `HONEYPOT_HEADER`.
pub const HONEYPOT_HEADER: &str = "x-prosopo-meta";

const DEFAULT_PHRASE_BANK_PATH: &str = "/app/data/honeypot-phrases.json";

const MORSE: [(char, &str); 36] = [
    ('a', ".-"), ('b', "-..."), ('c', "-.-."), ('d', "-.."), ('e', "."), ('f', "..-."), ('g', "--."), ('h', "...."), ('i', ".."), ('j', ".---"),
    ('k', "-.-"), ('l', ".-.."), ('m', "--"), ('n', "-."), ('o', "---"), ('p', ".--."), ('q', "--.-"), ('r', ".-."), ('s', "..."), ('t', "-"),
    ('u', "..-"), ('v', "...-"), ('w', ".--"), ('x', "-..-"), ('y', "-.--"), ('z', "--.."), ('0', "-----"), ('1', ".----"), ('2', "..---"),
    ('3', "...--"), ('4', "....-"), ('5', "....."), ('6', "-...."), ('7', "--..."), ('8', "---.."), ('9', "----."),
];

const SEMAPHORE: [(char, &str); 26] = [
    ('a', "↙↓"), ('b', "←↓"), ('c', "↖↓"), ('d', "↑↓"), ('e', "↓↘"), ('f', "↓→"), ('g', "↓↗"), ('h', "↙←"), ('i', "↙↖"), ('j', "↓↑"),
    ('k', "↑←"), ('l', "↗←"), ('m', "←↖"), ('n', "←↑"), ('o', "↖↑"), ('p', "↑↗"), ('q', "↗→"), ('r', "→↘"), ('s', "↘↓"), ('t', "↓↙"),
    ('u', "↘↗"), ('v', "→↑"), ('w', "↘↑"), ('x', "↙↗"), ('y', "→↗"), ('z', "↘→"),
];

/// JS `\s`.
pub fn is_js_whitespace(c: char) -> bool {
    matches!(c, '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
        || ('\u{2000}'..='\u{200a}').contains(&c)
}

fn encode(text: &str, table: &[(char, &str)]) -> String {
    let lowered: String = text.to_lowercase();
    lowered
        .split(is_js_whitespace)
        .filter(|word| !word.is_empty())
        .map(|word| word.chars().filter_map(|c| table.iter().find(|(key, _)| *key == c).map(|(_, code)| *code)).collect::<Vec<&str>>().join(" "))
        .filter(|word| !word.is_empty())
        .collect::<Vec<String>>()
        .join(" / ")
}

/// `encodeHoneypotQuestion`: the question in Morse or semaphore, base64 of its UTF-8.
pub fn encode_honeypot_question(text: &str, encoding: Option<EncodingType>) -> String {
    let encoded: String = if encoding == Some(EncodingType::Morse) { encode(text, &MORSE) } else { encode(text, &SEMAPHORE) };
    base64::engine::general_purpose::STANDARD.encode(encoded.as_bytes())
}

/// phraseBank.ts: phrases read once from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH`, one drawn per use.
#[derive(Default)]
pub struct PhraseBank(Mutex<Option<Vec<String>>>);

impl PhraseBank {
    fn load(path: &str, logger: &Logger) -> Vec<String> {
        let parsed: Result<Value, String> = std::fs::read_to_string(path).map_err(|error| error.to_string()).and_then(|raw| serde_json::from_str(&raw).map_err(|error| error.to_string()));
        match parsed {
            Ok(Value::Object(fields)) if fields.get("phrases").is_some_and(Value::is_array) => {
                let phrases: Vec<String> = fields["phrases"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .filter(|phrase| !phrase.trim_matches(is_js_whitespace).is_empty())
                    .map(str::to_string)
                    .collect();
                logger.info(|| LogRecord::msg("Loaded honeypot phrase bank").with_data(json!({ "path": path, "count": phrases.len() })));
                phrases
            }
            Ok(_) => {
                logger.warn(|| LogRecord::msg("Honeypot phrase bank missing `phrases` array").with_data(json!({ "path": path })));
                Vec::new()
            }
            Err(error) => {
                logger.warn(|| LogRecord::msg("Failed to load honeypot phrase bank — fallback questions disabled").with_data(json!({ "path": path, "err": error })));
                Vec::new()
            }
        }
    }

    /// `getRandomPhrase`: a phrase from the bank, loaded on first use, or none when it is empty.
    pub fn random_phrase(&self, path: Option<&str>, random: f64, logger: &Logger) -> Option<String> {
        let mut cached = self.0.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let phrases: &Vec<String> = cached.get_or_insert_with(|| PhraseBank::load(path.unwrap_or(DEFAULT_PHRASE_BANK_PATH), logger));
        if phrases.is_empty() {
            return None;
        }
        phrases.get((random * phrases.len() as f64).floor() as usize).cloned()
    }
}

/// `attachHoneypot`: the header's value for a site with its honeypot on, if there is a question.
pub fn honeypot_header(settings: Option<&Value>, bank: &PhraseBank, bank_path: Option<&str>, random: f64, logger: &Logger) -> Option<String> {
    let config: &Value = settings?.get("honeypot")?;
    if config.get("enabled").and_then(Value::as_bool) != Some(true) {
        return None;
    }
    let question: String = match config.get("question").and_then(Value::as_str) {
        Some(question) => question.to_string(),
        None => bank.random_phrase(bank_path, random, logger)?,
    };
    let encoding: Option<EncodingType> = config.get("encodingType").and_then(|value| serde_json::from_value(value.clone()).ok());
    Some(encode_honeypot_question(&question, encoding))
}
