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

//! A port of the parts of the `ip-address` (10.7.2) `Address4`/`Address6`
//! classes the server relies on. Parsing accepts and rejects exactly the
//! strings the library does, so `getIPAddress` and the SSRF guard classify
//! input the same way.

use crate::error::UtilError;
use crate::js::{is_line_terminator, utf16_len};

const V4_GROUPS: usize = 4;
const V4_BITS: u32 = 32;
const V6_GROUPS: usize = 8;
const V6_BITS: u32 = 128;

/// The bits after the first `mask` of a `width`-bit address.
fn host_bits(mask: u32, width: u32) -> u128 {
    match width.saturating_sub(mask) {
        0 => 0,
        128 => u128::MAX,
        host => (1u128 << host) - 1,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Address4 {
    address: String,
    address_minus_suffix: String,
    octets: [u8; V4_GROUPS],
    parsed_subnet: String,
    subnet_mask: u32,
}

/// One 0-255 octet in the form `RE_ADDRESS` accepts: no leading zero.
fn parse_octet(group: &str) -> Option<u8> {
    let bytes = group.as_bytes();
    if bytes.is_empty() || bytes.len() > 3 || !bytes.iter().all(u8::is_ascii_digit) {
        return None;
    }
    if bytes.len() > 1 && bytes[0] == b'0' {
        return None;
    }
    group.parse::<u16>().ok().and_then(|n| u8::try_from(n).ok())
}

fn starts_with_zero_then_digit(group: &str) -> bool {
    let bytes = group.as_bytes();
    bytes.len() >= 2 && bytes[0] == b'0' && bytes[1].is_ascii_digit()
}

/// `RE_ADDRESS`: exactly four dot-separated octets.
fn parse_dotted_quad(address: &str) -> Option<[u8; V4_GROUPS]> {
    let groups: Vec<&str> = address.split('.').collect();
    if groups.len() != V4_GROUPS {
        return None;
    }
    let mut octets = [0u8; V4_GROUPS];
    for (octet, group) in octets.iter_mut().zip(&groups) {
        *octet = parse_octet(group)?;
    }
    Some(octets)
}

/// Bits `[0, bits)` of `value` (of width `width`) are equal to those of `other`.
fn leading_bits_equal(value: u128, other: u128, bits: u32, width: u32) -> bool {
    if bits == 0 {
        return true;
    }
    let shift = width - bits;
    (value >> shift) == (other >> shift)
}

impl Address4 {
    pub fn new(address: &str) -> Result<Self, UtilError> {
        let mut parsed_subnet = String::new();
        let mut subnet_mask = V4_BITS;
        let mut rest = address;
        if let Some(slash) = address.rfind('/') {
            let digits = &address[slash + 1..];
            if (1..=2).contains(&digits.len()) && digits.bytes().all(|b| b.is_ascii_digit()) {
                parsed_subnet = digits.to_string();
                subnet_mask = digits.parse().expect("one or two ASCII digits");
                if subnet_mask > V4_BITS {
                    return Err(UtilError::new("Invalid subnet mask."));
                }
                rest = &address[..slash];
            }
        }
        let longest = V4_GROUPS * 4 - 1;
        if utf16_len(rest) > longest {
            return Err(UtilError::new(format!(
                "IPv4 addresses are at most {longest} characters."
            )));
        }
        if rest.split('.').any(starts_with_zero_then_digit) {
            return Err(UtilError::new("IPv4 addresses can't have leading zeroes."));
        }
        let octets =
            parse_dotted_quad(rest).ok_or_else(|| UtilError::new("Invalid IPv4 address."))?;
        Ok(Self {
            address: address.to_string(),
            address_minus_suffix: rest.to_string(),
            octets,
            parsed_subnet,
            subnet_mask,
        })
    }

    pub fn is_valid(address: &str) -> bool {
        Self::new(address).is_ok()
    }

    pub fn from_big_int(value: u128) -> Result<Self, UtilError> {
        let value = u32::try_from(value)
            .map_err(|_| UtilError::new("IPv4 BigInt must be in the range 0 to 2**32 - 1"))?;
        let [a, b, c, d] = value.to_be_bytes();
        Self::new(&format!("{a}.{b}.{c}.{d}"))
    }

    /// The string the address was constructed from, including any subnet.
    pub fn address(&self) -> &str {
        &self.address
    }

    pub fn address_minus_suffix(&self) -> &str {
        &self.address_minus_suffix
    }

    pub fn octets(&self) -> [u8; V4_GROUPS] {
        self.octets
    }

    pub fn parsed_subnet(&self) -> &str {
        &self.parsed_subnet
    }

    pub fn subnet_mask(&self) -> u32 {
        self.subnet_mask
    }

    pub fn subnet(&self) -> String {
        format!("/{}", self.subnet_mask)
    }

    pub fn correct_form(&self) -> String {
        let [a, b, c, d] = self.octets;
        format!("{a}.{b}.{c}.{d}")
    }

    pub fn big_int(&self) -> u128 {
        u128::from(u32::from_be_bytes(self.octets))
    }

    /// `startAddress().bigInt()`: the first address of the subnet.
    pub fn start_address_big_int(&self) -> u128 {
        self.big_int() & !host_bits(self.subnet_mask, V4_BITS)
    }

    /// `endAddress().bigInt()`: the last address of the subnet.
    pub fn end_address_big_int(&self) -> u128 {
        self.big_int() | host_bits(self.subnet_mask, V4_BITS)
    }

    pub fn to_group6(&self) -> String {
        let [a, b, c, d] = self.octets;
        format!("{a:02x}{b:02x}:{c:02x}{d:02x}")
    }

    /// Whether this address (ignoring its own subnet) lies inside `subnet`.
    pub fn is_host_in_subnet(&self, subnet: &Address4) -> bool {
        leading_bits_equal(
            self.big_int(),
            subnet.big_int(),
            subnet.subnet_mask,
            V4_BITS,
        )
    }

    fn is_in_block(&self, block: [u8; 4], mask: u32) -> bool {
        leading_bits_equal(
            self.big_int(),
            u128::from(u32::from_be_bytes(block)),
            mask,
            V4_BITS,
        )
    }

    pub fn is_loopback(&self) -> bool {
        self.is_in_block([127, 0, 0, 0], 8)
    }

    pub fn is_link_local(&self) -> bool {
        self.is_in_block([169, 254, 0, 0], 16)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Address6 {
    address: String,
    address_minus_suffix: String,
    groups: [u16; V6_GROUPS],
    parsed_subnet: String,
    subnet_mask: u32,
    zone: String,
    address4: Option<Address4>,
}

/// `RE_SUBNET_STRING` (`/\/\d{1,3}(?=%|$)/`): the leftmost `/` followed by one
/// to three digits and then `%` or the end.
fn find_v6_subnet(address: &str) -> Option<(usize, usize)> {
    let bytes = address.as_bytes();
    for (slash, _) in address.match_indices('/') {
        let digits = bytes[slash + 1..]
            .iter()
            .take_while(|b| b.is_ascii_digit())
            .count();
        let after = slash + 1 + digits;
        if (1..=3).contains(&digits) && (after == bytes.len() || bytes[after] == b'%') {
            return Some((slash, after));
        }
    }
    None
}

/// `RE_ZONE_STRING` (`/%.*$/`): `.` stops at line terminators, so the zone
/// starts at the first `%` with no line terminator after it.
fn find_zone(address: &str) -> Option<usize> {
    let search_from = address
        .char_indices()
        .rfind(|(_, c)| is_line_terminator(*c))
        .map_or(0, |(i, c)| i + c.len_utf8());
    address[search_from..].find('%').map(|i| search_from + i)
}

fn is_hex(b: u8) -> bool {
    b.is_ascii_hexdigit()
}

/// `RE_BAD_ADDRESS`: a run of five hex digits, three colons, a trailing
/// single colon, a leading single colon, or a trailing slash.
fn is_bad_address(address: &str) -> bool {
    let bytes = address.as_bytes();
    let mut hex_run = 0;
    let mut colon_run = 0;
    for &b in bytes {
        hex_run = if is_hex(b) { hex_run + 1 } else { 0 };
        colon_run = if b == b':' { colon_run + 1 } else { 0 };
        if hex_run >= 5 || colon_run >= 3 {
            return true;
        }
    }
    let n = bytes.len();
    (n >= 2 && bytes[n - 1] == b':' && bytes[n - 2] != b':')
        || (n >= 2 && bytes[0] == b':' && bytes[1] != b':')
        || bytes.last() == Some(&b'/')
}

impl Address6 {
    pub fn new(address: &str) -> Result<Self, UtilError> {
        let mut parsed_subnet = String::new();
        let mut subnet_mask = V6_BITS;
        let mut rest = address.to_string();
        if let Some((slash, end)) = find_v6_subnet(address) {
            parsed_subnet = address[slash + 1..end].to_string();
            subnet_mask = parsed_subnet.parse().expect("one to three ASCII digits");
            if subnet_mask > V6_BITS {
                return Err(UtilError::new("Invalid subnet mask."));
            }
            rest = format!("{}{}", &address[..slash], &address[end..]);
        }
        if rest.contains('/') {
            return Err(UtilError::new("Invalid subnet mask."));
        }
        let mut zone = String::new();
        if let Some(percent) = find_zone(&rest) {
            zone = rest[percent..].to_string();
            rest.truncate(percent);
        }
        let longest = V6_GROUPS * 5 + 5;
        if utf16_len(&rest) > longest {
            return Err(UtilError::new(format!(
                "IPv6 addresses are at most {longest} characters."
            )));
        }
        let (groups, address4) = parse_v6(&rest, subnet_mask)?;
        Ok(Self {
            address: address.to_string(),
            address_minus_suffix: rest,
            groups,
            parsed_subnet,
            subnet_mask,
            zone,
            address4,
        })
    }

    pub fn is_valid(address: &str) -> bool {
        Self::new(address).is_ok()
    }

    pub fn from_big_int(value: u128) -> Self {
        let hex = format!("{value:032x}");
        let groups: Vec<&str> = (0..V6_GROUPS).map(|i| &hex[i * 4..(i + 1) * 4]).collect();
        Self::new(&groups.join(":")).expect("eight four-digit hex groups always parse")
    }

    pub fn address(&self) -> &str {
        &self.address
    }

    pub fn address_minus_suffix(&self) -> &str {
        &self.address_minus_suffix
    }

    pub fn groups(&self) -> [u16; V6_GROUPS] {
        self.groups
    }

    /// `parsedAddress`: each group as unpadded lowercase hex.
    pub fn parsed_address(&self) -> Vec<String> {
        self.groups.iter().map(|g| format!("{g:x}")).collect()
    }

    pub fn parsed_subnet(&self) -> &str {
        &self.parsed_subnet
    }

    pub fn subnet_mask(&self) -> u32 {
        self.subnet_mask
    }

    pub fn subnet(&self) -> String {
        format!("/{}", self.subnet_mask)
    }

    pub fn zone(&self) -> &str {
        &self.zone
    }

    /// The trailing dotted quad, when the address was written in v4-in-v6 notation.
    pub fn address4(&self) -> Option<&Address4> {
        self.address4.as_ref()
    }

    /// Whether the address was written in v4-in-v6 dotted-quad notation.
    pub fn is4(&self) -> bool {
        self.address4.is_some()
    }

    pub fn big_int(&self) -> u128 {
        self.groups
            .iter()
            .fold(0u128, |acc, g| (acc << 16) | u128::from(*g))
    }

    /// `startAddress().bigInt()`: the first address of the subnet.
    pub fn start_address_big_int(&self) -> u128 {
        self.big_int() & !host_bits(self.subnet_mask, V6_BITS)
    }

    /// `endAddress().bigInt()`: the last address of the subnet.
    pub fn end_address_big_int(&self) -> u128 {
        self.big_int() | host_bits(self.subnet_mask, V6_BITS)
    }

    pub fn canonical_form(&self) -> String {
        self.groups
            .iter()
            .map(|g| format!("{g:04x}"))
            .collect::<Vec<String>>()
            .join(":")
    }

    /// RFC 5952 form: the first longest run of two or more zero groups becomes `::`.
    pub fn correct_form(&self) -> String {
        let mut best: Option<(usize, usize)> = None;
        let mut i = 0;
        while i < V6_GROUPS {
            if self.groups[i] == 0 {
                let start = i;
                while i < V6_GROUPS && self.groups[i] == 0 {
                    i += 1;
                }
                let len = i - start;
                if len > 1 && best.is_none_or(|(_, best_len)| len > best_len) {
                    best = Some((start, len));
                }
            } else {
                i += 1;
            }
        }
        let hex = |groups: &[u16]| -> String {
            groups
                .iter()
                .map(|g| format!("{g:x}"))
                .collect::<Vec<String>>()
                .join(":")
        };
        match best {
            None => hex(&self.groups),
            Some((start, len)) => format!(
                "{}::{}",
                hex(&self.groups[..start]),
                hex(&self.groups[start + len..])
            ),
        }
    }

    pub fn is_host_in_subnet(&self, subnet: &Address6) -> bool {
        leading_bits_equal(
            self.big_int(),
            subnet.big_int(),
            subnet.subnet_mask,
            V6_BITS,
        )
    }

    fn is_in_block(&self, block: u128, mask: u32) -> bool {
        leading_bits_equal(self.big_int(), block, mask, V6_BITS)
    }

    /// The last 32 bits as an IPv4 address, inheriting `subnet_mask - 96` when
    /// the subnet covers them.
    pub fn to4(&self) -> Address4 {
        let [a, b, c, d] = ((self.big_int() & 0xffff_ffff) as u32).to_be_bytes();
        let address = if self.subnet_mask >= 96 {
            format!("{a}.{b}.{c}.{d}/{}", self.subnet_mask - 96)
        } else {
            format!("{a}.{b}.{c}.{d}")
        };
        Address4::new(&address).expect("a formatted dotted quad always parses")
    }

    /// In `::ffff:0:0/96`.
    pub fn is_mapped4(&self) -> bool {
        self.is_in_block(0xffff_0000_0000, 96)
    }

    /// The IPv4 address an IPv4-mapped (`::ffff:0:0/96`) or NAT64
    /// (`64:ff9b::/96`) address reaches.
    pub fn embedded_ipv4(&self) -> Option<Address4> {
        if self.is_mapped4() || self.is_in_block(0x0064_ff9b_u128 << 96, 96) {
            Some(self.to4())
        } else {
            None
        }
    }

    pub fn is_loopback(&self) -> bool {
        match self.embedded_ipv4() {
            Some(v4) => v4.is_loopback(),
            None => self.big_int() == 1,
        }
    }

    pub fn is_link_local(&self) -> bool {
        match self.embedded_ipv4() {
            Some(v4) => v4.is_link_local(),
            None => self.is_in_block(0xfe80_u128 << 112, 10),
        }
    }
}

/// `Address6.parse` (with `parse4in6`): the eight groups, plus the trailing
/// dotted quad when the address used v4-in-v6 notation.
fn parse_v6(
    address: &str,
    subnet_mask: u32,
) -> Result<([u16; V6_GROUPS], Option<Address4>), UtilError> {
    let mut address = address.to_string();
    let mut address4: Option<Address4> = None;
    if address.contains('.') {
        let mut groups: Vec<String> = address.split(':').map(str::to_string).collect();
        let last_group = groups.last().cloned().unwrap_or_default();
        let octets: Vec<&str> = last_group.split('.').collect();
        if octets.len() == V4_GROUPS
            && octets
                .iter()
                .all(|o| (1..=3).contains(&o.len()) && o.bytes().all(|b| b.is_ascii_digit()))
            && octets.iter().any(|o| starts_with_zero_then_digit(o))
        {
            return Err(UtilError::new("IPv4 addresses can't have leading zeroes."));
        }
        if parse_dotted_quad(&last_group).is_some() {
            let suffix = if subnet_mask >= 96 {
                format!("/{}", subnet_mask - 96)
            } else {
                String::new()
            };
            let v4 = Address4::new(&format!("{last_group}{suffix}"))?;
            let index = groups.len() - 1;
            groups[index] = v4.to_group6();
            address = groups.join(":");
            address4 = Some(v4);
        }
    }

    let bad: String = address
        .chars()
        .filter(|c| !(c.is_ascii_hexdigit() || matches!(c, ':' | '/' | '%')))
        .collect();
    if !bad.is_empty() {
        let plural = if bad.chars().count() > 1 { "s" } else { "" };
        return Err(UtilError::new(format!(
            "Bad character{plural} detected in address: {bad}"
        )));
    }
    if is_bad_address(&address) {
        return Err(UtilError::new("Address failed regex"));
    }

    let halves: Vec<&str> = address.split("::").collect();
    let groups: Vec<&str> = match halves.as_slice() {
        [single] => single.split(':').collect(),
        [first, last] => {
            let first: Vec<&str> = if first.is_empty() {
                Vec::new()
            } else {
                first.split(':').collect()
            };
            let last: Vec<&str> = if last.is_empty() {
                Vec::new()
            } else {
                last.split(':').collect()
            };
            let remaining = V6_GROUPS as i64 - (first.len() + last.len()) as i64;
            if remaining == 0 {
                return Err(UtilError::new("Error parsing groups"));
            }
            let mut groups: Vec<&str> = first;
            groups.extend(std::iter::repeat_n("0", remaining.max(0) as usize));
            groups.extend(last);
            groups
        }
        _ => return Err(UtilError::new("Too many :: groups found")),
    };
    if groups.len() != V6_GROUPS {
        return Err(UtilError::new("Incorrect number of groups found"));
    }
    let mut parsed = [0u16; V6_GROUPS];
    for (slot, group) in parsed.iter_mut().zip(&groups) {
        // `RE_BAD_ADDRESS` has already limited each group to at most four hex digits.
        *slot = u16::from_str_radix(group, 16)
            .map_err(|_| UtilError::new("Incorrect number of groups found"))?;
    }
    Ok((parsed, address4))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IpAddress {
    V4(Address4),
    V6(Address6),
}

impl IpAddress {
    pub fn big_int(&self) -> u128 {
        match self {
            Self::V4(a) => a.big_int(),
            Self::V6(a) => a.big_int(),
        }
    }

    pub fn correct_form(&self) -> String {
        match self {
            Self::V4(a) => a.correct_form(),
            Self::V6(a) => a.correct_form(),
        }
    }

    pub fn address(&self) -> &str {
        match self {
            Self::V4(a) => a.address(),
            Self::V6(a) => a.address(),
        }
    }

    pub fn is_v4(&self) -> bool {
        matches!(self, Self::V4(_))
    }
}

/// `getIPAddress`: an IPv4 address if the string parses as one, else IPv6.
/// The TS also logs the rejected input to the console; that is left to the caller.
pub fn get_ip_address(ip_address: &str) -> Result<IpAddress, UtilError> {
    if let Ok(v4) = Address4::new(ip_address) {
        return Ok(IpAddress::V4(v4));
    }
    Address6::new(ip_address)
        .map(IpAddress::V6)
        .map_err(|_| UtilError::new("API.INVALID_IP"))
}

/// `getIPAddressFromBigInt`: always an IPv4 address.
pub fn get_ip_address_from_big_int(value: u128) -> Result<Address4, UtilError> {
    Address4::from_big_int(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_v4_and_v6() {
        let v4 = get_ip_address("192.168.1.1").unwrap();
        assert!(v4.is_v4());
        assert_eq!(v4.big_int(), 3_232_235_777);
        let v6 = get_ip_address("2001:0DB8::0001").unwrap();
        assert_eq!(v6.correct_form(), "2001:db8::1");
        assert_eq!(
            get_ip_address("01.2.3.4").unwrap_err().message(),
            "API.INVALID_IP"
        );
        assert_eq!(get_ip_address("").unwrap_err().message(), "API.INVALID_IP");
    }

    #[test]
    fn keeps_the_v4_tail_of_v4_in_v6_notation() {
        let Ok(IpAddress::V6(address)) = get_ip_address("::ffff:127.0.0.1") else {
            panic!("expected an IPv6 address");
        };
        assert!(address.is4());
        assert!(address.is_loopback());
        assert_eq!(address.to4().correct_form(), "127.0.0.1");
        assert_eq!(address.correct_form(), "::ffff:7f00:1");
    }

    #[test]
    fn converts_from_big_int() {
        assert_eq!(
            get_ip_address_from_big_int(16_909_060)
                .unwrap()
                .correct_form(),
            "1.2.3.4"
        );
        assert!(get_ip_address_from_big_int(1 << 32).is_err());
        assert_eq!(
            Address6::from_big_int(1_000_000_000_000).correct_form(),
            "::e8:d4a5:1000"
        );
    }
}
