#!/bin/bash
set -e

# Configuration
DEST_DIR="/Users/doberkofler/MyShare/doberkofler/private/materialdreams-me/html/airport_proximity_finder"

echo "Ensuring destination directory exists..."
mkdir -p "$DEST_DIR"

echo "Deploying to $DEST_DIR..."
# Force remove and re-copy to replace previous artifacts
rm -rf "$DEST_DIR"/*
cp -Rv index.html index.css index.js "$DEST_DIR/"

echo "Deployment complete!"
