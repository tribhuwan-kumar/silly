#!/usr/bin/env bash

set -e

ARCH=$(uname -m)
BINARY_URL=""
BINARY_NAME=""

case "$ARCH" in
  x86_64)
    BINARY_URL="https://github.com/tribhuwan-kumar/silly/releases/latest/download/silly-linux-x86_64"
    BINARY_NAME="silly-linux-x86_64"
    ;;
  aarch64)
    BINARY_URL="https://github.com/tribhuwan-kumar/silly/releases/latest/download/silly-linux-aarch64"
    BINARY_NAME="silly-linux-aarch64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

if [ -f /usr/local/bin/silly ]; then
  echo "Removing old silly binary..."
  rm /usr/local/bin/silly
fi

echo "Downloading silly binary for $ARCH..."
curl -LJO "$BINARY_URL"
chmod +x "$BINARY_NAME"
mv "$BINARY_NAME" /usr/local/bin/silly

if [ ! -f /etc/systemd/system/silly.service ]; then
  echo "Installing silly.service..."
  curl -LJO https://raw.githubusercontent.com/tribhuwan-kumar/silly/refs/heads/web/systemd/silly.service
  mv silly.service /etc/systemd/system/
fi

systemctl daemon-reload
systemctl restart silly
