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

//! sr25519 on top of `schnorrkel`, reproducing the input checks (and error
//! messages) of `@scure/sr25519`, which the TS implementation wraps. Secret
//! keys use the 64-byte "ed25519" layout: `scalar * 8 (LE) || nonce`.

use crate::error::{err, Error, Result};
use crate::u8a::{le_bytes_to_decimal, u8a_to_u8a, U8aLike};
use curve25519_dalek::ristretto::{CompressedRistretto, RistrettoPoint};
use curve25519_dalek::scalar::Scalar;
use curve25519_dalek::traits::Identity;
use rand_core::{CryptoRng, OsRng, RngCore};
use schnorrkel::context::attach_rng;
use schnorrkel::derive::{ChainCode, Derivation};
use schnorrkel::vrf::{VRFPreOut, VRFProof};
use schnorrkel::{signing_context, ExpansionMode, MiniSecretKey, PublicKey, SecretKey, Signature};

pub const SUBSTRATE_CONTEXT: &[u8] = b"substrate";
pub const SECRET_KEY_LENGTH: usize = 64;
pub const PUBLIC_KEY_LENGTH: usize = 32;
pub const SIGNATURE_LENGTH: usize = 64;
pub const VRF_OUTPUT_LENGTH: usize = 96;

/// A public/secret key pair.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Keypair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

const CURVE_ORDER_LE: [u8; 32] = [
    0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10,
];
const INVALID_SCALAR_NON_ZERO: &str = "invalid scalar: expected 1 <= sc < curve.n";

fn le_less_than(a: &[u8; 32], b: &[u8; 32]) -> bool {
    a.iter().rev().cmp(b.iter().rev()) == std::cmp::Ordering::Less
}

fn is_zero(bytes: &[u8; 32]) -> bool {
    bytes.iter().all(|b| *b == 0)
}

fn to32(bytes: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes[..32]);
    out
}

/// `decodeScalar`: the stored (cofactor-multiplied) scalar shifted right by 3, unreduced.
fn decode_scalar(secret_key: &[u8]) -> [u8; 32] {
    let mut out = to32(secret_key);
    let mut carry = 0u8;
    for byte in out.iter_mut().rev() {
        let next = *byte & 0b111;
        *byte = (*byte >> 3) | (carry << 5);
        carry = next;
    }
    out
}

fn check_non_zero_scalar(scalar: &[u8; 32]) -> Result<Scalar> {
    if is_zero(scalar) || !le_less_than(scalar, &CURVE_ORDER_LE) {
        return err(INVALID_SCALAR_NON_ZERO);
    }
    Option::from(Scalar::from_canonical_bytes(*scalar)).map_or_else(|| err(INVALID_SCALAR_NON_ZERO), Ok)
}

fn check_scalar_range(title: &str, scalar: &[u8; 32]) -> Result<()> {
    if le_less_than(scalar, &CURVE_ORDER_LE) {
        return Ok(());
    }
    err(format!(
        "expected valid {title}: 0 <= n < {}, got {}",
        le_bytes_to_decimal(&CURVE_ORDER_LE),
        le_bytes_to_decimal(scalar)
    ))
}

fn abytes(title: &str, bytes: &[u8], length: usize) -> Result<()> {
    if bytes.len() == length {
        return Ok(());
    }
    err(format!(
        "{title}: Uint8Array expected of length {length}, not of length={}",
        bytes.len()
    ))
}

/// `RistrettoPoint.fromBytes`, distinguishing the two failure stages like noble.
fn ristretto_from_bytes(bytes: &[u8]) -> Result<RistrettoPoint> {
    let bytes = to32(bytes);
    let below_p = !(bytes[31] == 0x7f && bytes[1..31].iter().all(|b| *b == 0xff) && bytes[0] >= 0xed);
    if bytes[31] & 0x80 != 0 || !below_p || bytes[0] & 1 == 1 {
        return err("invalid ristretto255 encoding 1");
    }
    CompressedRistretto(bytes)
        .decompress()
        .map_or_else(|| err("invalid ristretto255 encoding 2"), Ok)
}

fn schnorrkel_error(e: schnorrkel::SignatureError) -> Error {
    Error::new(e.to_string())
}

