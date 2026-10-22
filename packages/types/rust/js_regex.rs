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

//! Whether `new RegExp(pattern, flags)` throws, for flags without `u` or `v`: the
//! ECMAScript grammar with its Annex B extensions, as V8 13.6 (Node 24) implements it, which
//! includes regexp modifiers and duplicate named groups across alternatives. No
//! regex engine is involved; regress, the JS engine used elsewhere, accepts a few patterns
//! V8 rejects (`\b*`, astral ranges written as surrogate pairs, `\u{…}` without `u`).

/// A non-unicode pattern is a sequence of UTF-16 code units.
struct Parser {
    units: Vec<u16>,
    at: usize,
    /// `[+NamedCaptureGroups]`: the pattern has a group name somewhere, which makes `\k`
    /// strict.
    named: bool,
    /// Every group name, for checking `\k` references.
    names: Vec<Vec<u16>>,
    /// The names a new group could both participate in a match with. Alternatives of one
    /// disjunction never do, so a name may repeat across them (ES2025 duplicate named groups).
    in_scope: Vec<Vec<u16>>,
    references: Vec<Vec<u16>>,
}

type Parsed<T> = Result<T, ()>;

const fn unit(c: char) -> u16 {
    c as u16
}

fn is_digit(unit: u16) -> bool {
    (u16::from(b'0')..=u16::from(b'9')).contains(&unit)
}

fn is_octal(unit: u16) -> bool {
    (u16::from(b'0')..=u16::from(b'7')).contains(&unit)
}

fn is_hex(unit: u16) -> bool {
    char::from_u32(u32::from(unit)).is_some_and(|c| c.is_ascii_hexdigit())
}

fn is_ascii_letter(unit: u16) -> bool {
    char::from_u32(u32::from(unit)).is_some_and(|c| c.is_ascii_alphabetic())
}

impl Parser {
    fn peek(&self) -> Option<u16> {
        self.units.get(self.at).copied()
    }

    fn peek_at(&self, offset: usize) -> Option<u16> {
        self.units.get(self.at + offset).copied()
    }

    fn eat(&mut self, expected: char) -> bool {
        if self.peek() == Some(unit(expected)) {
            self.at += 1;
            true
        } else {
            false
        }
    }

    fn starts_with(&self, text: &str) -> bool {
        text.encode_utf16()
            .enumerate()
            .all(|(offset, expected)| self.peek_at(offset) == Some(expected))
    }

    fn pattern(&mut self) -> Parsed<()> {
        self.disjunction()?;
        if self.at != self.units.len() {
            return Err(());
        }
        let undefined_reference: bool = self
            .references
            .iter()
            .any(|reference| !self.names.contains(reference));
        if undefined_reference {
            return Err(());
        }
        Ok(())
    }

    fn disjunction(&mut self) -> Parsed<()> {
        let outer: Vec<Vec<u16>> = self.in_scope.clone();
        let mut defined: Vec<Vec<u16>> = Vec::new();
        loop {
            self.in_scope = outer.clone();
            self.alternative()?;
            defined.extend(self.in_scope.drain(outer.len()..));
            if !self.eat('|') {
                break;
            }
        }
        self.in_scope = outer;
        for name in defined {
            if !self.in_scope.contains(&name) {
                self.in_scope.push(name);
            }
        }
        Ok(())
    }

    fn alternative(&mut self) -> Parsed<()> {
        while let Some(next) = self.peek() {
            if next == unit('|') || next == unit(')') {
                return Ok(());
            }
            self.term()?;
        }
        Ok(())
    }

    /// The length of a braced quantifier `{n}`, `{n,}` or `{n,m}` starting here, with its
    /// bounds, or `None` when the `{` is a literal.
    fn braced_quantifier(&self) -> Option<(usize, u128, Option<u128>)> {
        let mut offset: usize = 1;
        let digits = |offset: &mut usize| -> Option<u128> {
            let start: usize = *offset;
            let mut value: u128 = 0;
            while let Some(digit) = self.peek_at(*offset).filter(|unit| is_digit(*unit)) {
                value = value
                    .saturating_mul(10)
                    .saturating_add(u128::from(digit - unit('0')));
                *offset += 1;
            }
            (*offset > start).then_some(value)
        };
        if self.peek() != Some(unit('{')) {
            return None;
        }
        let min: u128 = digits(&mut offset)?;
        let max: Option<u128> = match self.peek_at(offset) {
            Some(close) if close == unit('}') => Some(min),
            Some(comma) if comma == unit(',') => {
                offset += 1;
                if self.peek_at(offset) == Some(unit('}')) {
                    None
                } else {
                    let max: u128 = digits(&mut offset)?;
                    if self.peek_at(offset) != Some(unit('}')) {
                        return None;
                    }
                    Some(max)
                }
            }
            _ => return None,
        };
        Some((offset + 1, min, max))
    }

