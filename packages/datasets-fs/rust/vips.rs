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

//! The resize the TS does with sharp 0.35.5, as sharp's pipeline (src/pipeline.cc) runs it
//! for `resize({ width, height, fit })`, `removeAlpha()`, `toColorspace("srgb")` and the
//! `jpeg()` options of the resize command, calling the libvips sharp bundles.
//!
//! The bytes match sharp's only with the same libvips build (8.18.7 with mozjpeg, from
//! `@img/sharp-libvips-<platform>`): a distribution libvips encodes JPEGs with libjpeg-turbo,
//! which ignores trellis quantisation and scan optimisation. The library is loaded at run time,
//! from `PROSOPO_LIBVIPS` or next to this package's `sharp`, so the other commands need none.

use libloading::Library;
use std::ffi::{c_char, c_int, c_void, CStr, CString};
use std::path::{Path, PathBuf};
use std::ptr;
use std::sync::OnceLock;

pub const LIBVIPS_ENV: &str = "PROSOPO_LIBVIPS";

/// sharp's default `limitInputPixels`.
const LIMIT_INPUT_PIXELS: u64 = 0x3FFF * 0x3FFF;
/// sharp's default `limitInputChannels`.
const LIMIT_INPUT_CHANNELS: c_int = 5;
const JPEG_MAX_DIMENSION: c_int = 65535;

#[repr(C)]
struct VipsImage {
    _opaque: [u8; 0],
}

type GType = usize;
type Out = *mut *mut VipsImage;
type Image = *mut VipsImage;
type LogHandler = unsafe extern "C" fn(*const c_char, c_int, *const c_char, *mut c_void);

const G_LOG_LEVEL_WARNING: c_int = 1 << 4;

/// sharp queues libvips's warnings for its debug log and nothing else sees them.
unsafe extern "C" fn discard_warning(
    _domain: *const c_char,
    _level: c_int,
    _message: *const c_char,
    _data: *mut c_void,
) {
}

/// The input formats the resize accepts: the ones sharp opens with no density, scale or
/// primary-page handling of their own.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ImageType {
    Jpeg,
    Png,
    Webp,
    Gif,
    Tiff,
}

impl ImageType {
    /// sharp's `loaderToType`, for the formats above.
    fn from_loader(loader: &str) -> Option<ImageType> {
        match loader {
            "VipsForeignLoadJpegBuffer" | "VipsForeignLoadUhdrBuffer" => Some(ImageType::Jpeg),
            "VipsForeignLoadPngBuffer" => Some(ImageType::Png),
            "VipsForeignLoadWebpBuffer" => Some(ImageType::Webp),
            "VipsForeignLoadGifBuffer" | "VipsForeignLoadNsgifBuffer" => Some(ImageType::Gif),
            "VipsForeignLoadTiffBuffer" => Some(ImageType::Tiff),
            _ => None,
        }
    }

