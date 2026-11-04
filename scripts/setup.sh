#!/usr/bin/env bash
# ============================================================
# MoodLens - Project Quick Setup Script
# ============================================================

set -e

echo "============================================================"
echo "🚀 Setting up MoodLens Platform"
echo "============================================================"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# 2. Check Node
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js and npm are required but not installed."
    exit 1
fi

# 3. Create virtual environment
echo "\n📦 [1/4] Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt pytest pytest-asyncio aiosqlite

# 4. Copy .env if not exists
if [ ! -f ".env" ]; then
    echo "\n⚙️  [2/4] Creating default .env file..."
    cp .env.example .env
fi

# 5. Install Frontend Dependencies
echo "\n💻 [3/4] Installing Frontend npm dependencies..."
cd frontend
npm install
npm run build
cd ..

# 6. Database seeding
echo "\n🗄️  [4/4] Seeding initial database entries..."
.venv/bin/python scripts/seed_db.py

echo "\n============================================================"
echo "✅ MoodLens setup complete!"
echo ""
echo "To start the development environment:"
echo "  1. Backend:  .venv/bin/uvicorn app.main:app --reload --port 8000 --app-dir backend"
echo "  2. Frontend: cd frontend && npm run dev"
echo "============================================================"
