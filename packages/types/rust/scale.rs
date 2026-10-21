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

//! The SCALE subset the procaptcha token uses, with scale-ts 1.6's decoding rules: an
//! `Option` tag is `Some` for any non-zero byte, compact lengths may be non-canonical,
//! big-integer compact lengths are rejected (scale-ts throws on them), strings decode like a
//! non-fatal `TextDecoder` (leading BOM dropped, bad UTF-8 replaced), and trailing bytes are
//! ignored.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct OutOfBounds;

pub(crate) struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
}

const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];

impl<'a> Reader<'a> {
    pub(crate) fn new(bytes: &'a [u8]) -> Reader<'a> {
        Reader { bytes, at: 0 }
    }

    fn take(&mut self, count: usize) -> Result<&'a [u8], OutOfBounds> {
        let end: usize = self.at.checked_add(count).ok_or(OutOfBounds)?;
        let taken: &'a [u8] = self.bytes.get(self.at..end).ok_or(OutOfBounds)?;
        self.at = end;
        Ok(taken)
    }

    pub(crate) fn u8(&mut self) -> Result<u8, OutOfBounds> {
        Ok(self.take(1)?[0])
    }

    pub(crate) fn u32(&mut self) -> Result<u32, OutOfBounds> {
        let bytes: &[u8] = self.take(4)?;
        Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    fn compact_length(&mut self) -> Result<usize, OutOfBounds> {
        let mode: u8 = self.bytes.get(self.at).ok_or(OutOfBounds)? & 3;
        let value: u32 = match mode {
            0 => u32::from(self.u8()?),
            1 => {
                let bytes: &[u8] = self.take(2)?;
                u32::from(u16::from_le_bytes([bytes[0], bytes[1]]))
            }
            2 => self.u32()?,
            _ => return Err(OutOfBounds),
        };
        Ok((value >> 2) as usize)
    }

    pub(crate) fn str(&mut self) -> Result<String, OutOfBounds> {
        let length: usize = self.compact_length()?;
        let bytes: &[u8] = self.take(length)?;
        let without_bom: &[u8] = bytes.strip_prefix(UTF8_BOM).unwrap_or(bytes);
        Ok(String::from_utf8_lossy(without_bom).into_owned())
    }

    pub(crate) fn option<T>(
        &mut self,
        read: impl FnOnce(&mut Reader<'a>) -> Result<T, OutOfBounds>,
    ) -> Result<Option<T>, OutOfBounds> {
        match self.u8()? {
            0 => Ok(None),
            _ => read(self).map(Some),
        }
    }
}

#[derive(Debug, Default)]
pub(crate) struct Writer {
    bytes: Vec<u8>,
}

impl Writer {
    pub(crate) fn into_bytes(self) -> Vec<u8> {
        self.bytes
    }

    pub(crate) fn u32(&mut self, value: u32) {
        self.bytes.extend_from_slice(&value.to_le_bytes());
    }

    fn compact(&mut self, value: u64) {
        if value < 1 << 6 {
            self.bytes.push((value << 2) as u8);
        } else if value < 1 << 14 {
            self.bytes
                .extend_from_slice(&(((value << 2) | 1) as u16).to_le_bytes());
        } else if value < 1 << 30 {
            self.bytes
                .extend_from_slice(&(((value << 2) | 2) as u32).to_le_bytes());
        } else {
            let le: [u8; 8] = value.to_le_bytes();
            let length: usize = 8 - le.iter().rev().take_while(|byte| **byte == 0).count();
            let length: usize = length.max(4);
            self.bytes.push((((length - 4) << 2) | 3) as u8);
            self.bytes.extend_from_slice(&le[..length]);
        }
    }

    pub(crate) fn str(&mut self, value: &str) {
        self.compact(value.len() as u64);
        self.bytes.extend_from_slice(value.as_bytes());
    }

    pub(crate) fn option<T>(&mut self, value: Option<T>, write: impl FnOnce(&mut Writer, T)) {
        match value {
            None => self.bytes.push(0),
            Some(value) => {
                self.bytes.push(1);
                write(self, value);
            }
        }
    }
}
