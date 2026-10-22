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

//! The `cron` package's `CronTime` (3.1.7), which times the schedulers: its parsing, presets
//! and aliases, its fix-up of days a month cannot have, and its search for the next firing
//! time, quirks included. In UTC only, where its daylight-saving branches never run.

use std::collections::BTreeSet;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CronError(pub String);

impl std::fmt::Display for CronError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for CronError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Unit {
    Second,
    Minute,
    Hour,
    DayOfMonth,
    Month,
    DayOfWeek,
}

impl Unit {
    const ALL: [Unit; 6] = [Unit::Second, Unit::Minute, Unit::Hour, Unit::DayOfMonth, Unit::Month, Unit::DayOfWeek];

    fn name(self) -> &'static str {
        match self {
            Unit::Second => "second",
            Unit::Minute => "minute",
            Unit::Hour => "hour",
            Unit::DayOfMonth => "dayOfMonth",
            Unit::Month => "month",
            Unit::DayOfWeek => "dayOfWeek",
        }
    }

    /// `CONSTRAINTS`.
    fn constraints(self) -> (i64, i64) {
        match self {
            Unit::Second | Unit::Minute => (0, 59),
            Unit::Hour => (0, 23),
            Unit::DayOfMonth => (1, 31),
            Unit::Month => (1, 12),
            Unit::DayOfWeek => (0, 7),
        }
    }

    /// `PARSE_DEFAULTS`.
    fn default(self) -> &'static str {
        match self {
            Unit::Second => "0",
            _ => "*",
        }
    }
}

const PRESETS: [(&str, &str); 9] = [
    ("@yearly", "0 0 0 1 1 *"),
    ("@monthly", "0 0 0 1 * *"),
    ("@weekly", "0 0 0 * * 0"),
    ("@daily", "0 0 0 * * *"),
    ("@hourly", "0 0 * * * *"),
    ("@minutely", "0 * * * * *"),
    ("@secondly", "* * * * * *"),
    ("@weekdays", "0 0 0 * * 1-5"),
    ("@weekends", "0 0 0 * * 0,6"),
];

const ALIASES: [(&str, i64); 19] = [
    ("jan", 1),
    ("feb", 2),
    ("mar", 3),
    ("apr", 4),
    ("may", 5),
    ("jun", 6),
    ("jul", 7),
    ("aug", 8),
    ("sep", 9),
    ("oct", 10),
    ("nov", 11),
    ("dec", 12),
    ("sun", 0),
    ("mon", 1),
    ("tue", 2),
    ("wed", 3),
    ("thu", 4),
    ("fri", 5),
    ("sat", 6),
];