    fn at_quantifier(&self) -> bool {
        matches!(self.peek(), Some(next) if next == unit('*') || next == unit('+') || next == unit('?'))
            || self.braced_quantifier().is_some()
    }

    fn quantifier(&mut self) -> Parsed<()> {
        if self.eat('*') || self.eat('+') || self.eat('?') {
            self.eat('?');
            return Ok(());
        }
        if let Some((length, min, max)) = self.braced_quantifier() {
            if max.is_some_and(|max| max < min) {
                return Err(());
            }
            self.at += length;
            self.eat('?');
        }
        Ok(())
    }

    fn term(&mut self) -> Parsed<()> {
        if self.eat('^') || self.eat('$') {
            return if self.at_quantifier() {
                Err(())
            } else {
                Ok(())
            };
        }
        if self.starts_with("\\b") || self.starts_with("\\B") {
            self.at += 2;
            return if self.at_quantifier() {
                Err(())
            } else {
                Ok(())
            };
        }
        if self.starts_with("(?<=") || self.starts_with("(?<!") {
            self.at += 4;
            self.group_body()?;
            return if self.at_quantifier() {
                Err(())
            } else {
                Ok(())
            };
        }
        if self.starts_with("(?=") || self.starts_with("(?!") || self.starts_with("(?:") {
            self.at += 3;
            self.group_body()?;
            return self.quantifier();
        }
        if self.starts_with("(?<") {
            self.at += 3;
            let name: Vec<u16> = self.group_name()?;
            if self.in_scope.contains(&name) {
                return Err(());
            }
            self.in_scope.push(name.clone());
            self.names.push(name);
            self.group_body()?;
            return self.quantifier();
        }
        if self.starts_with("(?") {
            self.at += 2;
            self.modifiers()?;
            self.group_body()?;
            return self.quantifier();
        }
        if self.eat('(') {
            self.group_body()?;
            return self.quantifier();
        }
        match self.peek() {
            Some(next) if next == unit('*') || next == unit('+') || next == unit('?') => Err(()),
            Some(next) if next == unit('{') && self.braced_quantifier().is_some() => Err(()),
            Some(next) if next == unit('[') => {
                self.class()?;
                self.quantifier()
            }
            Some(next) if next == unit('\\') => {
                self.at += 1;
                self.atom_escape()?;
                self.quantifier()
            }
            Some(_) => {
                self.at += 1;
                self.quantifier()
            }
            None => Ok(()),
        }
    }

    /// `(?ims-ims:`, after the `(?`: each of `i`, `m`, `s` at most once across both sides,
    /// and not empty on both sides of a `-`.
    fn modifiers(&mut self) -> Parsed<()> {
        let mut seen: Vec<u16> = Vec::new();
        let mut read = |parser: &mut Parser| -> Parsed<usize> {
            let mut count: usize = 0;
            while let Some(flag) = parser.peek() {
                if flag != unit('i') && flag != unit('m') && flag != unit('s') {
                    break;
                }
                if seen.contains(&flag) {
                    return Err(());
                }
                seen.push(flag);
                parser.at += 1;
                count += 1;
            }
            Ok(count)
        };
        let added: usize = read(self)?;
        if self.eat('-') {
            let removed: usize = read(self)?;
            if added + removed == 0 {
                return Err(());
            }
        }
        if self.eat(':') {
            Ok(())
        } else {
            Err(())
        }
    }

    fn group_body(&mut self) -> Parsed<()> {
        self.disjunction()?;
        if self.eat(')') {
            Ok(())
        } else {
            Err(())
        }
    }

    /// `RegExpIdentifierName` up to the closing `>`, as code points: a surrogate pair or a
    /// `\uXXXX` escape counts as the character it encodes.
    fn group_name(&mut self) -> Parsed<Vec<u16>> {
        let mut name: Vec<u16> = Vec::new();
        let mut first: bool = true;
        loop {
            let start: usize = self.at;
            let code_point: u32 = match self.peek() {
                None => return Err(()),
                Some(close) if close == unit('>') => {
                    self.at += 1;
                    return if name.is_empty() { Err(()) } else { Ok(name) };
                }
                Some(backslash) if backslash == unit('\\') => {
                    self.at += 1;
                    self.identifier_escape()?
                }
                Some(lead @ 0xD800..=0xDBFF) => match self.peek_at(1) {
                    Some(trail @ 0xDC00..=0xDFFF) => {
                        self.at += 2;
                        0x10000 + ((u32::from(lead) - 0xD800) << 10) + (u32::from(trail) - 0xDC00)
                    }
                    _ => return Err(()),
                },
                Some(other) => {
                    self.at += 1;
                    u32::from(other)
                }
            };
            let c: char = char::from_u32(code_point).ok_or(())?;
            let allowed: bool = if first {
                c == '$' || c == '_' || unicode_ident::is_xid_start(c)
            } else {
                c == '$' || c == '\u{200C}' || c == '\u{200D}' || unicode_ident::is_xid_continue(c)
            };
            if !allowed {
                return Err(());
            }
            name.extend_from_slice(&self.units[start..self.at]);
            first = false;
        }
    }

