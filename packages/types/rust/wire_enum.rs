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

//! `wire_enum!`: a TS string enum whose values go over the wire or into the database.

use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnknownEnumValue {
    pub enum_name: &'static str,
    pub value: String,
}

impl fmt::Display for UnknownEnumValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?} is not a {}", self.value, self.enum_name)
    }
}

impl std::error::Error for UnknownEnumValue {}

/// Each variant is written `Variant: "tsKey" = "value"`: the TS member name (kept for the
/// generated TypeScript) and the string value, which serde uses. Exported so a crate that
/// owns a TS enum (user-access-policy, for one) defines it the same way.
#[macro_export]
macro_rules! wire_enum {
    (
        $(#[$($meta:tt)*])*
        $vis:vis enum $name:ident {
            $($(#[$($variant_meta:tt)*])* $variant:ident : $key:literal = $value:literal),+ $(,)?
        }
    ) => {
        $(#[$($meta)*])*
        #[derive(
            Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord,
            serde::Serialize, serde::Deserialize,
        )]
        $vis enum $name {
            $($(#[$($variant_meta)*])* #[serde(rename = $value)] $variant),+
        }

        impl $name {
            /// In TS declaration order.
            pub const ALL: [$name; [$($value),+].len()] = [$($name::$variant),+];
            /// The TS member names, in the same order.
            pub const TS_KEYS: [&'static str; [$($key),+].len()] = [$($key),+];
            /// The enum's doc comment, for the generated TypeScript.
            pub const TS_DOC: &'static str = $crate::ts_doc!($(#[$($meta)*])*);
            /// Each member's doc comment, in the same order.
            pub const TS_DOCS: [&'static str; [$($value),+].len()] = [$($crate::ts_doc!($(#[$($variant_meta)*])*)),+];

            pub const fn as_str(self) -> &'static str {
                match self {
                    $($name::$variant => $value),+
                }
            }

            /// `nativeEnum(...)`.
            pub fn schema() -> prosopo_api_route::schema::Schema {
                prosopo_api_route::schema::native_enum(&[$($value),+])
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str(self.as_str())
            }
        }

        impl std::str::FromStr for $name {
            type Err = $crate::UnknownEnumValue;

            fn from_str(value: &str) -> ::std::result::Result<$name, Self::Err> {
                $name::ALL
                    .into_iter()
                    .find(|variant| variant.as_str() == value)
                    .ok_or_else(|| $crate::UnknownEnumValue {
                        enum_name: stringify!($name),
                        value: value.to_string(),
                    })
            }
        }
    };
}

/// The doc comment among some attributes, a line per `///`.
#[macro_export]
#[doc(hidden)]
macro_rules! ts_doc {
    () => {
        ""
    };
    (#[doc = $doc:literal] $($rest:tt)*) => {
        concat!($doc, "\n", $crate::ts_doc!($($rest)*))
    };
    (#[$($other:tt)*] $($rest:tt)*) => {
        $crate::ts_doc!($($rest)*)
    };
}

pub(crate) use wire_enum;
