#!/bin/sh
# Claude Code status line — styled after oh-my-zsh robbyrussell theme

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
model=$(echo "$input" | jq -r '.model.display_name // empty')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Current directory basename
if [ -n "$cwd" ]; then
  dir=$(basename "$cwd")
else
  dir=$(basename "$(pwd)")
fi

# Git branch (skip optional locks to avoid blocking)
branch=""
if git -C "${cwd:-$(pwd)}" rev-parse --is-inside-work-tree 2>/dev/null | grep -q true; then
  branch=$(git -C "${cwd:-$(pwd)}" -c gc.auto=0 symbolic-ref --short HEAD 2>/dev/null || git -C "${cwd:-$(pwd)}" rev-parse --short HEAD 2>/dev/null)
  dirty=""
  if ! git -C "${cwd:-$(pwd)}" -c gc.auto=0 diff --quiet 2>/dev/null || ! git -C "${cwd:-$(pwd)}" -c gc.auto=0 diff --cached --quiet 2>/dev/null; then
    dirty=" ✗"
  fi
fi

# Build output with ANSI colors
CYAN='\033[0;36m'
RED='\033[0;31m'
BLUE='\033[1;34m'
YELLOW='\033[0;33m'
RESET='\033[0m'

line=""

# Directory (cyan)
line="${line}$(printf "${CYAN}%s${RESET}" "$dir")"

# Git info (blue/red)
if [ -n "$branch" ]; then
  line="${line} $(printf "${BLUE}git:(${RED}%s${BLUE})${YELLOW}%s${RESET}" "$branch" "$dirty")"
fi

# Model
if [ -n "$model" ]; then
  line="${line} | ${model}"
fi

# Context usage
if [ -n "$used" ]; then
  line="${line} | ctx: $(printf '%.0f' "$used")%"
fi

printf "%b\n" "$line"
