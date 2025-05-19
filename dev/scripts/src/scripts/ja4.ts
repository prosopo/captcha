// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { createHash } from "node:crypto";
// Validate headers and make sure they're strings
import { Readable } from "node:stream";
import { readTlsClientHello } from "read-tls-client-hello";

const DEFAULT_JA4 = "ja4";
const logger = console;
const headers = {
	host: "pronode7.prosopo.io",
	"user-agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
	"content-length": "168",
	accept: "*/*",
	"accept-encoding": "gzip, deflate, br, zstd",
	"accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
	"content-type": "application/json",
	origin: "https://www.twickets.live",
	priority: "u=1, i",
	"prosopo-site-key": "5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm",
	"prosopo-user": "5EFQgqFTjuTkW5DTxBzoepHic5oXe6XXM9krqkJkR8BzEMhN",
	referer: "https://www.twickets.live/",
	"sec-ch-ua":
		'"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
	"sec-ch-ua-mobile": "?0",
	"sec-ch-ua-platform": '"macOS"',
	"sec-fetch-dest": "empty",
	"sec-fetch-mode": "cors",
	"sec-fetch-site": "cross-site",
	"x-client-ip": "149.241.66.35",
	"x-duration-ms": "234.826Âµs",
	"x-forwarded-for": "149.241.66.35",
	"x-forwarded-host": "pronode7.prosopo.io",
	"x-forwarded-proto": "https",
	"x-method": "POST",
	"x-remote-host": "149.241.66.35",
	"x-remote-port": "2025",
	"x-request-id": "Sap2LhEZMXAVi1tH0iwjU",
	"x-tls-cipher": "TLS_AES_128_GCM_SHA256",
	"x-tls-client-certificate-der-base64": "",
	"x-tls-client-certificate-pem": "",
	"x-tls-client-fingerprint": "",
	"x-tls-client-issuer": "",
	"x-tls-client-san-dns-names": "",
	"x-tls-client-san-emails": "",
	"x-tls-client-san-ips": "",
	"x-tls-client-san-uris": "",
	"x-tls-client-serial": "",
	"x-tls-client-subject": "",
	"x-tls-clienthello":
		"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",
	"x-tls-proto": "h2",
	"x-tls-proto-mutual": "true",
	"x-tls-public-key": "",
	"x-tls-public-key-sha256": "",
	"x-tls-resumed": "false",
	"x-tls-server-name": "pronode7.prosopo.io",
	"x-tls-version": "tls1.3",
};

const xTlsClientHello = (headers["x-tls-clienthello"] || "").toString();
const xTlsVersion = (headers["x-tls-version"] || "").toString().toLowerCase();
const xTlsServerName = (headers["x-tls-server-name"] || "").toString();

// Decode the base64 ClientHello message
const clientHelloBuffer = Buffer.from(xTlsClientHello, "base64");

// Debug: Check first few bytes
logger.debug(
	"ClientHello First Bytes:",
	clientHelloBuffer.subarray(0, 5).toString("hex"),
);

// Check first byte after the initial 5
if (clientHelloBuffer[5] !== 0x01) {
	logger.warn("Invalid ClientHello message: First byte is not 0x01");
	logger.info({ ja4PlusFingerprint: DEFAULT_JA4 });
}

logger.debug("Headers TLS Version:", xTlsVersion);

//`tls1.3` becomes `13` etc.
const tlsVersion = xTlsVersion.replace(/(tls)|\./g, "");

// Convert to Readable stream
const readableStream = new Readable({
	read() {
		this.push(clientHelloBuffer);
	},
});

// Parse the TLS Client Hello
const clientHello = await readTlsClientHello(readableStream);

// Extract details
const { alpnProtocols } = clientHello;

// _tlsVersion is not used, as we already have the TLS version from the headers. The tlsVersion reported by the
// `clientHello` object is also not accurate.
const [_tlsVersion, cipherSuites, extensions] = clientHello.fingerprintData;

// Determine the transport protocol
const transport = "t"; // Assuming TCP

// Check if SNI is present
const sniIndicator = xTlsServerName ? "d" : "i";

// Count valid cipher suites (excluding GREASE values)
const validCipherSuites = cipherSuites.filter(
	(cs: number) => (cs & 0x0f0f) !== 0x0a0a,
);
const cipherCount = validCipherSuites.length;

// Count valid extensions (excluding GREASE values)
// ext & 0x0f0f extracts the last 4 bits of each byte in ext.
// The condition removes GREASE values (0x0a0a), which TLS uses for robustness testing.
// If ext & 0x0f0f !== 0x0a0a, the extension is valid.
const validExtensions = extensions.filter(
	(ext: number) => (ext & 0x0f0f) !== 0x0a0a,
);
const extensionCount = validExtensions.length;

// ALPN protocol (first and last character of first protocol)
const alpn = alpnProtocols?.length ? alpnProtocols[0] : "";
const alpnLabel = alpn ? `${alpn[0]}${alpn[alpn.length - 1]}` : "00";

// Hash of sorted cipher suites
const sortedCiphers = validCipherSuites
	.map((cs: number) => cs.toString(16).padStart(4, "0"))
	.sort()
	.join(",");
const cipherHash = createHash("sha256")
	.update(sortedCiphers)
	.digest("hex")
	.slice(0, 12);

console.log("Extensions", extensions);

// Convert to decimal, sort numerically, join with dashes
const decimalString = extensions
	.map((ext) => ext.toString(10)) // decimal (not hex)
	.sort((a, b) => Number(a) - Number(b))
	.join("-");

// Create SHA256 hash and truncate
console.log(decimalString);
const extensionHash = createHash("sha256")
	.update(decimalString)
	.digest("hex")
	.slice(0, 12);

logger.log("extensionHash", extensionHash);

// Construct the JA4+ fingerprint
const ja4PlusFingerprint = `${transport}${tlsVersion}${sniIndicator}${cipherCount}${extensionCount}${alpnLabel}_${cipherHash}_${extensionHash}`;

console.log(ja4PlusFingerprint);