    /// `\uXXXX`, `\uLead\uTrail` or `\u{…}` in a group name, after the backslash.
    fn identifier_escape(&mut self) -> Parsed<u32> {
        if !self.eat('u') {
            return Err(());
        }
        if self.eat('{') {
            let mut value: u32 = 0;
            let mut digits: usize = 0;
            while let Some(hex) = self.peek().filter(|unit| is_hex(*unit)) {
                value = value.saturating_mul(16).saturating_add(hex_value(hex));
                digits += 1;
                self.at += 1;
            }
            if digits == 0 || !self.eat('}') || value > 0x10FFFF {
                return Err(());
            }
            return Ok(value);
        }
        let lead: u32 = self.four_hex().ok_or(())?;
        if (0xD800..=0xDBFF).contains(&lead) && self.starts_with("\\u") {
            let save: usize = self.at;
            self.at += 2;
            match self.four_hex() {
                Some(trail) if (0xDC00..=0xDFFF).contains(&trail) => {
                    return Ok(0x10000 + ((lead - 0xD800) << 10) + (trail - 0xDC00));
                }
                _ => self.at = save,
            }
        }
        Ok(lead)
    }

    fn four_hex(&mut self) -> Option<u32> {
        let digits: Vec<u16> = (0..4)
            .map_while(|offset| self.peek_at(offset).filter(|u| is_hex(*u)))
            .collect();
        if digits.len() != 4 {
            return None;
        }
        self.at += 4;
        Some(
            digits
                .iter()
                .fold(0, |value, hex| value * 16 + hex_value(*hex)),
        )
    }

    /// After the backslash of an escape outside a class.
    fn atom_escape(&mut self) -> Parsed<()> {
        let Some(next) = self.peek() else {
            return Err(());
        };
        if next == unit('k') && self.named {
            self.at += 1;
            if !self.eat('<') {
                return Err(());
            }
            let name: Vec<u16> = self.group_name()?;
            self.references.push(name);
            return Ok(());
        }
        if next == unit('c') {
            if self.peek_at(1).is_some_and(is_ascii_letter) {
                self.at += 2;
            }
            return Ok(());
        }
        if is_digit(next) {
            while self.peek().is_some_and(is_digit) {
                self.at += 1;
            }
            return Ok(());
        }
        self.at += 1;
        Ok(())
    }

    fn class(&mut self) -> Parsed<()> {
        self.at += 1;
        self.eat('^');
        loop {
            match self.peek() {
                None => return Err(()),
                Some(close) if close == unit(']') => {
                    self.at += 1;
                    return Ok(());
                }
                Some(_) => {}
            }
            let from: Option<u32> = self.class_atom()?;
            let is_range: bool = self.peek() == Some(unit('-'))
                && self.peek_at(1).is_some_and(|after| after != unit(']'));
            if is_range {
                self.at += 1;
                let to: Option<u32> = self.class_atom()?;
                if let (Some(from), Some(to)) = (from, to) {
                    if from > to {
                        return Err(());
                    }
                }
            }
        }
    }

    /// One class atom's code unit value; `None` for a class escape such as `\d`.
    fn class_atom(&mut self) -> Parsed<Option<u32>> {
        let Some(first) = self.peek() else {
            return Err(());
        };
        self.at += 1;
        if first != unit('\\') {
            return Ok(Some(u32::from(first)));
        }
        let Some(next) = self.peek() else {
            return Err(());
        };
        let value: u32 = match char::from_u32(u32::from(next)).unwrap_or('\u{FFFD}') {
            'd' | 'D' | 's' | 'S' | 'w' | 'W' => {
                self.at += 1;
                return Ok(None);
            }
            'b' => 0x08,
            'f' => 0x0C,
            'n' => 0x0A,
            'r' => 0x0D,
            't' => 0x09,
            'v' => 0x0B,
            'k' if self.named => return Err(()),
            'c' => {
                let control: Option<u16> = self.peek_at(1).filter(|unit| {
                    is_ascii_letter(*unit) || is_digit(*unit) || *unit == u16::from(b'_')
                });
                return Ok(Some(match control {
                    Some(control) => {
                        self.at += 2;
                        u32::from(control) % 32
                    }
                    None => u32::from(unit('\\')),
                }));
            }
            'x' => {
                self.at += 1;
                let digits: Vec<u16> = (0..2)
                    .map_while(|offset| self.peek_at(offset).filter(|u| is_hex(*u)))
                    .collect();
                if digits.len() == 2 {
                    self.at += 2;
                    return Ok(Some(hex_value(digits[0]) * 16 + hex_value(digits[1])));
                }
                return Ok(Some(u32::from(unit('x'))));
            }
            'u' => {
                self.at += 1;
                return Ok(Some(self.four_hex().unwrap_or(u32::from(unit('u')))));
            }
            '0'..='7' => {
                let mut value: u32 = 0;
                let mut digits: usize = 0;
                while digits < 3 {
                    match self.peek().filter(|unit| is_octal(*unit)) {
                        Some(octal) if value * 8 + u32::from(octal - unit('0')) <= 0o377 => {
                            value = value * 8 + u32::from(octal - unit('0'));
                            self.at += 1;
                            digits += 1;
                        }
                        _ => break,
                    }
                }
                return Ok(Some(value));
            }
            _ => u32::from(next),
        };
        self.at += 1;
        Ok(Some(value))
    }
}

