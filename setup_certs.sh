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

# Detect local IP address - this is required, not optional
LOCAL_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' || hostname -I 2>/dev/null | awk '{print $1}' || echo "")

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Error: Could not detect local IP address automatically"
    echo "   Please ensure network connectivity or manually set LOCAL_IP environment variable"
    echo ""
    echo "   Example: LOCAL_IP=192.168.1.100 ./setup_certs.sh"
    exit 1
fi

echo "🌐 Detected local IP address: $LOCAL_IP"

# Create a temporary OpenSSL config file with SANs
cat > "$CERT_DIR/openssl.cnf" << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=Development
L=Local
O=Prosopo
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = $LOCAL_IP
EOF

openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.crt" \
  -days 365 \
  -config "$CERT_DIR/openssl.cnf" \
  -extensions v3_req \
  2>/dev/null

# Clean up the temporary config file
rm -f "$CERT_DIR/openssl.cnf"

echo ""
echo "✅ Certificates generated successfully!"
echo "   - Certificate: $CERT_DIR/server.crt"
echo "   - Private Key: $CERT_DIR/server.key"
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
echo "✅ All services can now use HTTPS!"

