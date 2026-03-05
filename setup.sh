#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── 1. Node.js ───────────────────────────────────────────────────────────────
install_node() {
  if command -v node &>/dev/null; then
    success "Node.js $(node --version) already installed"
    return
  fi

  info "Node.js not found — installing via fnm..."
  curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell 2>/dev/null

  FNM_PATH="$HOME/.local/share/fnm"
  export PATH="$FNM_PATH:$PATH"
  eval "$(fnm env)"

  fnm install 22
  fnm use 22

  # Persist to shell rc files
  for RC in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [[ -f "$RC" ]] && ! grep -q "fnm env" "$RC"; then
      cat >> "$RC" <<'EOF'

# fnm (Node version manager)
FNM_PATH="$HOME/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "$(fnm env)"
fi
EOF
      info "Added fnm init to $RC"
    fi
  done

  success "Node.js $(node --version) installed"
}

# ─── 2. Ensure node/npm are on PATH (for existing fnm installs) ───────────────
activate_node() {
  if ! command -v node &>/dev/null; then
    FNM_PATH="$HOME/.local/share/fnm"
    if [[ -d "$FNM_PATH" ]]; then
      export PATH="$FNM_PATH:$PATH"
      eval "$(fnm env)"
      fnm use 22 2>/dev/null || true
    fi
  fi
  command -v node &>/dev/null || error "Node.js is not available. Re-run this script."
}

# ─── 3. npm install ───────────────────────────────────────────────────────────
install_deps() {
  info "Installing npm dependencies..."
  npm install --silent
  success "npm dependencies installed"
}

# ─── 4. .env.local ────────────────────────────────────────────────────────────
setup_env() {
  ENV_FILE="$SCRIPT_DIR/.env.local"

  if [[ -f "$ENV_FILE" ]]; then
    warn ".env.local already exists — skipping (delete it to regenerate)"
    return
  fi

  info "Generating .env.local..."

  # Generate a random 32-byte hex secret
  if command -v openssl &>/dev/null; then
    SECRET=$(openssl rand -hex 32)
  else
    SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
  fi

  cat > "$ENV_FILE" <<EOF
# Database
DATABASE_URL=postgresql://tsk:changeme@localhost:5432/tsk_rewards
DB_PASSWORD=changeme

# NextAuth
NEXTAUTH_SECRET=${SECRET}
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Default admin (used by seed script)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
EOF

  success ".env.local created"
  warn "Review and edit .env.local before continuing (especially ADMIN_PASSWORD)"
}

# ─── 5. PostgreSQL ────────────────────────────────────────────────────────────
setup_postgres() {
  # Ensure the service is running
  if ! pg_isready -q 2>/dev/null; then
    info "Starting PostgreSQL service..."
    sudo service postgresql start
  fi

  # Wait for it to be ready
  for i in $(seq 1 15); do
    pg_isready -q && break
    sleep 1
  done
  pg_isready -q || error "PostgreSQL did not start in time"
  success "PostgreSQL is running"

  # Create role if it doesn't exist
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='tsk'" | grep -q 1; then
    info "Creating database role 'tsk'..."
    sudo -u postgres psql -c "CREATE USER tsk WITH PASSWORD 'changeme';"
    success "Role 'tsk' created"
  else
    success "Role 'tsk' already exists"
  fi

  # Create database if it doesn't exist
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='tsk_rewards'" | grep -q 1; then
    info "Creating database 'tsk_rewards'..."
    sudo -u postgres psql -c "CREATE DATABASE tsk_rewards OWNER tsk;"
    success "Database 'tsk_rewards' created"
  else
    success "Database 'tsk_rewards' already exists"
  fi
}

# ─── 6. Prisma migrate + seed ─────────────────────────────────────────────────
setup_db() {
  # Load .env.local into the environment so Prisma can read DATABASE_URL
  set -o allexport
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env.local"
  set +o allexport

  info "Generating Prisma client..."
  npm run db:generate 2>&1 | grep -v "^$" || error "db:generate failed"
  success "Prisma client generated"

  info "Pushing Prisma schema to database..."
  npm run db:push -- --accept-data-loss 2>&1 | grep -v "^$" || error "db:push failed"
  success "Database schema applied"

  info "Seeding admin user..."
  npm run db:seed 2>&1 | grep -v "^$" || error "db:seed failed"
  success "Admin user seeded"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  cd "$SCRIPT_DIR"

  echo ""
  echo -e "${BOLD}TSK Rewards — Local Setup${NC}"
  echo "────────────────────────────────────────"

  install_node
  activate_node
  install_deps
  setup_env
  setup_postgres
  setup_db

  echo ""
  echo -e "${BOLD}────────────────────────────────────────${NC}"
  echo -e "${GREEN}Setup complete.${NC} Start the dev server with:"
  echo ""
  echo -e "    ${BOLD}./dev.sh${NC}"
  echo ""
  echo -e "Or reload your shell first, then use npm directly:"
  echo -e "    source ~/.bashrc && npm run dev"
  echo ""
  echo -e "Then open ${CYAN}http://localhost:3000${NC}"
  echo ""

  # Read credentials from .env.local for display
  ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$SCRIPT_DIR/.env.local" | cut -d= -f2)
  echo -e "Login: ${BOLD}${ADMIN_EMAIL}${NC} (password from .env.local)"
  echo ""
}

main "$@"
