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
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   Your browser will show security warnings. You may need to:"
echo "   - Accept the certificate in your browser"
echo "   - Use NODE_TLS_REJECT_UNAUTHORIZED=0 for development"
echo "   - Disable SSL verification in Postman/curl"
echo ""
echo "📋 Services using these certificates:"
echo "   - Client Bundle Demo (https://localhost:9232)"
echo "   - Procaptcha Bundle Server (https://localhost:9269)"
echo "   - Provider Backend (https://localhost:9229)"
echo ""
echo "✅ All services can now use HTTPS!"

