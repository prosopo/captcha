#!/bin/bash
set -e

echo "🔐 Setting up TLS certificates for Prosopo Captcha Stack..."
echo "==========================================================="
echo ""
echo "📍 Certificates will be created in: $(pwd)/certs/"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/certs"

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$CERT_DIR/server.crt" ] && [ -f "$CERT_DIR/server.key" ]; then
    echo "✅ Certificates already exist"
    echo "   - Certificate: $CERT_DIR/server.crt"
    echo "   - Private Key: $CERT_DIR/server.key"

    # Ensure symlinks exist for serverless-offline compatibility
    if [ ! -L "$CERT_DIR/cert.pem" ] || [ ! -L "$CERT_DIR/key.pem" ]; then
        echo "   - Creating symlinks for serverless-offline..."
        ln -sf server.crt "$CERT_DIR/cert.pem"
        ln -sf server.key "$CERT_DIR/key.pem"
        echo "   - Symlinks created: cert.pem -> server.crt, key.pem -> server.key"
    fi

    echo ""
    echo "Certificate details:"
    openssl x509 -in "$CERT_DIR/server.crt" -text -noout | grep -A 2 "Subject:" || true
    openssl x509 -in "$CERT_DIR/server.crt" -text -noout | grep -A 2 "Validity" || true
    echo ""
    echo "💡 To regenerate, delete the certs directory and run this script again:"
    echo "   rm -rf $CERT_DIR && ./setup_certs.sh"
    exit 0
fi

echo "📝 Generating self-signed certificate with Subject Alternative Names..."

# Detect local IP addresses - at least one is required, not optional.
# Every global IPv4 the host holds goes in, not just the one on the default
# route: a machine with both ethernet and wifi up answers on two addresses, and
# a phone or tablet testing over the LAN may well reach the one that is not the
# default route's source.
if [ -n "$LOCAL_IP" ]; then
    LOCAL_IPS="$LOCAL_IP"