fn hex_value(unit: u16) -> u32 {
    char::from_u32(u32::from(unit))
        .and_then(|c| c.to_digit(16))
        .unwrap_or(0)
}

/// V8 decides `[+NamedCaptureGroups]` by scanning for `(?<` that starts a group name (not a
/// lookbehind) outside classes and escapes.
fn has_named_groups(units: &[u16]) -> bool {
    let mut at: usize = 0;
    let mut in_class: bool = false;
    while at < units.len() {
        match units[at] {
            backslash if backslash == unit('\\') => at += 1,
            open if open == unit('[') => in_class = true,
            close if close == unit(']') => in_class = false,
            open if open == unit('(') && !in_class => {
                let is_name: bool = units.get(at + 1) == Some(&unit('?'))
                    && units.get(at + 2) == Some(&unit('<'))
                    && !matches!(units.get(at + 3), Some(next) if *next == unit('=') || *next == unit('!'));
                if is_name {
                    return true;
                }
            }
            _ => {}
        }
        at += 1;
    }
    false
}

/// `new RegExp(pattern, "i")` (or any flags without `u`/`v`) does not throw.
pub fn is_valid_js_regex(pattern: &str) -> bool {
    let units: Vec<u16> = pattern.encode_utf16().collect();
    let named: bool = has_named_groups(&units);
    let mut parser: Parser = Parser {
        units,
        at: 0,
        named,
        names: Vec::new(),
        in_scope: Vec::new(),
        references: Vec::new(),
    };
    parser.pattern().is_ok()
}

/// The pattern as regress should read it to match as V8 does without `u`: as code units, so
/// an astral character or an escaped surrogate pair is two units rather than one character,
/// and with `\u{` as V8's Annex B reads it, a `u` that the braces may quantify.
fn regress_units(pattern: &str) -> Vec<u32> {
    let units: Vec<u16> = pattern.encode_utf16().collect();
    let hex4 = |at: usize| -> Option<u16> {
        let digits: String = String::from_utf16(units.get(at..at + 4)?).ok()?;
        digits.chars().all(|c| c.is_ascii_hexdigit()).then(|| u16::from_str_radix(&digits, 16).ok()).flatten()
    };
    let mut out: Vec<u32> = Vec::with_capacity(units.len());
    let mut at: usize = 0;
    while at < units.len() {
        let current: u16 = units[at];
        if current != unit('\\') || at + 1 == units.len() {
            out.push(u32::from(current));
            at += 1;
            continue;
        }
        let next: u16 = units[at + 1];
        if next == unit('u') && units.get(at + 2) == Some(&unit('{')) {
            out.push(u32::from(unit('u')));
            at += 2;
        } else if let Some(surrogate) = (next == unit('u')).then(|| hex4(at + 2)).flatten().filter(|value| (0xD800..=0xDFFF).contains(value)) {
            out.push(u32::from(surrogate));
            at += 6;
        } else {
            out.extend([u32::from(current), u32::from(next)]);
            at += 2;
        }
    }
    out
}

/// `new RegExp(pattern, flags)` for flags without `u` or `v`, matched over UTF-16 code units
/// as V8 matches; none where V8 would throw.
pub struct JsRegex(regress::Regex);

impl JsRegex {
    pub fn new(pattern: &str, flags: &str) -> Option<JsRegex> {
        if !is_valid_js_regex(pattern) {
            return None;
        }
        regress::Regex::from_unicode(regress_units(pattern).into_iter(), flags).ok().map(JsRegex)
    }

    /// `RegExp.prototype.test` from the start of the text.
    pub fn test(&self, text: &str) -> bool {
        let units: Vec<u16> = text.encode_utf16().collect();
        self.0.find_from_ucs2(&units, 0).next().is_some()
    }
}
