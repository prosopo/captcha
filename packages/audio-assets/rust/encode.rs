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

use base64::Engine;

use crate::jsmath;
use crate::types::AudioBuffer;
use crate::AudioAssetsError;

const RIFF_HEADER_BYTES: usize = 44;
const RIFF_PREAMBLE_BYTES: usize = 8;
const FMT_CHUNK_BYTES: u32 = 16;
const BITS_PER_SAMPLE: u16 = 16;
const BYTES_PER_SAMPLE: usize = (BITS_PER_SAMPLE / 8) as usize;
const CHANNELS: u16 = 1;
const PCM_FORMAT_TAG: u16 = 1;
// Symmetric for both signs so decoding is the exact inverse of encoding.
const INT16_SCALE: f64 = 32767.0;

/// `Buffer#writeUInt32LE`, which rejects values past the field's width.
fn put_u32(out: &mut [u8], value: u64, offset: usize) -> Result<(), AudioAssetsError> {
    let value = u32::try_from(value).map_err(|_| AudioAssetsError::OutOfRange { received: value })?;
    out[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    Ok(())
}

fn put_u16(out: &mut [u8], value: u16, offset: usize) {
    out[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
}

/// Uncompressed WAV because every browser plays 16-bit PCM with no codec
/// dependency or artefacts that could be mistaken for the challenge.
pub fn encode_wav(buffer: &AudioBuffer) -> Result<Vec<u8>, AudioAssetsError> {
    let samples = &buffer.samples;
    let sample_rate = u64::from(buffer.sample_rate);
    let data_bytes = samples.len() * BYTES_PER_SAMPLE;
    let mut out = vec![0u8; RIFF_HEADER_BYTES + data_bytes];

    out[0..4].copy_from_slice(b"RIFF");
    put_u32(
        &mut out,
        (RIFF_HEADER_BYTES - RIFF_PREAMBLE_BYTES + data_bytes) as u64,
        4,
    )?;
    out[8..12].copy_from_slice(b"WAVE");

    out[12..16].copy_from_slice(b"fmt ");
    put_u32(&mut out, u64::from(FMT_CHUNK_BYTES), 16)?;
    put_u16(&mut out, PCM_FORMAT_TAG, 20);
    put_u16(&mut out, CHANNELS, 22);
    put_u32(&mut out, sample_rate, 24)?;
    put_u32(
        &mut out,
        sample_rate * u64::from(CHANNELS) * BYTES_PER_SAMPLE as u64,
        28,
    )?;
    put_u16(&mut out, CHANNELS * BYTES_PER_SAMPLE as u16, 32);
    put_u16(&mut out, BITS_PER_SAMPLE, 34);

    out[36..40].copy_from_slice(b"data");
    put_u32(&mut out, data_bytes as u64, 40)?;

    for (slot, &sample) in out[RIFF_HEADER_BYTES..]
        .as_chunks_mut::<BYTES_PER_SAMPLE>()
        .0
        .iter_mut()
        .zip(samples.iter())
    {
        // Clamp first: an overshoot would otherwise wrap to the opposite rail.
        let clamped = jsmath::max(-1.0, jsmath::min(1.0, f64::from(sample)));
        // NaN casts to 0, which is what `writeInt16LE` stores for it.
        let value = jsmath::round(clamped * INT16_SCALE) as i16;
        *slot = value.to_le_bytes();
    }

    Ok(out)
}

pub fn to_data_uri(wav: &[u8]) -> String {
    format!(
        "data:audio/wav;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(wav)
    )
}