    /// `ImageTypeSupportsPage`.
    fn has_pages(self) -> bool {
        matches!(self, ImageType::Webp | ImageType::Gif | ImageType::Tiff)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Fit {
    /// `fit: "cover"`: sharp's crop canvas, centred.
    Cover,
    /// `fit: "inside"`: sharp's max canvas.
    Inside,
}

struct Enums {
    access_sequential: c_int,
    fail_on_warning: c_int,
    kernel_lanczos3: c_int,
    interpretation_srgb: c_int,
    interpretation_rgb16: c_int,
    interpretation_grey16: c_int,
    interpretation_labs: c_int,
    interpretation_cmyk: c_int,
    format_ushort: c_int,
    intent_perceptual: c_int,
    subsample_on: c_int,
    blob_type: GType,
}

macro_rules! vips_functions {
    ($($name:ident: $ty:ty;)+) => {
        #[allow(non_snake_case)]
        struct Functions {
            $($name: $ty,)+
        }

        impl Functions {
            fn load(library: &Library) -> Result<Functions, String> {
                // SAFETY: each symbol is looked up with the signature libvips 8.18 declares.
                unsafe {
                    Ok(Functions {
                        $($name: *library
                            .get::<$ty>(concat!(stringify!($name), "\0").as_bytes())
                            .map_err(|error| format!("libvips has no {}: {error}", stringify!($name)))?,)+
                    })
                }
            }
        }
    };
}

vips_functions! {
    vips_init: unsafe extern "C" fn(*const c_char) -> c_int;
    vips_error_buffer: unsafe extern "C" fn() -> *const c_char;
    vips_error_clear: unsafe extern "C" fn();
    vips_enum_from_nick: unsafe extern "C" fn(*const c_char, GType, *const c_char) -> c_int;
    vips_access_get_type: unsafe extern "C" fn() -> GType;
    vips_fail_on_get_type: unsafe extern "C" fn() -> GType;
    vips_kernel_get_type: unsafe extern "C" fn() -> GType;
    vips_interpretation_get_type: unsafe extern "C" fn() -> GType;
    vips_band_format_get_type: unsafe extern "C" fn() -> GType;
    vips_intent_get_type: unsafe extern "C" fn() -> GType;
    vips_foreign_subsample_get_type: unsafe extern "C" fn() -> GType;
    vips_blob_get_type: unsafe extern "C" fn() -> GType;
    vips_foreign_find_load_buffer: unsafe extern "C" fn(*const c_void, usize) -> *const c_char;
    vips_image_new_from_buffer: unsafe extern "C" fn(*const c_void, usize, *const c_char, ...) -> Image;
    vips_jpegload_buffer: unsafe extern "C" fn(*mut c_void, usize, Out, ...) -> c_int;
    vips_webpload_buffer: unsafe extern "C" fn(*mut c_void, usize, Out, ...) -> c_int;
    vips_image_get_width: unsafe extern "C" fn(Image) -> c_int;
    vips_image_get_height: unsafe extern "C" fn(Image) -> c_int;
    vips_image_get_bands: unsafe extern "C" fn(Image) -> c_int;
    vips_image_get_interpretation: unsafe extern "C" fn(Image) -> c_int;
    vips_image_get_format: unsafe extern "C" fn(Image) -> c_int;
    vips_image_get_page_height: unsafe extern "C" fn(Image) -> c_int;
    vips_image_hasalpha: unsafe extern "C" fn(Image) -> c_int;
    vips_image_get_typeof: unsafe extern "C" fn(Image, *const c_char) -> GType;
    vips_icc_transform: unsafe extern "C" fn(Image, Out, *const c_char, ...) -> c_int;
    vips_premultiply: unsafe extern "C" fn(Image, Out, ...) -> c_int;
    vips_unpremultiply: unsafe extern "C" fn(Image, Out, ...) -> c_int;
    vips_cast: unsafe extern "C" fn(Image, Out, c_int, ...) -> c_int;
    vips_resize: unsafe extern "C" fn(Image, Out, f64, ...) -> c_int;
    vips_extract_area: unsafe extern "C" fn(Image, Out, c_int, c_int, c_int, c_int, ...) -> c_int;
    vips_extract_band: unsafe extern "C" fn(Image, Out, c_int, ...) -> c_int;
    vips_colourspace: unsafe extern "C" fn(Image, Out, c_int, ...) -> c_int;
    vips_jpegsave: unsafe extern "C" fn(Image, *const c_char, ...) -> c_int;
    g_object_unref: unsafe extern "C" fn(*mut c_void);
    g_log_set_handler: unsafe extern "C" fn(*const c_char, c_int, LogHandler, *mut c_void) -> u32;
}

pub struct Vips {
    _library: Library,
    f: Functions,
    enums: Enums,
}

// SAFETY: libvips is thread-safe once initialised, and the handles held here are immutable.
unsafe impl Send for Vips {}
unsafe impl Sync for Vips {}

const NULL: *const c_void = ptr::null();
const TRUE: c_int = 1;

/// Where `@img/sharp-libvips-<platform>` puts the library, beside this package's `sharp`.
fn bundled_library() -> Option<PathBuf> {
    let sharp: PathBuf =
        std::fs::canonicalize(Path::new(env!("CARGO_MANIFEST_DIR")).join("node_modules/sharp"))
            .ok()?;
    let platform: String = format!("sharp-libvips-{}-{}", std::env::consts::OS, node_arch());
    let lib: PathBuf = sharp.parent()?.join("@img").join(platform).join("lib");
    std::fs::read_dir(&lib).ok()?.find_map(|entry| {
        let path: PathBuf = entry.ok()?.path();
        let name: String = path.file_name()?.to_string_lossy().into_owned();
        name.starts_with("libvips-cpp.").then_some(path)
    })
}

fn node_arch() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        other => other,
    }
}

