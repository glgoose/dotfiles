# dotfiles

## Setup on a new machine

```sh
# 1. Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install stow
brew install stow

# 3. Clone this repo
git clone <repo-url> ~/dotfiles

# 4. Create symlinks
cd ~/dotfiles
stow zsh git vim
```

## Adding new dotfiles

Move the file into the appropriate package dir (mirroring its path from `~`), then re-run `stow <package>`.
