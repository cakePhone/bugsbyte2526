#!/bin/bash
set -e

# ══════════════════════════════════════════════════════════════════
# GEISHA GAINS — Full Machine Setup & Install
# Coffee Driven Development — BugsByte 2026
#
# Usage:
#   chmod +x install.sh && ./install.sh
#
# Supports: Ubuntu/Debian, Fedora, Arch Linux, macOS
# ══════════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

banner() {
  echo ""
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  GEISHA GAINS — War Room Deployment${NC}"
  echo -e "${BOLD}${CYAN}  Coffee Driven Development — BugsByte 2026${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${NC}"
  echo ""
}

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $1"; }

# ─────────────────────────────────────────────
# Detect OS
# ─────────────────────────────────────────────
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
  elif [ -f /etc/arch-release ]; then
    OS="arch"
  elif [ -f /etc/fedora-release ]; then
    OS="fedora"
  elif [ -f /etc/debian_version ]; then
    OS="debian"
  else
    OS="unknown"
  fi
  info "Detected OS: ${BOLD}$OS${NC}"
}

# ─────────────────────────────────────────────
# 1. System Dependencies
# ─────────────────────────────────────────────
install_system_deps() {
  info "Checking system dependencies..."

  case $OS in
    macos)
      if ! command -v brew &>/dev/null; then
        warn "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      fi
      brew install node postgresql@16 git curl 2>/dev/null || true
      brew services start postgresql@16 2>/dev/null || true
      ;;
    arch)
      sudo pacman -Sy --needed --noconfirm nodejs npm postgresql git curl base-devel
      ;;
    fedora)
      sudo dnf install -y nodejs npm postgresql-server postgresql git curl
      sudo postgresql-setup --initdb 2>/dev/null || true
      sudo systemctl enable --now postgresql
      ;;
    debian)
      sudo apt-get update -qq
      sudo apt-get install -y nodejs npm postgresql postgresql-contrib git curl build-essential
      ;;
    *)
      warn "Unknown OS. Please manually install: Node.js 18+, PostgreSQL 14+, git, curl"
      ;;
  esac
}

# ─────────────────────────────────────────────
# 2. Node.js Version Check
# ─────────────────────────────────────────────
check_node() {
  if ! command -v node &>/dev/null; then
    fail "Node.js not found after install. Please install Node.js 18+ manually."
    echo "  -> https://nodejs.org/ or use nvm: https://github.com/nvm-sh/nvm"
    exit 1
  fi

  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    fail "Node.js version $(node -v) is too old. Requires 18+."
    echo "  -> Install via nvm: nvm install 20 && nvm use 20"
    exit 1
  fi

  success "Node.js $(node -v)"
  success "npm $(npm -v)"
}

# ─────────────────────────────────────────────
# 3. PostgreSQL Setup
# ─────────────────────────────────────────────
setup_postgres() {
  info "Setting up PostgreSQL..."

  # Start PostgreSQL if not running
  case $OS in
    arch)
      # Initialize database cluster if needed
      if [ ! -d /var/lib/postgres/data ] || [ -z "$(ls -A /var/lib/postgres/data 2>/dev/null)" ]; then
        warn "Initializing PostgreSQL data directory..."
        sudo -u postgres initdb -D /var/lib/postgres/data 2>/dev/null || true
      fi
      sudo systemctl enable --now postgresql 2>/dev/null || true
      ;;
    debian|fedora)
      sudo systemctl enable --now postgresql 2>/dev/null || true
      ;;
    macos)
      brew services start postgresql@16 2>/dev/null || true
      ;;
  esac

  sleep 2

  # Create database and user (ignore errors if they already exist)
  if command -v psql &>/dev/null; then
    info "Creating database 'geisha_gains'..."

    if [ "$OS" = "macos" ]; then
      # macOS: default superuser is the current user
      createdb geisha_gains 2>/dev/null && success "Database created" || warn "Database may already exist"
    else
      sudo -u postgres psql -c "CREATE USER geisha WITH PASSWORD 'geisha2026';" 2>/dev/null || true
      sudo -u postgres psql -c "CREATE DATABASE geisha_gains OWNER geisha;" 2>/dev/null || true
      sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE geisha_gains TO geisha;" 2>/dev/null || true
      success "PostgreSQL user 'geisha' and database 'geisha_gains' ready"
    fi
  else
    warn "psql not found — skipping automatic database creation."
    warn "Please create the database manually."
  fi
}