/// The library `PROSOPO_LIBVIPS` names, or the one sharp bundles.
pub fn library_path() -> Option<PathBuf> {
    std::env::var_os(LIBVIPS_ENV)
        .map(PathBuf::from)
        .or_else(bundled_library)
}

impl Vips {
    /// The process's libvips, loaded and initialised on first use.
    pub fn get() -> Result<&'static Vips, String> {
        static VIPS: OnceLock<Result<Vips, String>> = OnceLock::new();
        VIPS.get_or_init(|| {
            let path: PathBuf = library_path().ok_or_else(|| {
                format!("no libvips found: set {LIBVIPS_ENV} to sharp's libvips-cpp library")
            })?;
            Vips::load(&path)
        })
        .as_ref()
        .map_err(Clone::clone)
    }

    fn load(path: &Path) -> Result<Vips, String> {
        // SAFETY: loading a shared library runs its initialisers; libvips has no others.
        let library: Library = unsafe { Library::new(path) }
            .map_err(|error| format!("cannot load libvips from {}: {error}", path.display()))?;
        let f: Functions = Functions::load(&library)?;
        // SAFETY: the functions were resolved from the loaded library above.
        unsafe {
            if (f.vips_init)(c"sharp".as_ptr()) != 0 {
                return Err("libvips failed to initialise".to_string());
            }
            (f.g_log_set_handler)(
                c"VIPS".as_ptr(),
                G_LOG_LEVEL_WARNING,
                discard_warning,
                ptr::null_mut(),
            );
            let nick = |ty: GType, nick: &CStr| -> c_int {
                (f.vips_enum_from_nick)(c"prosopo".as_ptr(), ty, nick.as_ptr())
            };
            let interpretation: GType = (f.vips_interpretation_get_type)();
            let enums: Enums = Enums {
                access_sequential: nick((f.vips_access_get_type)(), c"sequential"),
                fail_on_warning: nick((f.vips_fail_on_get_type)(), c"warning"),
                kernel_lanczos3: nick((f.vips_kernel_get_type)(), c"lanczos3"),
                interpretation_srgb: nick(interpretation, c"srgb"),
                interpretation_rgb16: nick(interpretation, c"rgb16"),
                interpretation_grey16: nick(interpretation, c"grey16"),
                interpretation_labs: nick(interpretation, c"labs"),
                interpretation_cmyk: nick(interpretation, c"cmyk"),
                format_ushort: nick((f.vips_band_format_get_type)(), c"ushort"),
                intent_perceptual: nick((f.vips_intent_get_type)(), c"perceptual"),
                subsample_on: nick((f.vips_foreign_subsample_get_type)(), c"on"),
                blob_type: (f.vips_blob_get_type)(),
            };
            Ok(Vips {
                _library: library,
                f,
                enums,
            })
        }
    }

    fn error(&self) -> String {
        // SAFETY: vips_error_buffer returns libvips's own NUL-terminated buffer.
        unsafe {
            let message: String = CStr::from_ptr((self.f.vips_error_buffer)())
                .to_string_lossy()
                .trim_end()
                .to_string();
            (self.f.vips_error_clear)();
            message
        }
    }

    /// A new image from an operation that writes to `out`, or the libvips error.
    fn take<'v>(&'v self, status: c_int, out: Image) -> Result<Owned<'v>, String> {
        if status != 0 || out.is_null() {
            return Err(self.error());
        }
        Ok(Owned {
            vips: self,
            image: out,
        })
    }

    /// Resizes an encoded image to `size` and writes it to `output` as sharp's resize
    /// command does.
    pub fn resize_to_jpeg(
        &self,
        input: &[u8],
        size: c_int,
        fit: Fit,
        output: &Path,
    ) -> Result<(), String> {
        let output: CString = CString::new(output.to_string_lossy().as_bytes())
            .map_err(|_| "output path has a NUL byte".to_string())?;
        // SAFETY: every libvips call below gets images this function owns and NULL-terminated
        // option lists of the types libvips reads for those names.
        unsafe { self.pipeline(input, size, fit, &output) }
    }

    unsafe fn pipeline(
        &self,
        input: &[u8],
        size: c_int,
        fit: Fit,
        output: &CStr,
    ) -> Result<(), String> {
        let f: &Functions = &self.f;
        let e: &Enums = &self.enums;
        let buffer: *mut c_void = input.as_ptr() as *mut c_void;
        let loader: *const c_char = (f.vips_foreign_find_load_buffer)(buffer, input.len());
        let image_type: ImageType = if loader.is_null() {
            None
        } else {
            ImageType::from_loader(&CStr::from_ptr(loader).to_string_lossy())
        }
        .ok_or_else(|| {
            (f.vips_error_clear)();
            "Input buffer contains unsupported image format".to_string()
        })?;
        let opened: Image = if image_type.has_pages() {
            (f.vips_image_new_from_buffer)(
                buffer,
                input.len(),
                c"".as_ptr(),
                c"access".as_ptr(),
                e.access_sequential,
                c"fail_on".as_ptr(),
                e.fail_on_warning,
                c"n".as_ptr(),
                1 as c_int,
                c"page".as_ptr(),
                0 as c_int,
                NULL,
            )
        } else {
            (f.vips_image_new_from_buffer)(
                buffer,
                input.len(),
                c"".as_ptr(),
                c"access".as_ptr(),
                e.access_sequential,
                c"fail_on".as_ptr(),
                e.fail_on_warning,
                NULL,
            )
        };
        if opened.is_null() {
            return Err(format!("Input buffer has corrupt header: {}", self.error()));
        }
        let mut image: Owned<'_> = Owned {
            vips: self,
            image: opened,
        };
        if (image.width() as u64) * (image.height() as u64) > LIMIT_INPUT_PIXELS {
            return Err("Input image exceeds pixel limit".to_string());
        }
        if image.bands() > LIMIT_INPUT_CHANNELS {
            return Err("Input image exceeds channel limit".to_string());
        }

        let (hshrink, vshrink): (f64, f64) =
            resolve_shrink(image.width(), image.height(), size, fit);
        let shrink: f64 = hshrink.min(vshrink);
        let mut jpeg_shrink_on_load: c_int = 1;
        let mut scale: f64 = 1.0;
        if image_type == ImageType::Jpeg {
            if shrink >= 8.0 {
                jpeg_shrink_on_load = 8;
            } else if shrink >= 4.0 {
                jpeg_shrink_on_load = 4;
            } else if shrink >= 2.0 {
                jpeg_shrink_on_load = 2;
            }
            if jpeg_shrink_on_load > 1 && shrink as c_int == jpeg_shrink_on_load {
                jpeg_shrink_on_load /= 2;
            }
        } else if image_type == ImageType::Webp && shrink > 1.0 {
            scale = 1.0 / shrink;
        }
        if jpeg_shrink_on_load > 1 {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_jpegload_buffer)(
                buffer,
                input.len(),
                &mut out,
                c"access".as_ptr(),
                e.access_sequential,
                c"fail_on".as_ptr(),
                e.fail_on_warning,
                c"shrink".as_ptr(),
                jpeg_shrink_on_load,
                NULL,
            );
            image = self.take(status, out)?;
        } else if scale != 1.0 {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_webpload_buffer)(
                buffer,
                input.len(),
                &mut out,
                c"access".as_ptr(),
                e.access_sequential,
                c"fail_on".as_ptr(),
                e.fail_on_warning,
                c"n".as_ptr(),
                1 as c_int,
                c"page".as_ptr(),
                0 as c_int,
                c"scale".as_ptr(),
                scale,
                NULL,
            );
            image = self.take(status, out)?;
        }

        let page_height: c_int = (f.vips_image_get_page_height)(image.image);
        let (hshrink, vshrink): (f64, f64) = resolve_shrink(image.width(), page_height, size, fit);

        let interpretation: c_int = image.interpretation();
        let processing_profile: &CStr = if interpretation == e.interpretation_rgb16 {
            c"p3"
        } else {
            c"srgb"
        };
        let has_profile: bool =
            (f.vips_image_get_typeof)(image.image, c"icc-profile-data".as_ptr()) == e.blob_type;
        if has_profile
            && interpretation != e.interpretation_labs
            && interpretation != e.interpretation_grey16
        {
            let depth: c_int = if self.is_16_bit(interpretation) {
                16
            } else {
                8
            };
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_icc_transform)(
                image.image,
                &mut out,
                processing_profile.as_ptr(),
                c"embedded".as_ptr(),
                TRUE,
                c"depth".as_ptr(),
                depth,
                c"intent".as_ptr(),
                e.intent_perceptual,
                NULL,
            );
            match self.take(status, out) {
                Ok(transformed) => image = transformed,
                Err(_) => (f.vips_error_clear)(),
            }
        } else if interpretation == e.interpretation_cmyk {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_icc_transform)(
                image.image,
                &mut out,
                processing_profile.as_ptr(),
                c"input_profile".as_ptr(),
                c"cmyk".as_ptr(),
                c"intent".as_ptr(),
                e.intent_perceptual,
                NULL,
            );
            image = self.take(status, out)?;
        }

        let should_resize: bool = hshrink != 1.0 || vshrink != 1.0;
        let premultiply_format: c_int = image.format();
        let premultiplied: bool = image.has_alpha() && should_resize;
        if premultiplied {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_premultiply)(image.image, &mut out, NULL);
            image = self.take(status, out)?;
            image = image.cast(premultiply_format)?;
        }
        if should_resize {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_resize)(
                image.image,
                &mut out,
                1.0 / hshrink,
                c"vscale".as_ptr(),
                1.0 / vshrink,
                c"kernel".as_ptr(),
                e.kernel_lanczos3,
                NULL,
            );
            image = self.take(status, out)?;
        }

        let (width, height): (c_int, c_int) = (image.width(), image.height());
        if fit == Fit::Cover && (width != size || height != size) {
            let crop_width: c_int = width.min(size);
            let crop_height: c_int = height.min(size);
            let left: c_int = (width - crop_width + 1) / 2;
            let top: c_int = (height - crop_height + 1) / 2;
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_extract_area)(
                image.image,
                &mut out,
                left,
                top,
                crop_width,
                crop_height,
                NULL,
            );
            image = self.take(status, out)?;
        }

        if premultiplied {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_unpremultiply)(image.image, &mut out, NULL);
            image = self.take(status, out)?;
            image = image.cast(premultiply_format)?;
        }
        while image.bands() > 1 && image.has_alpha() {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_extract_band)(
                image.image,
                &mut out,
                0,
                c"n".as_ptr(),
                image.bands() - 1,
                NULL,
            );
            image = self.take(status, out)?;
        }
        if self.is_16_bit(image.interpretation()) {
            image = image.cast(e.format_ushort)?;
        }
        let interpretation: c_int = image.interpretation();
        if interpretation != e.interpretation_srgb {
            let mut out: Image = ptr::null_mut();
            let status: c_int = (f.vips_colourspace)(
                image.image,
                &mut out,
                e.interpretation_srgb,
                c"source_space".as_ptr(),
                interpretation,
                NULL,
            );
            image = self.take(status, out)?;
        }

        if image.width() > JPEG_MAX_DIMENSION || image.height() > JPEG_MAX_DIMENSION {
            return Err("Processed image is too large for the JPEG format".to_string());
        }
        let status: c_int = (f.vips_jpegsave)(
            image.image,
            output.as_ptr(),
            c"keep".as_ptr(),
            0 as c_int,
            c"Q".as_ptr(),
            75 as c_int,
            c"interlace".as_ptr(),
            TRUE,
            c"subsample_mode".as_ptr(),
            e.subsample_on,
            c"trellis_quant".as_ptr(),
            TRUE,
            c"quant_table".as_ptr(),
            3 as c_int,
            c"overshoot_deringing".as_ptr(),
            TRUE,
            c"optimize_scans".as_ptr(),
            TRUE,
            c"optimize_coding".as_ptr(),
            TRUE,
            NULL,
        );
        if status != 0 {
            return Err(self.error());
        }
        Ok(())
    }

    /// `Is16Bit`.
    fn is_16_bit(&self, interpretation: c_int) -> bool {
        interpretation == self.enums.interpretation_rgb16
            || interpretation == self.enums.interpretation_grey16
    }
}

