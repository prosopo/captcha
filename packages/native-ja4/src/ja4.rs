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
// This module vendors a JA4 parser wider than what the current napi wrapper
// exposes (extra enums, parsers, and helpers reserved for future JA4 features).
// Suppress the dead-code lints so the vendored surface can stay identical to
// the upstream reference implementation without divergence noise.
#![allow(dead_code)]
#![allow(missing_docs)]
#![allow(clippy::extra_unused_lifetimes)]
#![allow(clippy::enum_variant_names)]
#![allow(clippy::struct_field_names)]
#![allow(clippy::vec_init_then_push)]

use sha2::{Digest, Sha256};

pub enum Protocol {
    Tls = 0,
    Quic = 1,
    Dtls = 2,
}

pub enum Sni {
    Domain,
    Ip,
}

/// Per spec: use the byte as-is if ASCII alphanumeric, otherwise two-char lowercase hex.
fn alpn_char(b: u8) -> String {
    if b.is_ascii_alphanumeric() {
        (b as char).to_string()
    } else {
        format!("{b:02x}")
    }
}

/// Return the (first, last) JA4 ALPN characters for a raw protocol byte slice.
/// A missing position (empty or single-byte slice) returns "0".
fn alpn_first_last(protocol: &[u8]) -> (String, String) {
    let first = protocol
        .first()
        .map_or_else(|| "0".to_string(), |&b| alpn_char(b));
    let last = if protocol.len() > 1 {
        protocol
            .last()
            .map_or_else(|| "0".to_string(), |&b| alpn_char(b))
    } else {
        "0".to_string()
    };
    (first, last)
}

/// Get the protocol marker character: 't' for TLS, 'q' for QUIC
fn protocol_marker(_is_quic: bool) -> char {
    't' // TODO: implement QUIC detection
}

/// Hash a string using SHA256 and return the first 12 hex characters
fn hash12(input: &str) -> String {
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(&hash[..6])
}

/// Format a slice of u16 IDs as comma-separated hex string (e.g. "1301,1302,c02f")
fn format_id_list(ids: &[u16]) -> String {
    use std::fmt::Write;
    let mut result = String::new();
    for (i, id) in ids.iter().enumerate() {
        if i > 0 {
            result.push(',');
        }
        let _ = write!(result, "{id:04x}");
    }
    result
}

#[allow(dead_code)]
pub struct Ja4 {
    pub ja4: String,
    record_type: u8,
    protocol_version: u16,
    record_len: u16,
    handshake_message_type: u8,
    handshake_message_len: u32,
    client_version: u16,
    client_random: [u8; 32],
    session_id: Vec<u8>,
    cipher_suites: Vec<u16>,
    compression_methods: Vec<u8>,
    extensions: Vec<Extension>,
    protocol: Protocol,
}

#[derive(Debug)]
pub enum Error {
    InvalidClientHelloRecordType,
    InvalidClientHelloLength,
    InvalidClientHelloRecordLength,
    InvalidClientHelloHandshakeMessageType,
    InvalidClientHelloHandshakeMessageLength,
    InvalidClientHelloClientRandom,
    InvalidEcPointFormatsExtensionBufferLength,
    InvalidEcPointFormatsExtensionLength,
    InvalidAlpnExtensionBufferLength,
    InvalidAlpnExtensionLength,
    InvalidSupportedGroupsExtensionBufferLength,
    InvalidSupportedGroupsExtensionLength,
    InvalidSignatureAlgorithmsExtensionBufferLength,
    InvalidSignatureAlgorithmsExtensionLength,
    InvalidServerNameExtensionBufferLength,
    InvalidServerNameExtensionLength,
    InvalidServerNameExtensionName,
}

const RECORD_HEADER_LENGTH: usize = 5;
const HANDSHAKE_HEADER_LENGTH: usize = 4;
const HANDSHAKE_RECORD_TYPE: u8 = 0x16;
const HANDSHAKE_MESSAGE_TYPE: u8 = 0x01;

impl Default for Ja4 {
    fn default() -> Self {
        Self {
            ja4: String::new(),
            record_type: 0,
            protocol_version: 0,
            record_len: 0,
            handshake_message_type: 0,
            handshake_message_len: 0,
            client_version: 0,
            client_random: [0; 32],
            session_id: Vec::new(),
            cipher_suites: Vec::new(),
            compression_methods: Vec::new(),
            extensions: Vec::new(),
            protocol: Protocol::Tls,
        }
    }
}