/// The schnorrkel secret key behind a 64-byte secret, after `getPublicKey`'s range check.
fn checked_secret(secret_key: &[u8]) -> Result<SecretKey> {
    check_non_zero_scalar(&decode_scalar(secret_key))?;
    SecretKey::from_ed25519_bytes(secret_key).map_err(schnorrkel_error)
}

fn keypair_from_secret(secret: &SecretKey) -> Keypair {
    Keypair {
        public_key: secret.to_public().to_bytes().to_vec(),
        secret_key: secret.to_ed25519_bytes().to_vec(),
    }
}

fn secret_from_seed(seed: &[u8]) -> Result<SecretKey> {
    MiniSecretKey::from_bytes(seed)
        .map(|mini| mini.expand(ExpansionMode::Ed25519))
        .map_err(schnorrkel_error)
}

pub fn sr25519_from_seed<'a>(seed: impl Into<U8aLike<'a>>) -> Result<Keypair> {
    let seed = u8a_to_u8a(seed);
    if seed.len() != 32 {
        return err(format!("Expected a seed of 32 bytes, found {}", seed.len()));
    }
    Ok(keypair_from_secret(&secret_from_seed(&seed)?))
}

pub fn sr25519_pair_from_u8a<'a>(full: impl Into<U8aLike<'a>>) -> Result<Keypair> {
    let full = u8a_to_u8a(full);
    let total = SECRET_KEY_LENGTH + PUBLIC_KEY_LENGTH;
    if full.len() != total {
        return err(format!(
            "Expected keypair with {total} bytes, found {}",
            full.len()
        ));
    }
    Ok(Keypair {
        public_key: full[SECRET_KEY_LENGTH..].to_vec(),
        secret_key: full[..SECRET_KEY_LENGTH].to_vec(),
    })
}

pub fn sr25519_keypair_to_u8a(pair: &Keypair) -> Vec<u8> {
    [pair.secret_key.as_slice(), pair.public_key.as_slice()].concat()
}

fn message_bytes(message: U8aLike<'_>) -> Vec<u8> {
    match message {
        U8aLike::Str(s) => s.as_bytes().to_vec(),
        U8aLike::Bytes(b) => b.to_vec(),
    }
}

/// `sr25519Sign(message, { secretKey })`. A string message is UTF-8 encoded (never hex-decoded).
pub fn sr25519_sign<'a>(message: impl Into<U8aLike<'a>>, secret_key: &[u8]) -> Result<Vec<u8>> {
    sr25519_sign_with_rng(message, secret_key, OsRng)
}

pub fn sr25519_sign_with_rng<'a, R: RngCore + CryptoRng>(
    message: impl Into<U8aLike<'a>>,
    secret_key: &[u8],
    rng: R,
) -> Result<Vec<u8>> {
    if secret_key.len() != SECRET_KEY_LENGTH {
        return err(format!(
            "Expected secretKey to be 64 bytes, found {}",
            secret_key.len()
        ));
    }
    sign_raw(&message_bytes(message.into()), secret_key, rng)
}

pub(crate) fn sign_raw<R: RngCore + CryptoRng>(
    message: &[u8],
    secret_key: &[u8],
    rng: R,
) -> Result<Vec<u8>> {
    let secret = checked_secret(secret_key)?;
    let transcript = attach_rng(signing_context(SUBSTRATE_CONTEXT).bytes(message), rng);
    Ok(secret.sign(transcript, &secret.to_public()).to_bytes().to_vec())
}

/// `sr25519Verify(message, signature, publicKey)`; `Err` where the TS throws.
pub fn sr25519_verify<'a, 'b, 'c>(
    message: impl Into<U8aLike<'a>>,
    signature: impl Into<U8aLike<'b>>,
    public_key: impl Into<U8aLike<'c>>,
) -> Result<bool> {
    let message = u8a_to_u8a(message);
    let signature = u8a_to_u8a(signature);
    let public_key = u8a_to_u8a(public_key);
    if public_key.len() != PUBLIC_KEY_LENGTH {
        return err("Invalid publicKey length, expected 32 bytes");
    }
    if signature.len() != SIGNATURE_LENGTH {
        return err("Invalid signature length, expected 64 bytes");
    }
    if signature[63] & 0b1000_0000 == 0 {
        return err("Schnorrkel marker missing");
    }
    ristretto_from_bytes(&signature[..32])?;
    let mut s = to32(&signature[32..]);
    s[31] &= 0b0111_1111;
    check_scalar_range("s", &s)?;
    let public_point = ristretto_from_bytes(&public_key)?;
    if public_point == RistrettoPoint::identity() {
        return Ok(false);
    }
    if is_zero(&s) {
        return err(INVALID_SCALAR_NON_ZERO);
    }
    let public = PublicKey::from_bytes(&public_key).map_err(schnorrkel_error)?;
    let signature = Signature::from_bytes(&signature).map_err(schnorrkel_error)?;
    Ok(public
        .verify_simple(SUBSTRATE_CONTEXT, &message, &signature)
        .is_ok())
}

