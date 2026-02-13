#!/bin/bash

# Geisha Gains - Quick Install Script
# Coffee Driven Development - BugsByte 2026

echo "☕ GEISHA GAINS - INSTALLATION"
echo "=============================="
echo ""

# Check Node.js version
echo "Checking Node.js version..."
node --version || { echo "❌ Node.js not found. Please install Node.js 18+"; exit 1; }

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment
echo ""
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file (please configure DATABASE_URL and API keys)"
else
    echo "⚠️  .env already exists, skipping..."
fi

# Generate Prisma client
echo ""
echo "🗄️  Generating Prisma client..."
npm run db:generate

# Ask about database setup
echo ""
read -p "Do you want to push database schema now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Pushing database schema..."
    npm run db:push
    echo "✅ Database schema pushed successfully"
fi

echo ""
echo "=============================="
echo "✅ INSTALLATION COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your DATABASE_URL and NVIDIA_API_KEY"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000/dashboard"
echo ""
echo "For detailed setup instructions, see SETUP_GUIDE.md"
echo ""
echo "☕ Built by Coffee Driven Development"
echo "=============================="
