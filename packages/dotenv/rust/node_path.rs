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

//! The POSIX subset of Node's `path` module. The TS compares and returns paths as normalised
//! strings, so `..` is resolved lexically (as Node does) rather than through the file system.

fn normalize_segments(path: &str, allow_above_root: bool) -> String {
    let mut segments: Vec<&str> = Vec::new();
    for segment in path.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                if segments.last().is_some_and(|last| *last != "..") {
                    segments.pop();
                } else if allow_above_root {
                    segments.push("..");
                }
            }
            other => segments.push(other),
        }
    }
    segments.join("/")
}

/// `path.normalize`.
pub fn normalize(path: &str) -> String {
    if path.is_empty() {
        return ".".to_string();
    }
    let is_absolute = path.starts_with('/');
    let trailing_separator = path.ends_with('/');
    let mut normalized = normalize_segments(path, !is_absolute);
    if normalized.is_empty() {
        if is_absolute {
            return "/".to_string();
        }
        return if trailing_separator { "./" } else { "." }.to_string();
    }
    if trailing_separator {
        normalized.push('/');
    }
    if is_absolute {
        format!("/{normalized}")
    } else {
        normalized
    }
}

/// `path.join`: empty segments are skipped, and joining nothing gives `"."`.
pub fn join(segments: &[&str]) -> String {
    let joined: Vec<&str> = segments.iter().copied().filter(|s| !s.is_empty()).collect();
    if joined.is_empty() {
        return ".".to_string();
    }
    normalize(&joined.join("/"))
}

/// `path.resolve`, with `cwd` standing in for `process.cwd()`.
pub fn resolve(cwd: &str, segments: &[&str]) -> String {
    let mut resolved = String::new();
    let mut resolved_absolute = false;
    for segment in segments.iter().rev().copied().chain(std::iter::once(cwd)) {
        if segment.is_empty() {
            continue;
        }
        resolved = if resolved.is_empty() {
            segment.to_string()
        } else {
            format!("{segment}/{resolved}")
        };
        if segment.starts_with('/') {
            resolved_absolute = true;
            break;
        }
    }
    let normalized = normalize_segments(&resolved, !resolved_absolute);
    if resolved_absolute {
        format!("/{normalized}")
    } else if normalized.is_empty() {
        ".".to_string()
    } else {
        normalized
    }
}

#[cfg(test)]
mod tests {
    use super::{join, normalize, resolve};

    #[test]
    fn normalize_matches_node() {
        let cases: [(&str, &str); 12] = [
            ("", "."),
            ("/", "/"),
            ("//", "/"),
            ("a/b/../c", "a/c"),
            ("a/b/", "a/b/"),
            ("../a", "../a"),
            ("a/../..", ".."),
            ("/../a", "/a"),
            ("./", "./"),
            ("a/..", "."),
            ("a/../", "./"),
            ("/a/./b/.", "/a/b"),
        ];
        for (input, expected) in cases {
            assert_eq!(normalize(input), expected, "normalize({input:?})");
        }
    }

    #[test]
    fn join_matches_node() {
        assert_eq!(join(&[]), ".");
        assert_eq!(join(&["", ""]), ".");
        assert_eq!(join(&["", "x"]), "x");
        assert_eq!(join(&["/a", "b/", "../c"]), "/a/c");
        assert_eq!(join(&["/a", ""]), "/a");
        assert_eq!(join(&["a", ".env/"]), "a/.env/");
    }

    #[test]
    fn resolve_matches_node() {
        assert_eq!(resolve("/cwd", &["."]), "/cwd");
        assert_eq!(resolve("/cwd", &["a", "../b"]), "/cwd/b");
        assert_eq!(resolve("/cwd", &["/abs", "x"]), "/abs/x");
        assert_eq!(resolve("/", &[".."]), "/");
        assert_eq!(resolve("/a/b/", &[".."]), "/a");
        assert_eq!(resolve("/cwd", &[""]), "/cwd");
    }
}