# ─────────────────────────────────────────────
# 4. Environment File
# ─────────────────────────────────────────────
setup_env() {
  info "Configuring environment..."

  if [ -f .env ]; then
    warn ".env already exists — skipping (backup: .env.bak)"
    cp .env .env.bak
  else
    cp .env.example .env
    success "Created .env from .env.example"

    # Set default DATABASE_URL based on OS
    if [ "$OS" = "macos" ]; then
      DB_URL="postgresql://$(whoami)@localhost:5432/geisha_gains"
    else
      DB_URL="postgresql://geisha:geisha2026@localhost:5432/geisha_gains"
    fi

    # Update DATABASE_URL in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|postgresql://postgres:password@localhost:5432/geisha_gains|$DB_URL|g" .env
    else
      sed -i "s|postgresql://postgres:password@localhost:5432/geisha_gains|$DB_URL|g" .env
    fi

    success "DATABASE_URL set to: $DB_URL"
  fi
}

# ─────────────────────────────────────────────
# 5. Install Node Dependencies
# ─────────────────────────────────────────────
install_deps() {
  info "Installing Node.js dependencies..."
  npm install
  success "Dependencies installed"
}

# ─────────────────────────────────────────────
# 6. Prisma Setup
# ─────────────────────────────────────────────
setup_prisma() {
  info "Generating Prisma client..."
  npx prisma generate
  success "Prisma client generated"

  info "Pushing database schema..."
  npx prisma db push
  success "Database schema pushed"

  # Seed if seed file exists
  if [ -f prisma/seed.ts ]; then
    info "Seeding database..."
    npm run db:seed 2>/dev/null && success "Database seeded" || warn "Seed skipped (no seed data or error)"
  fi
}

# ─────────────────────────────────────────────
# 7. Build Verification
# ─────────────────────────────────────────────
verify_build() {
  info "Verifying TypeScript compilation..."
  npx tsc --noEmit --skipLibCheck 2>&1 | grep -c "error TS" | {
    read count
    if [ "$count" -eq 0 ]; then
      success "Zero TypeScript errors"
    else
      warn "$count TypeScript errors found (non-blocking for dev)"
    fi
  }
}

# ─────────────────────────────────────────────
# 8. JetBrains Mono Font (optional)
# ─────────────────────────────────────────────
install_font() {
  if fc-list 2>/dev/null | grep -qi "JetBrains Mono"; then
    success "JetBrains Mono font already installed"
    return
  fi

  info "Installing JetBrains Mono font (used by War Room charts)..."
  case $OS in
    arch)
      sudo pacman -S --needed --noconfirm ttf-jetbrains-mono 2>/dev/null || true
      ;;
    debian)
      sudo apt-get install -y fonts-jetbrains-mono 2>/dev/null || {
        # Manual install fallback
        mkdir -p ~/.local/share/fonts
        curl -fsSL https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip -o /tmp/jbmono.zip
        unzip -oq /tmp/jbmono.zip -d /tmp/jbmono
        cp /tmp/jbmono/fonts/ttf/*.ttf ~/.local/share/fonts/
        fc-cache -f 2>/dev/null
        rm -rf /tmp/jbmono /tmp/jbmono.zip
      }
      ;;
    fedora)
      sudo dnf install -y jetbrains-mono-fonts 2>/dev/null || true
      ;;
    macos)
      brew install --cask font-jetbrains-mono 2>/dev/null || true
      ;;
  esac
  success "JetBrains Mono font installed"
}

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
banner
detect_os

echo ""
echo -e "${BOLD}This script will:${NC}"
echo "  1. Install system dependencies (Node.js, PostgreSQL, git)"
echo "  2. Set up PostgreSQL database"
echo "  3. Configure environment variables"
echo "  4. Install Node.js packages"
echo "  5. Initialize Prisma & push database schema"
echo "  6. Install JetBrains Mono font"
echo "  7. Verify build"
echo ""
read -p "Proceed? (Y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
install_system_deps
echo ""
check_node
echo ""
setup_postgres
echo ""
setup_env
echo ""
install_deps
echo ""
setup_prisma
echo ""
install_font
echo ""
verify_build

echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  SETUP COMPLETE${NC}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Start the dev server:${NC}"
echo -e "    ${CYAN}npm run dev${NC}"
echo ""
echo -e "  ${BOLD}Open in browser:${NC}"
echo -e "    ${CYAN}http://localhost:3000/dashboard${NC}"
echo ""
echo -e "  ${BOLD}Optional — configure NVIDIA NIM:${NC}"
echo -e "    Edit ${CYAN}.env${NC} and set ${YELLOW}NVIDIA_API_KEY${NC}"
echo -e "    Get a key at: https://build.nvidia.com/"
echo ""
echo -e "  ${BOLD}Database admin:${NC}"
echo -e "    ${CYAN}npm run db:studio${NC}  (opens Prisma Studio)"
echo ""
echo -e "  ${BOLD}Coffee Driven Development — BugsByte 2026${NC}"
echo ""
