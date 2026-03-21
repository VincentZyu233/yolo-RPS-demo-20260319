#!/usr/bin/env bash
# ============================================
# Code Quality Check Script (Bash)
# ============================================
# This script runs Ruff and Biome checks and outputs results to log files

set -e

# Set log file paths
RUFF_LOG_FILE="tmp/uv_ruff_check_latest.log"
BIOME_LOG_FILE="tmp/npx_biome_check.log"

# Ensure tmp directory exists
mkdir -p tmp

# Get current time
CURRENT_TIME=$(date "+%Y-%m-%d %H:%M:%S")

# Color definitions
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Code Quality Check Tool${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ============================================
# 1. Ruff Check (Python code)
# ============================================
echo -e "${YELLOW}[INFO] Running Ruff Check (Python)...${NC}"
echo -e "${GRAY}   Log file: $RUFF_LOG_FILE${NC}"

# Write log header
cat > "$RUFF_LOG_FILE" << EOF
========================================
Ruff Check Log - $CURRENT_TIME
========================================

EOF

if uv tool run ruff check . >> "$RUFF_LOG_FILE" 2>&1; then
    echo -e "${GREEN}   [OK] Ruff check passed!${NC}"
else
    echo -e "${RED}   [WARN] Ruff found issues, please check the log${NC}"
fi

# Write log footer
cat >> "$RUFF_LOG_FILE" << EOF

========================================
Completed at $(date "+%Y-%m-%d %H:%M:%S")
========================================
EOF

echo ""

# ============================================
# 2. Biome Check (Frontend code)
# ============================================
echo -e "${YELLOW}[INFO] Running Biome Check (Frontend)...${NC}"
echo -e "${GRAY}   Log file: $BIOME_LOG_FILE${NC}"

# Write log header
cat > "$BIOME_LOG_FILE" << EOF
========================================
Biome Check Log - $CURRENT_TIME
========================================

EOF

# Enter frontend directory and run check
if (cd frontend && npx @biomejs/biome check ./src) >> "../$BIOME_LOG_FILE" 2>&1; then
    echo -e "${GREEN}   [OK] Biome check passed!${NC}"
else
    echo -e "${RED}   [WARN] Biome found issues, please check the log${NC}"
fi

# Write log footer
cat >> "$BIOME_LOG_FILE" << EOF

========================================
Completed at $(date "+%Y-%m-%d %H:%M:%S")
========================================
EOF

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  [OK] Check completed!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${WHITE}Log files:${NC}"
echo -e "${GRAY}   - Ruff:  $RUFF_LOG_FILE${NC}"
echo -e "${GRAY}   - Biome: $BIOME_LOG_FILE${NC}"
echo ""