impl Ja4 {
    pub fn from_client_hello(mut data: &[u8]) -> Result<Self, Error> {
        // TODO: add support for QUIC and DTLS
        let protocol = Protocol::Tls; // only TLS for now

        // The caller sends the full TLS record including the 5-byte record
        // header and 4-byte handshake header. Strip them before parsing the
        // ClientHello body.
        //
        // Record header:  content_type(1) + version(2) + record_len(2) = 5
        // Handshake header: msg_type(1) + msg_len(3)                   = 4
        if data.len() < RECORD_HEADER_LENGTH + HANDSHAKE_HEADER_LENGTH {
            return Err(Error::InvalidClientHelloLength);
        }

        let record_type = data[0];
        if record_type != HANDSHAKE_RECORD_TYPE {
            return Err(Error::InvalidClientHelloRecordType);
        }
        let protocol_version = u16::from_be_bytes([data[1], data[2]]);
        let record_len = u16::from_be_bytes([data[3], data[4]]);
        data = &data[RECORD_HEADER_LENGTH..];

        if data.len() < record_len as usize {
            return Err(Error::InvalidClientHelloRecordLength);
        }

        let handshake_message_type = data[0];
        if handshake_message_type != HANDSHAKE_MESSAGE_TYPE {
            return Err(Error::InvalidClientHelloHandshakeMessageType);
        }
        let handshake_message_len = u32::from_be_bytes([0, data[1], data[2], data[3]]);
        data = &data[HANDSHAKE_HEADER_LENGTH..];

        if data.len() < handshake_message_len as usize {
            return Err(Error::InvalidClientHelloHandshakeMessageLength);
        }

        // Now data points at the ClientHello body:
        //   client_version(2) + random(32) + session_id_len(1) + ...
        if data.len() < 2 + 32 + 1 {
            return Err(Error::InvalidClientHelloLength);
        }

        let mut client_version = u16::from_be_bytes([data[0], data[1]]);
        data = &data[2..];

        let client_random: [u8; 32] = data[0..32]
            .try_into()
            .map_err(|_| Error::InvalidClientHelloClientRandom)?;
        data = &data[32..];

        let session_id_len = data[0] as usize;
        data = &data[1..];

        if data.len() < session_id_len {
            return Err(Error::InvalidClientHelloLength);
        }
        let session_id: Vec<u8> = data[0..session_id_len].to_vec();
        data = &data[session_id_len..];

        if data.len() < 2 {
            return Err(Error::InvalidClientHelloLength);
        }
        let cipher_suites_len = u16::from_be_bytes([data[0], data[1]]) as usize;
        data = &data[2..];

        if data.len() < cipher_suites_len {
            return Err(Error::InvalidClientHelloLength);
        }
        // Reject odd cipher_suites_len: cipher suites are 2 bytes each, and an
        // odd length silently misaligns the rest of the ClientHello parse.
        if !cipher_suites_len.is_multiple_of(2) {
            return Err(Error::InvalidClientHelloLength);
        }

        // for each pair of bytes, convert to u16 and add to cipher suites list
        let mut cipher_suites = Vec::new();
        for i in (0..cipher_suites_len).step_by(2) {
            if i + 1 >= data.len() {
                return Err(Error::InvalidClientHelloLength);
            }
            let cipher_suite = u16::from_be_bytes([data[i], data[i + 1]]);
            cipher_suites.push(cipher_suite);
        }
        data = &data[cipher_suites_len..];

        if data.is_empty() {
            return Err(Error::InvalidClientHelloLength);
        }
        let compression_methods_len = data[0] as usize;
        data = &data[1..];

        if data.len() < compression_methods_len {
            return Err(Error::InvalidClientHelloLength);
        }
        let compression_methods: Vec<u8> = data[0..compression_methods_len].to_vec();
        data = &data[compression_methods_len..];

        if data.len() < 2 {
            return Err(Error::InvalidClientHelloLength);
        }
        let extensions_len = u16::from_be_bytes([data[0], data[1]]) as usize;
        data = &data[2..];

        if data.len() < extensions_len {
            return Err(Error::InvalidClientHelloLength);
        }
        let mut extensions_bytes: &[u8] = &data[0..extensions_len];

        let mut signature_algorithm_ids: Vec<u16> = Vec::new();
        let mut supported_group_ids: Vec<u16> = Vec::new();
        let mut protocols: Vec<&[u8]> = Vec::new();
        let mut ec_point_formats: Vec<u8> = Vec::new();

        let mut extensions: Vec<Extension> = Vec::new();
        while !extensions_bytes.is_empty() {
            let extension_id = u16::from_be_bytes([extensions_bytes[0], extensions_bytes[1]]);
            extensions_bytes = &extensions_bytes[2..];

            let extension_len = u16::from_be_bytes([extensions_bytes[0], extensions_bytes[1]]);
            extensions_bytes = &extensions_bytes[2..];
            let extension_bytes: &[u8] = &extensions_bytes[..extension_len as usize];
            extensions_bytes = &extensions_bytes[extension_len as usize..];
            extensions.push(Extension {
                id: extension_id,
                len: extension_len,
            });

            match extension_id {
                id if id == TlsExtensionId::SupportedVersions as u16 => {
                    // Parse the actual version list and pick the highest non-GREASE version.
                    // TLS 1.3 ClientHellos set the record-layer version to 0x0303 for compat
                    // and advertise the real version here.
                    if let Ok(versions) = Self::parse_supported_versions_extension(extension_bytes)
                    {
                        if let Some(&best) = versions.iter().filter(|&&v| !Self::is_grease(v)).max()
                        {
                            client_version = best;
                        }
                    }
                }
                id if id == TlsExtensionId::SignatureAlgorithms as u16 => {
                    let parsed_signature_algorithm_ids =
                        Self::parse_signature_algorithms_extension(extension_bytes)?;
                    signature_algorithm_ids.extend(parsed_signature_algorithm_ids);
                }
                id if id == TlsExtensionId::SupportedGroups as u16 => {
                    let extension_supported_groups =
                        Self::parse_supported_groups_extension(extension_bytes)?;
                    supported_group_ids.extend(extension_supported_groups);
                }
                id if id == TlsExtensionId::ApplicationLayerProtocolNegotiation as u16 => {
                    let extension_alpn_protocols = Self::parse_alpn_extension(extension_bytes)?;
                    protocols.extend(extension_alpn_protocols);
                }
                id if id == TlsExtensionId::EcPointFormats as u16 => {
                    let parsed_ec_point_formats =
                        Self::parse_ec_point_formats_extension(extension_bytes)?;
                    ec_point_formats.extend(parsed_ec_point_formats);
                }
                _ => {
                    continue;
                }
            }
        }

        // Build JA4 fingerprint according to the reference specification
        let ja4_protocol = protocol_marker(false); // 't' for TLS
        let ja4_tls_version = match TlsProtocolVersion::from_u16(client_version) {
            TlsProtocolVersion::TLSv1_0 => "10",
            TlsProtocolVersion::TLSv1_1 => "11",
            TlsProtocolVersion::TLSv1_2 => "12",
            TlsProtocolVersion::TLSv1_3 => "13",
            _ => "00",
        };
        // JA4 SNI indicator reflects presence of the SNI extension itself, not a
        // successfully parsed host_name — a present-but-empty/malformed list is
        // still 'd'. Matches the JS implementation and the JA4 spec.
        let ja4_sni = if extensions
            .iter()
            .any(|e| e.id == TlsExtensionId::ServerName as u16)
        {
            'd'
        } else {
            'i'
        };

        // Extract ALPN characters from first protocol (raw bytes, not decoded as UTF-8)
        let (alpn_first, alpn_last) = if protocols.is_empty() {
            ("0".to_string(), "0".to_string())
        } else {
            alpn_first_last(protocols[0])
        };

        // GREASE values must be excluded from the counts per spec
        let nr_ciphers = 99.min(
            cipher_suites
                .iter()
                .filter(|&&c| !Self::is_grease(c))
                .count(),
        );
        let nr_exts = 99.min(extensions.iter().filter(|e| !Self::is_grease(e.id)).count());

        // Build first chunk: protocol + tls_version + sni + cipher_count + ext_count + alpn
        let first_chunk = format!(
            "{}{}{}{}{}{}{}",
            ja4_protocol,
            ja4_tls_version,
            ja4_sni,
            format_args!("{:02}", nr_ciphers),
            format_args!("{:02}", nr_exts),
            alpn_first,
            alpn_last
        );

        // Build cipher string (sorted, excluding GREASE)
        let cipher_string = {
            let mut ciphers: Vec<u16> = cipher_suites
                .iter()
                .copied()
                .filter(|c| !Self::is_grease(*c))
                .collect();
            ciphers.sort_unstable();
            format_id_list(&ciphers)
        };
        let ja4_cipher_hash = hash12(&cipher_string);

        // Build extension IDs (sorted, excluding GREASE, SNI, and ALPN)
        let extension_string = {
            let mut ext_ids: Vec<u16> = extensions
                .iter()
                .map(|e| e.id)
                .filter(|id| !Self::is_grease(*id) && *id != 0x0000 && *id != 0x0010)
                .collect();
            ext_ids.sort_unstable();
            format_id_list(&ext_ids)
        };

        // Build signature algorithms string (not sorted per spec)
        let sig_alg_string = {
            let sig_algs: Vec<u16> = signature_algorithm_ids
                .iter()
                .copied()
                .filter(|id| !Self::is_grease(*id))
                .collect();
            format_id_list(&sig_algs)
        };

        // Combine extensions and signature algorithms with optional underscore
        let ja4_exts_hash = if sig_alg_string.is_empty() {
            hash12(&extension_string)
        } else {
            let exts_sigs = format!("{extension_string}_{sig_alg_string}");
            hash12(&exts_sigs)
        };

        let ja4 = format!("{first_chunk}_{ja4_cipher_hash}_{ja4_exts_hash}");

        Ok(Ja4 {
            ja4,
            record_type,
            protocol_version,
            record_len,
            handshake_message_type,
            handshake_message_len,
            client_version,
            client_random,
            session_id,
            cipher_suites,
            compression_methods,
            extensions,
            protocol,
        })
    }