fn check_chain_code(chain_code: &[u8]) -> Result<[u8; 32]> {
    if chain_code.len() != 32 {
        return err("Invalid chainCode passed to derive");
    }
    Ok(to32(chain_code))
}

/// `sr25519DeriveHard(keypair, chainCode)`.
pub fn sr25519_derive_hard(keypair: &Keypair, chain_code: &[u8]) -> Result<Keypair> {
    let chain_code = check_chain_code(chain_code)?;
    abytes("secretKey", &keypair.secret_key, SECRET_KEY_LENGTH)?;
    let key = decode_scalar(&keypair.secret_key);
    let mut transcript = merlin::Transcript::new(b"SchnorrRistrettoHDKD");
    transcript.append_message(b"sign-bytes", b"");
    transcript.append_message(b"chain-code", &chain_code);
    transcript.append_message(b"secret-key", &key);
    let mut mini_secret = [0u8; 32];
    transcript.challenge_bytes(b"HDKD-hard", &mut mini_secret);
    Ok(keypair_from_secret(&secret_from_seed(&mini_secret)?))
}

/// `sr25519DeriveSoft(keypair, chainCode)`. The derived nonce is randomised.
pub fn sr25519_derive_soft(keypair: &Keypair, chain_code: &[u8]) -> Result<Keypair> {
    sr25519_derive_soft_with_rng(keypair, chain_code, OsRng)
}

pub fn sr25519_derive_soft_with_rng<R: RngCore + CryptoRng>(
    keypair: &Keypair,
    chain_code: &[u8],
    rng: R,
) -> Result<Keypair> {
    let chain_code = check_chain_code(chain_code)?;
    abytes("secretKey", &keypair.secret_key, SECRET_KEY_LENGTH)?;
    let secret = checked_secret(&keypair.secret_key)?;
    let (derived, _) = secret.derived_key_simple_rng(ChainCode(chain_code), b"", rng);
    Ok(keypair_from_secret(&derived))
}

/// `sr25519DerivePublic(publicKey, chainCode)`: soft derivation of a public key.
pub fn sr25519_derive_public<'a>(
    public_key: impl Into<U8aLike<'a>>,
    chain_code: &[u8],
) -> Result<Vec<u8>> {
    let public_key = u8a_to_u8a(public_key);
    let chain_code = check_chain_code(chain_code)?;
    if public_key.len() != PUBLIC_KEY_LENGTH {
        return err(format!(
            "Invalid publicKey, received {} bytes, expected 32",
            public_key.len()
        ));
    }
    ristretto_from_bytes(&public_key)?;
    let public = PublicKey::from_bytes(&public_key).map_err(schnorrkel_error)?;
    let (derived, _) = public.derived_key_simple(ChainCode(chain_code), b"");
    Ok(derived.to_bytes().to_vec())
}

/// `sr25519Agreement(secretKey, publicKey)`: the shared point `publicKey * scalar`.
pub fn sr25519_agreement<'a, 'b>(
    secret_key: impl Into<U8aLike<'a>>,
    public_key: impl Into<U8aLike<'b>>,
) -> Result<Vec<u8>> {
    let secret_key = u8a_to_u8a(secret_key);
    let public_key = u8a_to_u8a(public_key);
    if public_key.len() != PUBLIC_KEY_LENGTH {
        return err(format!(
            "Invalid publicKey, received {} bytes, expected 32",
            public_key.len()
        ));
    }
    if secret_key.len() != SECRET_KEY_LENGTH {
        return err(format!(
            "Invalid secretKey, received {} bytes, expected 64",
            secret_key.len()
        ));
    }
    let scalar = decode_scalar(&secret_key);
    let point = ristretto_from_bytes(&public_key)?;
    if point == RistrettoPoint::identity() {
        return err("wrong public key (infinity)");
    }
    let scalar = check_non_zero_scalar(&scalar)?;
    Ok((point * scalar).compress().to_bytes().to_vec())
}

