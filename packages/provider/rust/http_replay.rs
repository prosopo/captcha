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

//! Sending recorded request bytes to an app over a socket, and reading the answer back in the
//! parts the equivalence tests compare.

use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

/// The parts of an answer that are compared.
#[derive(Debug, PartialEq)]
pub struct Answer {
    pub status_line: String,
    pub headers: Vec<(String, String)>,
    pub content_length: Option<String>,
    pub body: Vec<u8>,
}

fn dechunk(mut body: &[u8]) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    loop {
        let Some(line_end) = body.windows(2).position(|pair| pair == b"\r\n") else {
            return out;
        };
        let size: usize = usize::from_str_radix(std::str::from_utf8(&body[..line_end]).unwrap_or("0").trim(), 16).unwrap_or(0);
        if size == 0 {
            return out;
        }
        out.extend_from_slice(&body[line_end + 2..line_end + 2 + size]);
        body = &body[line_end + 2 + size + 2..];
    }
}

pub fn answer(raw: &[u8]) -> Answer {
    let split: usize = raw.windows(4).position(|window| window == b"\r\n\r\n").unwrap_or(raw.len());
    let head: String = raw[..split].iter().map(|&byte| byte as char).collect();
    let rest: &[u8] = raw.get(split + 4..).unwrap_or_default();
    let mut lines = head.split("\r\n");
    let status_line: String = lines.next().unwrap_or_default().to_string();
    let mut headers: Vec<(String, String)> = Vec::new();
    let mut chunked: bool = false;
    let mut content_length: Option<String> = None;
    for line in lines {
        let (name, value) = line.split_once(':').unwrap_or((line, ""));
        let (name, value) = (name.to_ascii_lowercase(), value.trim().to_string());
        match name.as_str() {
            "transfer-encoding" => chunked = value.eq_ignore_ascii_case("chunked"),
            "content-length" => content_length = Some(value),
            "date" | "connection" | "keep-alive" => {}
            _ => headers.push((name, value)),
        }
    }
    headers.sort();
    Answer {
        status_line,
        headers,
        content_length,
        body: if chunked { dechunk(rest) } else { rest.to_vec() },
    }
}

pub async fn exchange(port: u16, request: &[u8]) -> Vec<u8> {
    let mut socket: tokio::net::TcpStream = tokio::net::TcpStream::connect(("127.0.0.1", port)).await.expect("connects");
    // A server may answer and close before the whole request is written (an oversized body's
    // 413), so a failed write still leaves its answer to read.
    let _ = socket.write_all(request).await;
    let mut response: Vec<u8> = Vec::new();
    let _ = tokio::time::timeout(Duration::from_secs(10), socket.read_to_end(&mut response)).await;
    response
}

pub fn shown(bytes: &[u8]) -> String {
    let text: String = bytes.iter().map(|&byte| byte as char).collect();
    text.chars().take(400).collect()
}

