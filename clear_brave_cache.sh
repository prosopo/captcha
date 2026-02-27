#!/bin/bash
set -e

echo "🧹 Clearing Brave Browser SSL Certificate Cache..."
echo "=================================================="
echo ""

# Kill all Brave processes
echo "🔴 Killing all Brave processes..."
pkill -9 brave 2>/dev/null || true
pkill -9 brave-browser 2>/dev/null || true
sleep 2

# Clear SSL cache directories
echo "🗑️  Clearing SSL cache directories..."
if [ -d ~/.config/BraveSoftware/Brave-Browser/Default/TransportSecurity ]; then
    rm -rf ~/.config/BraveSoftware/Brave-Browser/Default/TransportSecurity
    echo "   ✓ Cleared TransportSecurity"
fi

if [ -d ~/.config/BraveSoftware/Brave-Browser/Default/Certificate\ Revocation\ Lists ]; then
    rm -rf ~/.config/BraveSoftware/Brave-Browser/Default/Certificate\ Revocation\ Lists
    echo "   ✓ Cleared Certificate Revocation Lists"
fi

if [ -d ~/.config/BraveSoftware/Brave-Browser/Default/EVWhitelist ]; then
    rm -rf ~/.config/BraveSoftware/Brave-Browser/Default/EVWhitelist
    echo "   ✓ Cleared EVWhitelist"
fi

echo ""
echo "✅ SSL cache cleared!"
echo ""
echo "📋 Next Steps (IMPORTANT):"
echo ""
echo "1. Start Brave browser"
echo ""
echo "2. Navigate to: brave://net-internals/#hsts"
echo ""
echo "3. Under 'Delete domain security policies', enter and delete:"
echo "   - localhost"
echo "   - 192.168.1.8"
echo ""
echo "4. Accept certificate for bundle server FIRST:"
echo "   - Navigate to: https://192.168.1.8:9269/procaptcha.bundle.js"
echo "   - Click 'Advanced' → 'Proceed to 192.168.1.8 (unsafe)'"
echo ""
echo "5. Then navigate to your application:"
echo "   - Navigate to: https://192.168.1.8:9232"
echo "   - Click 'Advanced' → 'Proceed to 192.168.1.8 (unsafe)'"
echo ""
echo "⚠️  You must accept the certificate for EACH port separately!"
echo ""