fn vrf_extra_transcript(extra: &[u8]) -> merlin::Transcript {
    let mut transcript = merlin::Transcript::new(b"VRF");
    if !extra.is_empty() {
        transcript.append_message(b"", extra);
    }
    transcript
}

/// `sr25519VrfSign(message, { secretKey }, context, extra)`: `output || c || s` (96 bytes).
pub fn sr25519_vrf_sign<'a, 'b, 'c>(
    message: impl Into<U8aLike<'a>>,
    secret_key: &[u8],
    context: impl Into<U8aLike<'b>>,
    extra: impl Into<U8aLike<'c>>,
) -> Result<Vec<u8>> {
    sr25519_vrf_sign_with_rng(message, secret_key, context, extra, OsRng)
}

pub fn sr25519_vrf_sign_with_rng<'a, 'b, 'c, R: RngCore + CryptoRng>(
    message: impl Into<U8aLike<'a>>,
    secret_key: &[u8],
    context: impl Into<U8aLike<'b>>,
    extra: impl Into<U8aLike<'c>>,
    rng: R,
) -> Result<Vec<u8>> {
    let message = u8a_to_u8a(message);
    let context = u8a_to_u8a(context);
    let extra = u8a_to_u8a(extra);
    if secret_key.len() != SECRET_KEY_LENGTH {
        return err("Invalid secretKey length, expected 64 bytes");
    }
    let keypair = checked_secret(secret_key)?.to_keypair();
    let transcript = signing_context(&context).bytes(&message);
    let (in_out, proof, _) =
        keypair.vrf_sign_extra(transcript, attach_rng(vrf_extra_transcript(&extra), rng));
    Ok([
        in_out.to_preout().to_bytes().as_slice(),
        proof.to_bytes().as_slice(),
    ]
    .concat())
}

/// `sr25519VrfVerify(message, signOutput, publicKey, context, extra)`.
pub fn sr25519_vrf_verify<'a, 'b, 'c, 'd, 'e>(
    message: impl Into<U8aLike<'a>>,
    sign_output: impl Into<U8aLike<'b>>,
    public_key: impl Into<U8aLike<'c>>,
    context: impl Into<U8aLike<'d>>,
    extra: impl Into<U8aLike<'e>>,
) -> Result<bool> {
    let message = u8a_to_u8a(message);
    let output = u8a_to_u8a(sign_output);
    let public_key = u8a_to_u8a(public_key);
    let context = u8a_to_u8a(context);
    let extra = u8a_to_u8a(extra);
    if public_key.len() != PUBLIC_KEY_LENGTH {
        return err("Invalid publicKey length, expected 32 bytes");
    }
    if output.len() != VRF_OUTPUT_LENGTH {
        return err("Invalid vrfSign output length, expected 96 bytes");
    }
    let public_point = ristretto_from_bytes(&public_key)?;
    if public_point == RistrettoPoint::identity() {
        return Ok(false);
    }
    let c = to32(&output[32..64]);
    let s = to32(&output[64..96]);
    check_scalar_range("signature.c", &c)?;
    check_scalar_range("signature.s", &s)?;
    let output_point = ristretto_from_bytes(&output[..32])?;
    if output_point == RistrettoPoint::identity() {
        return err("vrf.verify: wrong output point (identity)");
    }
    if is_zero(&c) || is_zero(&s) {
        return err(INVALID_SCALAR_NON_ZERO);
    }
    let public = PublicKey::from_bytes(&public_key).map_err(schnorrkel_error)?;
    let preout = VRFPreOut::from_bytes(&output[..32]).map_err(schnorrkel_error)?;
    let proof = VRFProof::from_bytes(&output[32..]).map_err(schnorrkel_error)?;
    let transcript = signing_context(&context).bytes(&message);
    Ok(public
        .vrf_verify_extra(transcript, &preout, &proof, vrf_extra_transcript(&extra))
        .is_ok())
}

/// The public key for a 64-byte secret (`getPublicKey`).
pub fn sr25519_public_from_secret(secret_key: &[u8]) -> Result<Vec<u8>> {
    abytes("secretKey", secret_key, SECRET_KEY_LENGTH)?;
    Ok(checked_secret(secret_key)?.to_public().to_bytes().to_vec())
}