/// `MONTH_CONSTRAINTS`.
fn month_days(month: i64) -> i64 {
    match month {
        2 => 29,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CronTime {
    source: String,
    second: BTreeSet<i64>,
    minute: BTreeSet<i64>,
    hour: BTreeSet<i64>,
    day_of_month: BTreeSet<i64>,
    month: BTreeSet<i64>,
    day_of_week: BTreeSet<i64>,
}

/// `.replace(/[a-z]{1,3}/gi, alias)`: each run of letters, three at a time.
fn replace_aliases(source: &str) -> Result<String, CronError> {
    let mut out: String = String::new();
    let chars: Vec<char> = source.chars().collect();
    let mut at: usize = 0;
    while at < chars.len() {
        if !chars[at].is_ascii_alphabetic() {
            out.push(chars[at]);
            at += 1;
            continue;
        }
        let end: usize = (at..chars.len().min(at + 3)).take_while(|index| chars[*index].is_ascii_alphabetic()).last().map_or(at, |last| last + 1);
        let alias: String = chars[at..end].iter().collect();
        match ALIASES.iter().find(|(name, _)| *name == alias) {
            Some((_, value)) => out.push_str(&value.to_string()),
            None => return Err(CronError(format!("Unknown alias: {alias}"))),
        }
        at = end;
    }
    Ok(out)
}

/// `RE_RANGE`: `lower[-upper][/step]`, digits only.
fn range_parts(range: &str) -> Option<(&str, Option<&str>, Option<&str>)> {
    let (range, step) = match range.split_once('/') {
        Some((range, step)) => (range, Some(step)),
        None => (range, None),
    };
    let (lower, upper) = match range.split_once('-') {
        Some((lower, upper)) => (lower, Some(upper)),
        None => (range, None),
    };
    let digits = |text: &str| !text.is_empty() && text.bytes().all(|byte| byte.is_ascii_digit());
    (digits(lower) && upper.is_none_or(digits) && step.is_none_or(digits)).then_some((lower, upper, step))
}

/// `parseInt(digits, 10)`, saturating where the JS value would be out of every range anyway.
fn parse_digits(digits: &str) -> i64 {
    digits.parse::<i64>().unwrap_or(i64::MAX)
}

impl CronTime {
    /// `new CronTime(source, "UTC")`.
    pub fn parse(source: &str) -> Result<CronTime, CronError> {
        let mut time: CronTime = CronTime {
            source: source.to_string(),
            second: BTreeSet::new(),
            minute: BTreeSet::new(),
            hour: BTreeSet::new(),
            day_of_month: BTreeSet::new(),
            month: BTreeSet::new(),
            day_of_week: BTreeSet::new(),
        };
        let lower: String = source.to_lowercase();
        let expanded: &str = PRESETS.iter().find(|(name, _)| *name == lower).map_or(lower.as_str(), |(_, expression)| expression);
        let replaced: String = replace_aliases(expanded)?;
        let units: Vec<&str> = replaced.trim().split(|c: char| c.is_whitespace()).filter(|part| !part.is_empty()).collect();
        let units: Vec<&str> = if units.is_empty() { vec![""] } else { units };
        if units.len() < Unit::ALL.len() - 1 {
            return Err(CronError("Too few fields".to_string()));
        }
        if units.len() > Unit::ALL.len() {
            return Err(CronError("Too many fields".to_string()));
        }
        let offset: usize = Unit::ALL.len() - units.len();
        for (index, unit) in Unit::ALL.into_iter().enumerate() {
            let value: &str = index.checked_sub(offset).and_then(|at| units.get(at)).copied().unwrap_or(unit.default());
            time.parse_field(value, unit)?;
        }
        time.verify_parse();
        Ok(time)
    }

    fn set(&mut self, unit: Unit) -> &mut BTreeSet<i64> {
        match unit {
            Unit::Second => &mut self.second,
            Unit::Minute => &mut self.minute,
            Unit::Hour => &mut self.hour,
            Unit::DayOfMonth => &mut self.day_of_month,
            Unit::Month => &mut self.month,
            Unit::DayOfWeek => &mut self.day_of_week,
        }
    }

    fn get(&self, unit: Unit) -> &BTreeSet<i64> {
        match unit {
            Unit::Second => &self.second,
            Unit::Minute => &self.minute,
            Unit::Hour => &self.hour,
            Unit::DayOfMonth => &self.day_of_month,
            Unit::Month => &self.month,
            Unit::DayOfWeek => &self.day_of_week,
        }
    }

    /// `_parseField`.
    fn parse_field(&mut self, value: &str, unit: Unit) -> Result<(), CronError> {
        let (low, high) = unit.constraints();
        for field in value.split(',') {
            if field.find('*').is_some_and(|index| index != 0) {
                return Err(CronError(format!("Field ({field}) has an invalid wildcard expression")));
            }
        }
        let value: String = value.replace('*', &format!("{low}-{high}"));
        for range in value.split(',') {
            let Some((lower, upper, step)) = range_parts(range) else {
                return Err(CronError(format!("Field ({}) cannot be parsed", unit.name())));
            };
            let lower: i64 = parse_digits(lower);
            let upper: Option<i64> = upper.map(parse_digits);
            let step_defined: bool = step.is_some();
            let step: i64 = step.map_or(1, parse_digits);
            if step == 0 {
                return Err(CronError(format!("Field ({}) has a step of zero", unit.name())));
            }
            if upper.is_some_and(|upper| lower > upper) {
                return Err(CronError(format!("Field ({}) has an invalid range", unit.name())));
            }
            if lower < low || upper.is_some_and(|upper| upper > high) || (upper.is_none() && lower > high) {
                return Err(CronError(format!("Field value ({value}) is out of range")));
            }
            let lower: i64 = lower.clamp(low, high);
            let upper: i64 = match upper {
                Some(upper) => upper.min(high),
                None if step_defined => high,
                None => lower,
            };
            let set: &mut BTreeSet<i64> = self.set(unit);
            let mut pointer: i64 = lower;
            loop {
                set.insert(pointer);
                pointer = pointer.saturating_add(step);
                if pointer > upper {
                    break;
                }
            }
            if unit == Unit::DayOfWeek {
                if !set.contains(&0) && set.contains(&7) {
                    set.insert(0);
                }
                set.remove(&7);
            }
        }
        Ok(())
    }

    /// `_verifyParse`: days of the month no listed month has are folded back into it. Its
    /// `isOk` is never reset between months, as in the package.
    fn verify_parse(&mut self) {
        let mut ok: bool = false;
        let mut last_wrong_month: Option<i64> = None;
        for month in self.month.clone() {
            let days: i64 = month_days(month);
            if self.day_of_month.iter().any(|day| *day <= days) {
                ok = true;
            }
            if !ok {
                last_wrong_month = Some(month);
            }
        }
        if let (false, Some(month)) = (ok, last_wrong_month) {
            let days: i64 = month_days(month);
            for day in self.day_of_month.clone() {
                if day > days {
                    self.day_of_month.remove(&day);
                    self.day_of_month.insert(day % days);
                }
            }
        }
    }

    /// `_hasAll`: every value from the lowest up to, not including, the highest (the day of
    /// the week's highest being 6).
    fn has_all(&self, unit: Unit) -> bool {
        let (low, high) = unit.constraints();
        let high: i64 = if unit == Unit::DayOfWeek { high - 1 } else { high };
        (low..high).all(|value| self.get(unit).contains(&value))
    }

    /// `toString`.
    pub fn to_expression(&self) -> String {
        Unit::ALL
            .iter()
            .map(|unit| {
                if self.has_all(*unit) {
                    "*".to_string()
                } else {
                    self.get(*unit).iter().map(i64::to_string).collect::<Vec<String>>().join(",")
                }
            })
            .collect::<Vec<String>>()
            .join(" ")
    }

    fn all(&self, unit: Unit, count: usize) -> bool {
        self.get(unit).len() == count
    }

    /// `getNextDateFrom(start, "UTC")`, in epoch milliseconds; `now` bounds the search to
    /// eight years ahead, as the package bounds it by the clock.
    pub fn next_date_from(&self, start: i64, now: i64) -> Result<i64, CronError> {
        let first: i64 = start;
        let mut date: Civil = Civil::of(start);
        if date.millisecond > 0 {
            date.millisecond = 0;
            date.second += 1;
            date = Civil::of(date.millis());
        }
        let max_match: i64 = Civil::of(now).plus_years(8);
        loop {
            let diff: i64 = date.millis() - start;
            if date.millis() > max_match {
                return Err(CronError(format!("Something went wrong. No execution date was found in the next 8 years.\n\t\t\t\t\t\t\tPlease provide the following string if you would like to help debug:\n\t\t\t\t\t\t\tTime Zone: UTC - Cron String: {} - UTC offset: 0", self.source)));
            }
            if !self.month.contains(&date.month) && !self.all(Unit::Month, 12) {
                date = Civil::of(date.plus_months(1));
                date = date.with(|c| {
                    c.day = 1;
                    c.hour = 0;
                    c.minute = 0;
                    c.second = 0;
                });
                continue;
            }
            let weekday: i64 = date.weekday();
            let day_listed: bool = self.day_of_month.contains(&date.day) && !self.all(Unit::DayOfMonth, 31);
            let weekday_listed: bool = self.day_of_week.contains(&weekday) && !self.all(Unit::DayOfWeek, 7);
            if !self.day_of_month.contains(&date.day) && !self.all(Unit::DayOfMonth, 31) && !weekday_listed {
                date = Civil::of(date.millis() + DAY_MS).with(|c| {
                    c.hour = 0;
                    c.minute = 0;
                    c.second = 0;
                });
                continue;
            }
            if !self.day_of_week.contains(&weekday) && !self.all(Unit::DayOfWeek, 7) && !day_listed {
                date = Civil::of(date.millis() + DAY_MS).with(|c| {
                    c.hour = 0;
                    c.minute = 0;
                    c.second = 0;
                });
                continue;
            }
            if !self.hour.contains(&date.hour) && !self.all(Unit::Hour, 24) {
                let expected_hour: i64 = if date.hour == 23 && diff > DAY_MS { 0 } else { date.hour + 1 };
                date = date.with(|c| c.hour = expected_hour).with(|c| {
                    c.minute = 0;
                    c.second = 0;
                });
                continue;
            }
            if !self.minute.contains(&date.minute) && !self.all(Unit::Minute, 60) {
                let expected_minute: i64 = if date.minute == 59 && diff > 3_600_000 { 0 } else { date.minute + 1 };
                date = date.with(|c| c.minute = expected_minute).with(|c| c.second = 0);
                continue;
            }
            if !self.second.contains(&date.second) && !self.all(Unit::Second, 60) {
                let expected_second: i64 = if date.second == 59 && diff > 60_000 { 0 } else { date.second + 1 };
                date = date.with(|c| c.second = expected_second);
                continue;
            }
            if date.millis() == first {
                let next_second: i64 = date.second + 1;
                date = date.with(|c| c.second = next_second);
                continue;
            }
            return Ok(date.millis());
        }
    }
}

const DAY_MS: i64 = 86_400_000;

/// A UTC date and time, as luxon holds one; setting a field out of its range carries over, as
/// `Date.UTC` does.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Civil {
    year: i64,
    month: i64,
    day: i64,
    hour: i64,
    minute: i64,
    second: i64,
    millisecond: i64,
}

/// Days from 1970-01-01 to the civil date (Howard Hinnant's algorithm).
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year: i64 = if month <= 2 { year - 1 } else { year };
    let era: i64 = year.div_euclid(400);
    let year_of_era: i64 = year - era * 400;
    let month_index: i64 = (month + 9) % 12;
    let day_of_year: i64 = (153 * month_index + 2) / 5 + day - 1;
    let day_of_era: i64 = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days: i64 = days + 719_468;
    let era: i64 = days.div_euclid(146_097);
    let day_of_era: i64 = days - era * 146_097;
    let year_of_era: i64 = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year: i64 = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index: i64 = (5 * day_of_year + 2) / 153;
    let day: i64 = day_of_year - (153 * month_index + 2) / 5 + 1;
    let month: i64 = if month_index < 10 { month_index + 3 } else { month_index - 9 };
    (year_of_era + era * 400 + i64::from(month <= 2), month, day)
}