else
    LOCAL_IPS=$(ip -o -4 addr show scope global 2>/dev/null \
        | grep -oP 'inet \K[\d.]+' \
        | grep -v '^172\.1[6-9]\.\|^172\.2[0-9]\.\|^172\.3[0-1]\.' \
        || hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' \
        || echo "")
fi

if [ -z "$LOCAL_IPS" ]; then
    echo "❌ Error: Could not detect local IP address automatically"
    echo "   Please ensure network connectivity or manually set LOCAL_IP environment variable"
    echo ""
    echo "   Example: LOCAL_IP=192.168.1.100 ./setup_certs.sh"
    exit 1
fi

LOCAL_IP=$(echo "$LOCAL_IPS" | head -n1)

echo "🌐 Detected local IP addresses: $(echo "$LOCAL_IPS" | tr '\n' ' ')"

# A local CA signing a server certificate, rather than one self-signed server
# certificate. The extra step exists for mobile testing: iOS installs a
# self-signed leaf happily but only ever lists *root* certificates under
# Settings > General > About > Certificate Trust Settings, so a leaf can never
# be marked trusted and every request to it fails. Worse, subresource requests
# (the widget's XHR to the provider) get no interstitial at all — they fail
# silently, and the widget just reports that it cannot load. Installing this CA
# on the device fixes every port at once, since they all serve certificates
# signed by it.
cat > "$CERT_DIR/openssl.cnf" << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn

[dn]
C=US
ST=Development
L=Local
O=Prosopo
CN=Prosopo Local Development CA

[v3_ca]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash

# Apple's TLS requirements (iOS 13 / macOS 10.15 and later) are not advisory:
# a server certificate missing any of these is rejected outright, with no
# "visit this website anyway" escape hatch. The symptom on an iPhone or iPad is
# a bare "cannot open the page because the network connection was lost", which
# reads like a Wi-Fi fault rather than a certificate one. So: ExtendedKeyUsage
# must be present and must name serverAuth, KeyUsage must permit the handshake,
# the certificate must not claim to be a CA, and the lifetime must be 398 days
# or fewer (see -days below).
# https://support.apple.com/en-us/HT210176
[v3_server]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid, issuer
subjectAltName = @alt_names

[server_dn]
C=US
ST=Development
L=Local
O=Prosopo
CN=localhost

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Append every detected address as its own IP SAN, numbered on from the two
# loopback entries above.
san_index=3
while read -r ip; do
    [ -z "$ip" ] && continue
    echo "IP.$san_index = $ip" >> "$CERT_DIR/openssl.cnf"
    san_index=$((san_index + 1))
done <<< "$LOCAL_IPS"

echo "🏛️  Generating local CA (this is what you install on a phone or tablet)..."
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$CERT_DIR/ca.key" \
  -out "$CERT_DIR/ca.crt" \
  -days 825 \
  -config "$CERT_DIR/openssl.cnf" \
  -extensions v3_ca \
  2>/dev/null

echo "📄 Generating server certificate signed by that CA..."
# The CSR deliberately carries no extensions: v3_server sets
# authorityKeyIdentifier, which cannot be resolved before an issuer exists and
# makes `openssl req` fail outright. Every extension is applied at signing time
# instead, via -extfile below.
openssl req -new -newkey rsa:4096 -nodes \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -config "$CERT_DIR/openssl.cnf" \
  -subj "/C=US/ST=Development/L=Local/O=Prosopo/CN=localhost" \
  2>/dev/null

openssl x509 -req \
  -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" \
  -CAkey "$CERT_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERT_DIR/server.crt" \
  -days 397 \
  -sha256 \
  -extfile "$CERT_DIR/openssl.cnf" \
  -extensions v3_server \
  2>/dev/null

# Clean up the temporary config file and the CSR
rm -f "$CERT_DIR/openssl.cnf" "$CERT_DIR/server.csr" "$CERT_DIR/ca.srl"

# Fail loudly rather than leaving a half-generated certs directory behind: the
# openssl calls above are quietened, so without this an extension error would
# surface much later as an unexplained TLS failure on a phone.
if ! openssl verify -CAfile "$CERT_DIR/ca.crt" "$CERT_DIR/server.crt" > /dev/null 2>&1; then
    echo "❌ Error: the generated server certificate does not verify against the CA"
    exit 1
fi

# Create symlinks for serverless-offline compatibility (expects cert.pem and key.pem)
ln -sf server.crt "$CERT_DIR/cert.pem"
ln -sf server.key "$CERT_DIR/key.pem"

echo ""
echo "✅ Certificates generated successfully!"
echo "   - Certificate: $CERT_DIR/server.crt"
echo "   - Private Key: $CERT_DIR/server.key"
echo "   - Symlinks: cert.pem -> server.crt, key.pem -> server.key"
echo ""
echo "🌐 Certificate includes:"
echo "   - localhost (127.0.0.1, ::1)"
echo "   - Your local IP: $LOCAL_IP"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   Your browser will show security warnings. You may need to:"
echo "   - Accept the certificate in your browser"
echo "   - Use NODE_TLS_REJECT_UNAUTHORIZED=0 for development"
echo "   - Disable SSL verification in Postman/curl"
echo ""
echo "📋 Services can be accessed at:"
echo "   🌐 Client Bundle Demo:"
echo "      - https://localhost:9232"
echo "      - https://$LOCAL_IP:9232"
echo ""
echo "   📦 Procaptcha Bundle Server:"
echo "      - https://localhost:9269"
echo "      - https://$LOCAL_IP:9269"
echo ""
echo "   🔧 Provider Backend:"
echo "      - https://localhost:9229"
echo "      - https://$LOCAL_IP:9229"
echo ""
echo "   ⚡ AWS Serverless API (serverless-offline):"
echo "      - https://localhost:9235/development/"
echo "      - https://$LOCAL_IP:9235/development/"
echo ""
echo "✅ All services can now use HTTPS!"

