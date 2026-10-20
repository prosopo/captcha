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

// Rust-only: the encoder is libwebp/png rather than sharp (MIGRATION.md §4.7),
// so the bytes are not comparable to the TS; these pin what is comparable.

use crate::{
    create_background, encode_background, encode_piece, encode_png, render_puzzle_to_rgba,
    to_data_uri, NotchPlacement, PuzzleAssetsError, RgbaImage, DEFAULT_GEOMETRY,
    DEFAULT_RENDER_SETTINGS,
};

fn rendered() -> (RgbaImage, RgbaImage) {
    let seed = hex::decode("00112233445566778899aabbccddeeff").unwrap();
    let background = create_background(&DEFAULT_GEOMETRY, &seed).unwrap();
    let out = render_puzzle_to_rgba(
        background,
        &NotchPlacement {
            target_x: 191.0,
            target_y: 77.0,
        },
        &DEFAULT_GEOMETRY,
        &DEFAULT_RENDER_SETTINGS,
        Some(seed),
    )
    .unwrap();
    (out.background, out.piece)
}

#[test]
fn lossless_piece_decodes_to_the_exact_rgba() {
    let (_, piece) = rendered();
    let webp = encode_piece(&piece).unwrap();
    let decoded = webp::Decoder::new(&webp).decode().unwrap();
    assert_eq!(
        (decoded.width(), decoded.height()),
        (piece.width, piece.height)
    );
    assert!(decoded.is_alpha());
    assert_eq!(&*decoded, piece.data.as_slice());
}

#[test]
fn lossy_background_decodes_to_the_right_dimensions() {
    let (background, _) = rendered();
    let webp = encode_background(&background).unwrap();
    assert_eq!(&webp[0..4], b"RIFF");
    assert_eq!(&webp[8..12], b"WEBP");
    let decoded = webp::Decoder::new(&webp).decode().unwrap();
    assert_eq!(
        (decoded.width(), decoded.height()),
        (background.width, background.height)
    );
}

#[test]
fn encoding_is_deterministic() {
    let (background, piece) = rendered();
    assert_eq!(
        encode_background(&background).unwrap(),
        encode_background(&background).unwrap()
    );
    assert_eq!(encode_piece(&piece).unwrap(), encode_piece(&piece).unwrap());
}

#[test]
fn png_round_trips_the_exact_rgba() {
    let (_, piece) = rendered();
    let bytes = encode_png(&piece).unwrap();
    let mut reader = png::Decoder::new(bytes.as_slice()).read_info().unwrap();
    let mut buffer = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buffer).unwrap();
    assert_eq!((info.width, info.height), (piece.width, piece.height));
    assert_eq!(info.color_type, png::ColorType::Rgba);
    assert_eq!(&buffer[..info.buffer_size()], piece.data.as_slice());
}

#[test]
fn rejects_a_buffer_that_does_not_match_its_dimensions() {
    let image = RgbaImage {
        data: vec![0; 10],
        width: 2,
        height: 2,
    };
    for result in [
        encode_background(&image),
        encode_piece(&image),
        encode_png(&image),
    ] {
        assert!(matches!(result, Err(PuzzleAssetsError::Encode(_))));
    }
}

#[test]
fn builds_a_webp_data_uri() {
    assert_eq!(to_data_uri(b"RIFF"), "data:image/webp;base64,UklGRg==");
}