    /// Parse the `supported_versions` extension from a `ClientHello`.
    /// Format: 1-byte list-length, then 2-byte version entries.
    pub fn parse_supported_versions_extension(mut buffer: &[u8]) -> Result<Vec<u16>, Error> {
        if buffer.is_empty() {
            return Ok(Vec::new());
        }
        let list_len = buffer[0] as usize;
        buffer = &buffer[1..];
        if buffer.len() < list_len {
            return Ok(Vec::new());
        }
        buffer = &buffer[..list_len];
        let mut versions = Vec::new();
        while buffer.len() >= 2 {
            let v = u16::from_be_bytes([buffer[0], buffer[1]]);
            buffer = &buffer[2..];
            versions.push(v);
        }
        Ok(versions)
    }

    pub fn parse_ec_point_formats_extension(buffer: &[u8]) -> Result<&[u8], Error> {
        if buffer.is_empty() {
            return Err(Error::InvalidEcPointFormatsExtensionBufferLength);
        }

        let len = buffer[0];
        let buffer = &buffer[1..];

        if buffer.len() != len as usize {
            return Err(Error::InvalidEcPointFormatsExtensionLength);
        }

        // ec point formats are encoded as a list of u8 values
        Ok(buffer)
    }

    pub fn parse_alpn_extension<'a>(mut buffer: &[u8]) -> Result<Vec<&[u8]>, Error> {
        if buffer.len() < 2 {
            return Err(Error::InvalidAlpnExtensionBufferLength);
        }

        let len = u16::from_be_bytes([buffer[0], buffer[1]]);
        buffer = &buffer[2..];

        if buffer.len() != len as usize {
            return Err(Error::InvalidAlpnExtensionLength);
        }

        let mut protocols: Vec<&[u8]> = Vec::new();
        while !buffer.is_empty() {
            let protocol_len = u8::from_be_bytes([buffer[0]]);
            buffer = &buffer[1..];
            let protocol = &buffer[0..protocol_len as usize];
            buffer = &buffer[protocol_len as usize..];
            protocols.push(protocol);
        }

