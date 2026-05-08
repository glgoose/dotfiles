#!/usr/bin/env bash
set -euo pipefail

DOTFILES="$(cd "$(dirname "$0")" && pwd)"

# Install Homebrew if missing
if ! command -v brew &>/dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for the rest of this script (Apple Silicon)
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Install packages from Brewfile
echo "Installing packages from Brewfile..."
brew bundle --file="$DOTFILES/Brewfile"

# Initialise submodules (vendored agent skills: mattpocock/skills, kepano/obsidian-skills)
echo "Updating submodules..."
cd "$DOTFILES"
git submodule update --init --recursive

# Generate per-skill symlinks under agents/.agents/skills/ pointing into vendored submodules
echo "Syncing vendored skill symlinks..."
"$DOTFILES/bin/sync-vendor-skills"

# Stow all packages (agents/pi/copilot bridge ~/.claude, ~/.pi, ~/.copilot to ~/.agents/skills)
echo "Stowing dotfiles..."
stow zsh git vim vscode claude agents pi copilot

# Configure Bitwarden server
bw config server https://vault.bitwarden.eu

echo "Done."