fn days_in_month(year: i64, month: i64) -> i64 {
    days_from_civil(year + i64::from(month == 12), if month == 12 { 1 } else { month + 1 }, 1) - days_from_civil(year, month, 1)
}

impl Civil {
    fn of(millis: i64) -> Civil {
        let days: i64 = millis.div_euclid(DAY_MS);
        let rest: i64 = millis.rem_euclid(DAY_MS);
        let (year, month, day) = civil_from_days(days);
        Civil {
            year,
            month,
            day,
            hour: rest / 3_600_000,
            minute: rest / 60_000 % 60,
            second: rest / 1000 % 60,
            millisecond: rest % 1000,
        }
    }

    /// `Date.UTC(year, month - 1, day, hour, minute, second, millisecond)`.
    fn millis(&self) -> i64 {
        let month_index: i64 = self.month - 1;
        let year: i64 = self.year + month_index.div_euclid(12);
        let month: i64 = month_index.rem_euclid(12) + 1;
        let days: i64 = days_from_civil(year, month, 1) + self.day - 1;
        days * DAY_MS + self.hour * 3_600_000 + self.minute * 60_000 + self.second * 1000 + self.millisecond
    }

    /// luxon's `set`: the fields changed, the day kept within its month when it was not one of
    /// them, and the result normalised.
    fn with(self, change: impl FnOnce(&mut Civil)) -> Civil {
        let mut changed: Civil = self;
        change(&mut changed);
        Civil::of(changed.millis())
    }

    fn plus_months(&self, months: i64) -> i64 {
        let month_index: i64 = self.month - 1 + months;
        let year: i64 = self.year + month_index.div_euclid(12);
        let month: i64 = month_index.rem_euclid(12) + 1;
        Civil { year, month, day: self.day.min(days_in_month(year, month)), ..*self }.millis()
    }

    fn plus_years(&self, years: i64) -> i64 {
        let year: i64 = self.year + years;
        Civil { year, day: self.day.min(days_in_month(year, self.month)), ..*self }.millis()
    }

    /// `_getWeekDay`: Sunday is 0.
    fn weekday(&self) -> i64 {
        (days_from_civil(self.year, self.month, self.day) + 4).rem_euclid(7)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    const VECTORS: &str = include_str!("../equivalence/cron-vectors.json");

    fn iso(millis: i64) -> String {
        prosopo_logger::iso_timestamp(millis)
    }

    fn millis(text: &str) -> i64 {
        let civil = |from: usize, to: usize| text[from..to].parse::<i64>().expect("digits");
        Civil { year: civil(0, 4), month: civil(5, 7), day: civil(8, 10), hour: civil(11, 13), minute: civil(14, 16), second: civil(17, 19), millisecond: civil(20, 23) }.millis()
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
