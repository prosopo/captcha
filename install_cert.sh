#!/bin/bash
set -e

echo "🔐 Installing TLS certificate for browser trust..."
echo "=================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_FILE="$SCRIPT_DIR/certs/server.crt"

# Check if certificate exists
if [ ! -f "$CERT_FILE" ]; then
    echo "❌ Certificate not found: $CERT_FILE"
    echo ""
    echo "Please generate the certificate first:"
    echo "  ./setup_certs.sh"
    exit 1
fi

echo "📋 Certificate found: $CERT_FILE"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS=$(uname -s)
fi

echo "🖥️  Detected OS: $OS"
echo ""

case "$OS" in
    ubuntu|debian|pop)
        echo "📦 Installing certificate for Ubuntu/Debian..."
        echo ""

        # Copy certificate to system trust store
        sudo cp "$CERT_FILE" /usr/local/share/ca-certificates/prosopo-dev.crt

        # Update certificate trust store
        sudo update-ca-certificates

        echo ""
        echo "✅ Certificate installed in system trust store!"
        echo ""

        # Install for Chrome/Chromium (uses NSS certificate database)
        if command -v certutil &> /dev/null; then
            echo "📦 Installing certificate for Chrome/Chromium..."
            echo ""

            # Find Chrome/Chromium profile directories
            CHROME_DIRS=(
                "$HOME/.pki/nssdb"
                "$HOME/snap/chromium/current/.pki/nssdb"
                "$HOME/.config/google-chrome/Default"
                "$HOME/.config/chromium/Default"
            )

            INSTALLED=false
            for CHROME_DIR in "${CHROME_DIRS[@]}"; do
                if [ -d "$CHROME_DIR" ]; then
                    echo "   Installing to: $CHROME_DIR"
                    certutil -A -n "Prosopo Dev Certificate" -t "CT,C,C" -i "$CERT_FILE" -d sql:"$CHROME_DIR" 2>/dev/null || \
                    certutil -A -n "Prosopo Dev Certificate" -t "CT,C,C" -i "$CERT_FILE" -d "$CHROME_DIR" 2>/dev/null || true
                    INSTALLED=true
                fi
            done

            if [ "$INSTALLED" = true ]; then
                echo "   ✅ Chrome certificate installed!"
            fi
            echo ""
        else
            echo "⚠️  certutil not found - Chrome may not trust the certificate"
            echo "   Install it with: sudo apt install libnss3-tools"
            echo "   Then run this script again"
            echo ""
        fi

        echo "🔄 For browsers:"
        echo "   - Chrome/Edge: Close ALL Chrome windows and restart"
        echo "     IMPORTANT: Use 'killall chrome chromium google-chrome' to ensure all processes are closed"
        echo "   - Firefox: You may need to manually import the certificate"
        echo "     Settings → Privacy & Security → Certificates → View Certificates → Import"
        echo ""
        echo "⚠️  You MUST completely close and restart your browser for changes to take effect"
        echo ""
        echo "💡 To verify Chrome trusts the certificate:"
        echo "   certutil -L -d sql:\$HOME/.pki/nssdb | grep 'Prosopo Dev'"
        ;;

    arch|manjaro)
        echo "📦 Installing certificate for Arch Linux..."
        echo ""

        sudo trust anchor --store "$CERT_FILE"
        sudo update-ca-trust

        echo ""
        echo "✅ Certificate installed in system trust store!"
        ;;

    fedora|rhel|centos)
        echo "📦 Installing certificate for Fedora/RHEL/CentOS..."
        echo ""

        sudo cp "$CERT_FILE" /etc/pki/ca-trust/source/anchors/prosopo-dev.crt
        sudo update-ca-trust extract

        echo ""
        echo "✅ Certificate installed in system trust store!"
        ;;

    darwin|Darwin)
        echo "📦 Installing certificate for macOS..."
        echo ""

        sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_FILE"

        echo ""
        echo "✅ Certificate installed in system trust store!"
        ;;

    *)
        echo "❌ Unsupported OS: $OS"
        echo ""
        echo "Manual installation required:"
        echo "  1. Import the certificate into your system's trust store"
        echo "  2. Certificate location: $CERT_FILE"
        echo ""
        echo "For Firefox specifically:"
        echo "  Settings → Privacy & Security → Certificates → View Certificates → Import"
        exit 1
        ;;
esac

echo ""
echo "🌐 Testing certificate with curl..."
curl -I https://localhost:9352 2>&1 | head -5 || true

echo ""
echo "✅ Installation complete!"
echo ""
echo "If you still see warnings:"
echo "  1. Restart your browser completely"
echo "  2. Clear browser cache"
echo "  3. For Firefox, import manually (see instructions above)"
echo ""

