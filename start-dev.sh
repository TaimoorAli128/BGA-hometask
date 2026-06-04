#!/bin/bash
# Quick start script for local development

set -e

echo "🔧 Blockchain Node - Local Development Setup"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker environment ready"
echo ""

# Options
echo "Select setup option:"
echo "1) Single node (Fast development)"
echo "2) Multi-node (P2P testing)"
echo "3) Run tests in Docker"
echo "4) Clean up volumes and restart"
echo ""

read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo "🚀 Starting single blockchain node..."
        docker-compose up blockchain-node-1
        ;;
    2)
        echo "🚀 Starting 2-node cluster..."
        docker-compose up blockchain-node-1 blockchain-node-2
        ;;
    3)
        echo "🧪 Running tests..."
        docker-compose --profile test run blockchain-test
        ;;
    4)
        echo "🧹 Cleaning up..."
        docker-compose down -v
        echo "✅ Cleaned up. Run again to start fresh."
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