        Ok(protocols)
    }

    pub fn parse_supported_groups_extension<'a>(mut buffer: &[u8]) -> Result<Vec<u16>, Error> {
        if buffer.len() < 2 {
            return Err(Error::InvalidSupportedGroupsExtensionBufferLength);
        }

        let len = u16::from_be_bytes([buffer[0], buffer[1]]);
        buffer = &buffer[2..];

        if buffer.len() != len as usize {
            return Err(Error::InvalidSupportedGroupsExtensionLength);
        }
        let mut supported_group_ids = Vec::new();
        while !buffer.is_empty() {
            let supported_group_id = u16::from_be_bytes([buffer[0], buffer[1]]);
            buffer = &buffer[2..];
            if Self::is_grease(supported_group_id) {
                continue;
            }
            supported_group_ids.push(supported_group_id);
        }

        Ok(supported_group_ids)
    }

    pub fn parse_signature_algorithms_extension<'a>(mut buffer: &[u8]) -> Result<Vec<u16>, Error> {
        if buffer.len() < 2 {
            return Err(Error::InvalidSignatureAlgorithmsExtensionBufferLength);
        }

        let len = u16::from_be_bytes([buffer[0], buffer[1]]);
        buffer = &buffer[2..];

        if buffer.len() != len as usize {
            return Err(Error::InvalidSignatureAlgorithmsExtensionLength);
        }

        let mut signature_algorithm_ids = Vec::new();
        while !buffer.is_empty() {
            let signature_algorithm_id = u16::from_be_bytes([buffer[0], buffer[1]]);
            buffer = &buffer[2..];
            if Self::is_grease(signature_algorithm_id) {
                continue;
            }
            signature_algorithm_ids.push(signature_algorithm_id);
        }

        Ok(signature_algorithm_ids)
    }

    pub fn parse_server_name_extension<'a>(mut buffer: &[u8]) -> Result<Vec<String>, Error> {
        if buffer.len() < 2 {
            return Err(Error::InvalidServerNameExtensionBufferLength);
        }

        let len = u16::from_be_bytes([buffer[0], buffer[1]]);
        buffer = &buffer[2..];

        if buffer.len() != len as usize {
            return Err(Error::InvalidServerNameExtensionLength);
        }

        let mut names: Vec<String> = Vec::new();

        while !buffer.is_empty() {
            let name_type = buffer[0];
            buffer = &buffer[1..];
            let name_len = u16::from_be_bytes([buffer[0], buffer[1]]);
            buffer = &buffer[2..];

            if buffer.len() < name_len as usize {
                return Err(Error::InvalidServerNameExtensionLength);
            }

            let name: &[u8] = &buffer[0..name_len as usize];
            buffer = &buffer[name_len as usize..];

            // only name type 0 is allowed, >=1 is private / reserved
            if name_type == 0 {
                let name_str = String::from_utf8(name.to_vec())
                    .map_err(|_| Error::InvalidServerNameExtensionName)?;
                names.push(name_str);
            }
        }

        Ok(names)
    }

    /// grease id is inserted into place throughout the client hello to ensure tls implementations handle unknown ids gracefully rather than failing. for ja4, these need to be ignored. grease ids always have the format '0x?a?a' where the high and low bytes are identical and the low nibble is always 0xA.
    #[must_use]
    pub fn is_grease(id: u16) -> bool {
        // RFC 8701 GREASE values are the 16 uint16s with equal bytes from the
        // set {0x0a, 0x1a, …, 0xfa}: low nibble of each byte is 0xa and the
        // high byte equals the low byte.
        id & 0x0F0F == 0x0A0A && id >> 8 == id & 0xFF
    }
}

#[allow(dead_code)]
struct ExtensionAlpn<'a> {
    protocols: &'a [&'a [u8]],
}

#[allow(dead_code)]
struct ExtensionServerName<'a> {
    names: &'a [String],
}

#[derive(PartialEq, Eq, Ord, PartialOrd)]
struct Extension {
    id: u16,
    len: u16,
}

pub enum TlsProtocolVersion {
    TLSv1_0 = 0x0301,
    TLSv1_1 = 0x0302,
    TLSv1_2 = 0x0303,
    TLSv1_3 = 0x0304,
    Unknown = 0x0000,
}

impl TlsProtocolVersion {
    #[must_use]
    pub fn from_u16(value: u16) -> Self {
        match value {
            0x0301 => Self::TLSv1_0,
            0x0302 => Self::TLSv1_1,
            0x0303 => Self::TLSv1_2,
            0x0304 => Self::TLSv1_3,
            _ => Self::Unknown,
        }
    }

    #[must_use]
    pub fn to_u16(&self) -> u16 {
        match self {
            Self::TLSv1_0 => 0x0301,
            Self::TLSv1_1 => 0x0302,
            Self::TLSv1_2 => 0x0303,
            Self::TLSv1_3 => 0x0304,
            Self::Unknown => 0x0000,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u16)]
pub enum TlsExtensionId {
    ServerName = 0,
    MaxFragmentLength = 1,
    ClientCertificateUrl = 2,
    TrustedCaKeys = 3,
    TruncatedHmac = 4,
    StatusRequest = 5,
    UserMapping = 6,
    ClientAuthz = 7,
    ServerAuthz = 8,
    CertType = 9,
    SupportedGroups = 10,
    EcPointFormats = 11,
    Srp = 12,
    SignatureAlgorithms = 13,
    UseSrtp = 14,
    Heartbeat = 15,
    ApplicationLayerProtocolNegotiation = 16,
    StatusRequestV2 = 17,
    SignedCertificateTimestamp = 18,
    ClientCertificateType = 19,
    ServerCertificateType = 20,
    Padding = 21,
    EncryptThenMac = 22,
    ExtendedMasterSecret = 23,
    TokenBinding = 24,
    CachedInfo = 25,
    TlsLts = 26,
    CompressCertificate = 27,
    RecordSizeLimit = 28,
    DelegatedCredentials = 34,
    SessionTicket = 35,
    Tlmsp = 36,
    TlmspProxying = 37,
    TlmspDelegate = 38,
    SupportedEktCiphers = 39,
    PreSharedKeyLegacy = 40,
    PreSharedKey = 41,
    EarlyData = 42,
    SupportedVersions = 0x002B,
    Cookie = 44,
    PskKeyExchangeModes = 45,
    PskKeyExchangeModesLegacy = 46,
    CertificateAuthorities = 47,
    OidFilters = 48,
    PostHandshakeAuth = 49,
    SignatureAlgorithmsCert = 50,
    KeyShare = 51,
    ConnectionId = 52,
    ConnectionIdDtls = 53,
    ExternalIdHash = 93,
    ExternalSessionId = 94,
    PwdProtect = 30,
    PwdClear = 31,
    PasswordSalt = 32,
    TicketPinning = 33,
    RenegotiationInfo = 65281,
    EncryptedClientHello = 65037,
    ChannelId = 30031,
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn test_alpn_char_alphanumeric() {
        assert_eq!(alpn_char(b'h'), "h");
        assert_eq!(alpn_char(b'2'), "2");
        assert_eq!(alpn_char(b'A'), "A");
        assert_eq!(alpn_char(b'z'), "z");
    }

    #[test]
    fn test_alpn_char_non_alphanumeric() {
        // Non-alphanumeric bytes become two-char lowercase hex per spec
        assert_eq!(alpn_char(b'/'), "2f");
        assert_eq!(alpn_char(0xAD), "ad");
        assert_eq!(alpn_char(0x00), "00");
    }