/// sharp's `ResolveShrink` for a fixed square target, neither enlargement nor reduction
/// withheld.
fn resolve_shrink(width: c_int, height: c_int, size: c_int, fit: Fit) -> (f64, f64) {
    let hshrink: f64 = f64::from(width) / f64::from(size);
    let vshrink: f64 = f64::from(height) / f64::from(size);
    let shrink: f64 = match fit {
        Fit::Cover => hshrink.min(vshrink),
        Fit::Inside => hshrink.max(vshrink),
    };
    (shrink.min(f64::from(width)), shrink.min(f64::from(height)))
}

/// An image this code holds a reference to.
struct Owned<'a> {
    vips: &'a Vips,
    image: Image,
}

impl<'a> Owned<'a> {
    fn width(&self) -> c_int {
        // SAFETY: `image` is a live VipsImage.
        unsafe { (self.vips.f.vips_image_get_width)(self.image) }
    }

    fn height(&self) -> c_int {
        // SAFETY: as above.
        unsafe { (self.vips.f.vips_image_get_height)(self.image) }
    }

    fn bands(&self) -> c_int {
        // SAFETY: as above.
        unsafe { (self.vips.f.vips_image_get_bands)(self.image) }
    }

    fn interpretation(&self) -> c_int {
        // SAFETY: as above.
        unsafe { (self.vips.f.vips_image_get_interpretation)(self.image) }
    }

    fn format(&self) -> c_int {
        // SAFETY: as above.
        unsafe { (self.vips.f.vips_image_get_format)(self.image) }
    }

    fn has_alpha(&self) -> bool {
        // SAFETY: as above.
        unsafe { (self.vips.f.vips_image_hasalpha)(self.image) != 0 }
    }

    fn cast(&self, format: c_int) -> Result<Owned<'a>, String> {
        let mut out: Image = ptr::null_mut();
        // SAFETY: as above, with a NULL-terminated option list.
        let status: c_int = unsafe { (self.vips.f.vips_cast)(self.image, &mut out, format, NULL) };
        self.vips.take(status, out)
    }
}

impl Drop for Owned<'_> {
    fn drop(&mut self) {
        // SAFETY: this holds one reference to `image`, released once.
        unsafe { (self.vips.f.g_object_unref)(self.image.cast()) }
    }
}
