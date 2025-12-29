#!/bin/bash
set -e

REPO="your-org/dream-ssm"
INSTALL_DIR="/usr/local/bin"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  darwin|linux) ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

TARGET="${OS}-${ARCH}"
BINARY_NAME="dream-ssm-${TARGET}"

echo "Detected: ${OS} ${ARCH}"
echo "Downloading ${BINARY_NAME}..."

# Get latest release URL
DOWNLOAD_URL=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" | \
  grep "browser_download_url.*${BINARY_NAME}" | \
  cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "Error: Could not find release for ${TARGET}"
  exit 1
fi

# Download binary
TMP_FILE=$(mktemp)
curl -L -o "$TMP_FILE" "$DOWNLOAD_URL"
chmod +x "$TMP_FILE"

# Install
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP_FILE" "${INSTALL_DIR}/dream-ssm"
else
  echo "Installing to ${INSTALL_DIR} (requires sudo)..."
  sudo mv "$TMP_FILE" "${INSTALL_DIR}/dream-ssm"
fi

echo ""
echo "dream-ssm installed successfully!"
echo "Run 'dream-ssm --help' to get started."