    #[test]
    fn test_alpn_first_last() {
        assert_eq!(alpn_first_last(b"h2"), ("h".to_string(), "2".to_string()));
        // single byte: last defaults to "0"
        assert_eq!(alpn_first_last(b"h"), ("h".to_string(), "0".to_string()));
        // empty: both default to "0"
        assert_eq!(alpn_first_last(b""), ("0".to_string(), "0".to_string()));
        // "http/1.1" → first='h', last='1'
        assert_eq!(
            alpn_first_last(b"http/1.1"),
            ("h".to_string(), "1".to_string())
        );
        // non-alphanumeric bytes use hex
        assert_eq!(
            alpn_first_last(&[0xAD, b'x']),
            ("ad".to_string(), "x".to_string())
        );
    }

    #[test]
    fn test_protocol_marker() {
        assert_eq!(protocol_marker(false), 't');
        assert_eq!(protocol_marker(true), 't'); // TODO: will be 'q' when QUIC is implemented
    }

    #[test]
    fn test_hash12() {
        let input = "test_input";
        let hash = hash12(input);

        // Should be 12 hex characters
        assert_eq!(hash.len(), 12);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));

        // Same input should produce same hash
        let hash2 = hash12(input);
        assert_eq!(hash, hash2);

        // Different input should produce different hash
        let hash3 = hash12("different_input");
        assert_ne!(hash, hash3);
    }

    #[test]
    fn test_is_grease() {
        // Test all GREASE values
        assert!(Ja4::is_grease(0x0a0a));
        assert!(Ja4::is_grease(0x1a1a));
        assert!(Ja4::is_grease(0x2a2a));
        assert!(Ja4::is_grease(0x3a3a));
        assert!(Ja4::is_grease(0x4a4a));
        assert!(Ja4::is_grease(0x5a5a));
        assert!(Ja4::is_grease(0x6a6a));
        assert!(Ja4::is_grease(0x7a7a));
        assert!(Ja4::is_grease(0x8a8a));
        assert!(Ja4::is_grease(0x9a9a));
        assert!(Ja4::is_grease(0xaaaa));
        assert!(Ja4::is_grease(0xbaba));
        assert!(Ja4::is_grease(0xcaca));
        assert!(Ja4::is_grease(0xdada));
        assert!(Ja4::is_grease(0xeaea));
        assert!(Ja4::is_grease(0xfafa));

        // Test non-GREASE values
        assert!(!Ja4::is_grease(0x1301)); // TLS_AES_128_GCM_SHA256
        assert!(!Ja4::is_grease(0xc02f)); // ECDHE_RSA_AES_128_GCM_SHA256
        assert!(!Ja4::is_grease(0x0000)); // SNI extension
        assert!(!Ja4::is_grease(0x002b)); // Supported versions

        // GREASE look-alikes matching the nibble pattern but with unequal bytes
        // must NOT be treated as GREASE (RFC 8701 requires equal bytes).
        assert!(!Ja4::is_grease(0x0a1a));
        assert!(!Ja4::is_grease(0x1a0a));
        assert!(!Ja4::is_grease(0x2a3a));
    }

    #[test]
    fn test_ja4_format() {
        // Test that JA4 fingerprint follows the expected format
        // Format: t{tls_version}{sni_type}{cipher_count}{extension_count}{alpn}_{cipher_hash}_{extension_hash}
        // Example: t13d1516h2_8daaf6152771_e5627efa2ab1

        let ja4_example = "t13d1516h2_8daaf6152771_e5627efa2ab1";

        // Should start with 't'
        assert!(ja4_example.starts_with('t'));

        // Should have exactly 2 underscores (3 parts)
        assert_eq!(ja4_example.split('_').count(), 3);

        // Check first chunk format: t + 2 digits (version) + 1 char (sni) + 2 digits (ciphers) + 2 digits (extensions) + 2 chars (alpn)
        let parts: Vec<&str> = ja4_example.split('_').collect();
        assert_eq!(parts[0].len(), 10); // t13d1516h2
        assert_eq!(parts[1].len(), 12); // 8daaf6152771
        assert_eq!(parts[2].len(), 12); // e5627efa2ab1

        // Verify hash parts are hex
        assert!(parts[1].chars().all(|c| c.is_ascii_hexdigit()));
        assert!(parts[2].chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_ja4_fingerprint_consistency() {
        // Test that the same input always produces the same JA4
        let cipher_string = "1301,1302,1303,c02b,c02f";
        let hash1 = hash12(cipher_string);
        let hash2 = hash12(cipher_string);

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_extension_filtering() {
        // Test that SNI (0x0000) and ALPN (0x0010) are correctly filtered out
        let extensions = vec![
            Extension { id: 0x0000, len: 0 }, // SNI - should be filtered
            Extension { id: 0x000a, len: 0 }, // Supported Groups
            Extension { id: 0x0010, len: 0 }, // ALPN - should be filtered
            Extension { id: 0x002b, len: 0 }, // Supported Versions
        ];

        let filtered: Vec<u16> = extensions
            .iter()
            .map(|e| e.id)
            .filter(|id| !Ja4::is_grease(*id) && *id != 0x0000 && *id != 0x0010)
            .collect();

        assert_eq!(filtered.len(), 2);
        assert!(!filtered.contains(&0x0000));
        assert!(!filtered.contains(&0x0010));
        assert!(filtered.contains(&0x000a));
        assert!(filtered.contains(&0x002b));
    }

    #[test]
    fn test_ja4_default() {
        let ja4 = Ja4::default();
        assert_eq!(ja4.ja4, "");
        assert_eq!(ja4.client_version, 0);
        assert_eq!(ja4.cipher_suites.len(), 0);
        assert_eq!(ja4.extensions.len(), 0);
    }

    /// Build a minimal but valid TLS `ClientHello` record for testing.
    ///
    /// The returned `Vec<u8>` contains the 5-byte TLS record header and
    /// 4-byte handshake header followed by the `ClientHello` body, which is
    /// the format `from_client_hello` expects.
    fn build_client_hello(
        tls_version: u16,
        cipher_suites: &[u16],
        extensions: &[(u16, &[u8])],
    ) -> Vec<u8> {
        let mut body = Vec::new();

        // client_version (2 bytes)
        body.extend_from_slice(&tls_version.to_be_bytes());

        // client_random (32 bytes)
        body.extend_from_slice(&[0xAA; 32]);

        // session_id_length (1 byte) + session_id (0 bytes)
        body.push(0);

        // cipher_suites_length (2 bytes) + cipher suites
        let cs_len = (cipher_suites.len() * 2) as u16;
        body.extend_from_slice(&cs_len.to_be_bytes());
        for cs in cipher_suites {
            body.extend_from_slice(&cs.to_be_bytes());
        }

        // compression_methods_length (1 byte) + null compression
        body.push(1);
        body.push(0);

        // extensions
        let mut ext_buf = Vec::new();
        for (id, data) in extensions {
            ext_buf.extend_from_slice(&id.to_be_bytes());
            ext_buf.extend_from_slice(&(data.len() as u16).to_be_bytes());
            ext_buf.extend_from_slice(data);
        }
        body.extend_from_slice(&(ext_buf.len() as u16).to_be_bytes());
        body.extend_from_slice(&ext_buf);

        // Wrap in handshake header (type 0x01 + 3-byte length)
        let hs_len = body.len() as u32;
        let mut handshake = Vec::new();
        handshake.push(HANDSHAKE_MESSAGE_TYPE); // 0x01
        handshake.push((hs_len >> 16) as u8);
        handshake.push((hs_len >> 8) as u8);
        handshake.push(hs_len as u8);
        handshake.extend_from_slice(&body);

        // Wrap in TLS record header (type 0x16 + version + 2-byte length)
        let rec_len = handshake.len() as u16;
        let mut record = Vec::new();
        record.push(HANDSHAKE_RECORD_TYPE); // 0x16
        record.extend_from_slice(&0x0301u16.to_be_bytes()); // record-layer version
        record.extend_from_slice(&rec_len.to_be_bytes());
        record.extend_from_slice(&handshake);

        record
    }

    /// Build a Server Name extension payload for the given hostname.
    fn build_sni_extension(hostname: &str) -> Vec<u8> {
        let name = hostname.as_bytes();
        let mut buf = Vec::new();
        // server_name_list_length (2 bytes)
        let list_len = (1 + 2 + name.len()) as u16;
        buf.extend_from_slice(&list_len.to_be_bytes());
        // host_name type (1 byte)
        buf.push(0);
        // host_name length (2 bytes) + name
        buf.extend_from_slice(&(name.len() as u16).to_be_bytes());
        buf.extend_from_slice(name);
        buf
    }

    /// Build an ALPN extension payload for the given protocol strings.
    fn build_alpn_extension(protocols: &[&str]) -> Vec<u8> {
        let mut proto_buf = Vec::new();
        for p in protocols {
            proto_buf.push(p.len() as u8);
            proto_buf.extend_from_slice(p.as_bytes());
        }
        let mut buf = Vec::new();
        buf.extend_from_slice(&(proto_buf.len() as u16).to_be_bytes());
        buf.extend_from_slice(&proto_buf);
        buf
    }

    /// Build a Supported Versions extension payload listing TLS 1.3.
    fn build_supported_versions_extension() -> Vec<u8> {
        // supported_versions for ClientHello: 1-byte length + version list
        vec![
            2, // length of version list (1 version × 2 bytes)
            0x03, 0x04, // TLS 1.3
        ]
    }

    /// Build a Signature Algorithms extension payload.
    fn build_sig_algs_extension(algs: &[u16]) -> Vec<u8> {
        let mut buf = Vec::new();
        let len = (algs.len() * 2) as u16;
        buf.extend_from_slice(&len.to_be_bytes());
        for alg in algs {
            buf.extend_from_slice(&alg.to_be_bytes());
        }
        buf
    }

    // ── Header validation tests ──────────────────────────────────────────

    #[test]
    fn test_rejects_too_short_input() {
        // Fewer than 9 bytes (record header + handshake header)
        assert!(matches!(
            Ja4::from_client_hello(&[0x16, 0x03, 0x01]),
            Err(Error::InvalidClientHelloLength)
        ));
    }

    #[test]
    fn test_rejects_non_handshake_record_type() {
        let mut record = build_client_hello(0x0303, &[0x1301], &[]);
        record[0] = 0x17; // Application Data, not Handshake
        assert!(matches!(
            Ja4::from_client_hello(&record),
            Err(Error::InvalidClientHelloRecordType)
        ));
    }

    #[test]
    fn test_rejects_non_client_hello_handshake_type() {
        let mut record = build_client_hello(0x0303, &[0x1301], &[]);
        record[5] = 0x02; // ServerHello instead of ClientHello
        assert!(matches!(
            Ja4::from_client_hello(&record),
            Err(Error::InvalidClientHelloHandshakeMessageType)
        ));
    }

    #[test]
    fn test_rejects_odd_cipher_suites_length() {
        // cipher_suites_len must be a multiple of 2 (each suite is 2 bytes).
        // An odd length is malformed and misaligns the rest of the parse.
        let mut record = build_client_hello(0x0303, &[0x1301], &[]);
        // cipher_suites_len sits at offset 5 (rec hdr) + 4 (hs hdr) + 2 (ver)
        // + 32 (random) + 1 (session_id_len) = 44
        record[44] = 0;
        record[45] = 3;
        assert!(matches!(
            Ja4::from_client_hello(&record),
            Err(Error::InvalidClientHelloLength)
        ));
    }

    #[test]
    fn test_rejects_truncated_record() {
        let record = build_client_hello(0x0303, &[0x1301], &[]);
        // Truncate so it's shorter than the record_len header claims
        let truncated = &record[..record.len() - 10];
        assert!(Ja4::from_client_hello(truncated).is_err());
    }

    // ── Parsing correctness tests ────────────────────────────────────────

    #[test]
    fn test_parses_tls12_no_extensions() {
        let ciphers: Vec<u16> = vec![0xc02f, 0xc030, 0x009e];
        let record = build_client_hello(0x0303, &ciphers, &[]);
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        assert_eq!(ja4.record_type, HANDSHAKE_RECORD_TYPE);
        assert_eq!(ja4.handshake_message_type, HANDSHAKE_MESSAGE_TYPE);
        assert_eq!(ja4.client_version, 0x0303);
        assert_eq!(ja4.cipher_suites, ciphers);
        assert_eq!(ja4.compression_methods, vec![0]);
        assert!(ja4.extensions.is_empty());
    }

    #[test]
    fn test_parses_tls13_with_supported_versions() {
        let ciphers = vec![0x1301, 0x1302];
        let sv_ext = build_supported_versions_extension();
        let record = build_client_hello(
            0x0303, // TLS 1.2 on the wire (TLS 1.3 sets this for compat)
            &ciphers,
            &[(TlsExtensionId::SupportedVersions as u16, &sv_ext)],
        );
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        // SupportedVersions extension should override client_version to 1.3
        assert_eq!(ja4.client_version, 0x0304);
        // JA4 first chunk should contain "13" for the version
        assert!(ja4.ja4.starts_with("t13"));
    }

    #[test]
    fn test_sni_sets_d_flag() {
        let sni = build_sni_extension("example.com");
        let record = build_client_hello(
            0x0303,
            &[0xc02f],
            &[(TlsExtensionId::ServerName as u16, &sni)],
        );
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        // 'd' for domain SNI present
        let parts: Vec<&str> = ja4.ja4.split('_').collect();
        assert_eq!(parts[0].chars().nth(3), Some('d'));
    }

    #[test]
    fn test_no_sni_sets_i_flag() {
        let record = build_client_hello(0x0303, &[0xc02f], &[]);
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        // 'i' for IP / no SNI
        let parts: Vec<&str> = ja4.ja4.split('_').collect();
        assert_eq!(parts[0].chars().nth(3), Some('i'));
    }

    #[test]
    fn test_empty_sni_extension_sets_d_flag() {
        // The SNI flag keys off the extension's presence, not a parsed
        // host_name: an empty server_name list must still yield 'd'.
        let record = build_client_hello(
            0x0303,
            &[0xc02f],
            &[(TlsExtensionId::ServerName as u16, &[])],
        );
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");
        let parts: Vec<&str> = ja4.ja4.split('_').collect();
        assert_eq!(parts[0].chars().nth(3), Some('d'));
    }

    #[test]
    fn test_alpn_characters_in_fingerprint() {
        let alpn = build_alpn_extension(&["h2"]);
        let record = build_client_hello(
            0x0303,
            &[0xc02f],
            &[(
                TlsExtensionId::ApplicationLayerProtocolNegotiation as u16,
                &alpn,
            )],
        );
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        // Last two chars of the first chunk should be 'h' and '2'
        let first_chunk = ja4.ja4.split('_').next().unwrap();
        assert_eq!(first_chunk.chars().nth(8), Some('h'));
        assert_eq!(first_chunk.chars().nth(9), Some('2'));
    }

    #[test]
    fn test_no_alpn_uses_zeros() {
        let record = build_client_hello(0x0303, &[0xc02f], &[]);
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        let first_chunk = ja4.ja4.split('_').next().unwrap();
        assert_eq!(first_chunk.chars().nth(8), Some('0'));
        assert_eq!(first_chunk.chars().nth(9), Some('0'));
    }

    #[test]
    fn test_cipher_and_extension_counts() {
        let ciphers = vec![0x1301, 0x1302, 0x1303, 0xc02b, 0xc02f];
        let sni = build_sni_extension("example.com");
        let alpn = build_alpn_extension(&["h2", "http/1.1"]);
        let sig_algs = build_sig_algs_extension(&[0x0403, 0x0804]);
        let record = build_client_hello(
            0x0303,
            &ciphers,
            &[
                (TlsExtensionId::ServerName as u16, &sni),
                (
                    TlsExtensionId::ApplicationLayerProtocolNegotiation as u16,
                    &alpn,
                ),
                (TlsExtensionId::SignatureAlgorithms as u16, &sig_algs),
            ],
        );
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        let first_chunk = ja4.ja4.split('_').next().unwrap();
        // 5 ciphers → "05", 3 extensions → "03"
        assert_eq!(&first_chunk[4..6], "05");
        assert_eq!(&first_chunk[6..8], "03");
    }

    #[test]
    fn test_grease_ciphers_filtered_from_hash() {
        // Include a GREASE value in cipher suites — it should not affect the
        // cipher hash (GREASE is filtered out before hashing).
        let with_grease = vec![0x0a0a, 0x1301, 0x1302];
        let without_grease = vec![0x1301, 0x1302];

        let record_with = build_client_hello(0x0303, &with_grease, &[]);
        let record_without = build_client_hello(0x0303, &without_grease, &[]);

        let ja4_with = Ja4::from_client_hello(&record_with).expect("should parse");
        let ja4_without = Ja4::from_client_hello(&record_without).expect("should parse");

        // Cipher hash (second chunk) should be identical
        let hash_with = ja4_with.ja4.split('_').nth(1).unwrap();
        let hash_without = ja4_without.ja4.split('_').nth(1).unwrap();
        assert_eq!(hash_with, hash_without);
    }

    #[test]
    fn test_sni_and_alpn_extensions_excluded_from_ext_hash() {
        // SNI (0x0000) and ALPN (0x0010) should be excluded from the
        // extension hash. Adding them should not change the third chunk.
        let sni = build_sni_extension("example.com");
        let alpn = build_alpn_extension(&["h2"]);
        let sig_algs = build_sig_algs_extension(&[0x0403]);

        let record_with_sni_alpn = build_client_hello(
            0x0303,
            &[0x1301],
            &[
                (TlsExtensionId::ServerName as u16, &sni),
                (
                    TlsExtensionId::ApplicationLayerProtocolNegotiation as u16,
                    &alpn,
                ),
                (TlsExtensionId::SignatureAlgorithms as u16, &sig_algs),
            ],
        );
        let record_only_sig = build_client_hello(
            0x0303,
            &[0x1301],
            &[(TlsExtensionId::SignatureAlgorithms as u16, &sig_algs)],
        );

        let ja4_with = Ja4::from_client_hello(&record_with_sni_alpn).expect("should parse");
        let ja4_without = Ja4::from_client_hello(&record_only_sig).expect("should parse");

        let ext_hash_with = ja4_with.ja4.split('_').nth(2).unwrap();
        let ext_hash_without = ja4_without.ja4.split('_').nth(2).unwrap();
        assert_eq!(ext_hash_with, ext_hash_without);
    }

    #[test]
    fn test_ja4_output_format() {
        let sni = build_sni_extension("example.com");
        let alpn = build_alpn_extension(&["h2"]);
        let record = build_client_hello(
            0x0303,
            &[0x1301, 0xc02f],
            &[
                (TlsExtensionId::ServerName as u16, &sni),
                (
                    TlsExtensionId::ApplicationLayerProtocolNegotiation as u16,
                    &alpn,
                ),
            ],
        );
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");

        let parts: Vec<&str> = ja4.ja4.split('_').collect();
        assert_eq!(
            parts.len(),
            3,
            "JA4 should have 3 underscore-separated parts"
        );
        assert_eq!(parts[0].len(), 10, "first chunk should be 10 chars");
        assert_eq!(parts[1].len(), 12, "cipher hash should be 12 hex chars");
        assert_eq!(parts[2].len(), 12, "extension hash should be 12 hex chars");
        assert!(parts[1].chars().all(|c| c.is_ascii_hexdigit()));
        assert!(parts[2].chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_deterministic_output() {
        let record = build_client_hello(0x0303, &[0x1301, 0x1302, 0xc02f], &[]);
        let ja4a = Ja4::from_client_hello(&record).expect("should parse");
        let ja4b = Ja4::from_client_hello(&record).expect("should parse");
        assert_eq!(ja4a.ja4, ja4b.ja4, "same input must produce same JA4");
    }

    #[test]
    fn test_full_realistic_client_hello() {
        // Simulate a realistic TLS 1.3 Chrome-like ClientHello with
        // multiple extensions, GREASE values, SNI, ALPN, signature
        // algorithms, and supported versions.
        let sni = build_sni_extension("www.example.com");
        let alpn = build_alpn_extension(&["h2", "http/1.1"]);
        let sig_algs = build_sig_algs_extension(&[
            0x0403, // ecdsa_secp256r1_sha256
            0x0804, // rsa_pss_rsae_sha256
            0x0401, // rsa_pkcs1_sha256
        ]);
        let sv_ext = build_supported_versions_extension();

        let ciphers = vec![
            0x4a4a, // GREASE
            0x1301, // TLS_AES_128_GCM_SHA256
            0x1302, // TLS_AES_256_GCM_SHA384
            0x1303, // TLS_CHACHA20_POLY1305_SHA256
            0xc02b, // ECDHE_ECDSA_AES_128_GCM_SHA256
            0xc02f, // ECDHE_RSA_AES_128_GCM_SHA256
        ];

        let record = build_client_hello(
            0x0303,
            &ciphers,
            &[
                (TlsExtensionId::ServerName as u16, &sni),
                (TlsExtensionId::SupportedVersions as u16, &sv_ext),
                (
                    TlsExtensionId::ApplicationLayerProtocolNegotiation as u16,
                    &alpn,
                ),
                (TlsExtensionId::SignatureAlgorithms as u16, &sig_algs),
            ],
        );

        let ja4 = Ja4::from_client_hello(&record).expect("should parse realistic ClientHello");

        let parts: Vec<&str> = ja4.ja4.split('_').collect();
        assert_eq!(parts.len(), 3);

        // Protocol 't', version '13' (SupportedVersions overrides), SNI 'd'
        assert_eq!(&parts[0][0..4], "t13d");

        // 6 ciphers but 1 is GREASE → GREASE excluded from count → "05"
        assert_eq!(&parts[0][4..6], "05");

        // 4 extensions → count is 04
        assert_eq!(&parts[0][6..8], "04");

        // ALPN first protocol "h2" → 'h', '2'
        assert_eq!(&parts[0][8..10], "h2");

        // Hashes are 12 hex chars
        assert_eq!(parts[1].len(), 12);
        assert_eq!(parts[2].len(), 12);

        // Verify parsed fields
        assert_eq!(ja4.client_version, 0x0304); // overridden to TLS 1.3
        assert_eq!(ja4.cipher_suites, ciphers);
        assert_eq!(ja4.extensions.len(), 4);
    }

    #[test]
    fn test_supported_versions_tls12_only() {
        // A supported_versions extension listing only TLS 1.2 must not be treated as TLS 1.3.
        let sv_ext = vec![
            2, // list length
            0x03, 0x03, // TLS 1.2
        ];
        let record = build_client_hello(
            0x0303,
            &[0x1301],
            &[(TlsExtensionId::SupportedVersions as u16, &sv_ext)],
        );
        let ja4 = Ja4::from_client_hello(&record).expect("should parse");
        assert!(ja4.ja4.starts_with("t12"), "expected t12, got {}", ja4.ja4);
    }

    #[test]
    fn test_parse_supported_versions_extension() {
        // Typical TLS 1.3 ClientHello: list TLS 1.3 and TLS 1.2
        let data = vec![4, 0x03, 0x04, 0x03, 0x03]; // len=4, 0x0304, 0x0303
        let versions = Ja4::parse_supported_versions_extension(&data).unwrap();
        assert_eq!(versions, vec![0x0304, 0x0303]);

        // GREASE + TLS 1.3
        let data2 = vec![4, 0x0a, 0x0a, 0x03, 0x04];
        let versions2 = Ja4::parse_supported_versions_extension(&data2).unwrap();
        assert_eq!(versions2, vec![0x0a0a, 0x0304]);
        // highest non-GREASE should be selected at call site
        let best: Option<u16> = versions2
            .iter()
            .copied()
            .filter(|&v| !Ja4::is_grease(v))
            .max();
        assert_eq!(best, Some(0x0304));
    }
}
