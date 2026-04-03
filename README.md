# dotfiles

## Setup on a new machine

```sh
git clone <repo-url> ~/dotfiles
cd ~/dotfiles
./install.sh
```

This will:
1. Install Homebrew if missing
2. Install packages from `Brewfile` (including `stow`)
3. Symlink all config packages into `~/`

## Adding new dotfiles

Move the file into the appropriate package dir (mirroring its path from `~`), then re-run `stow <package>`.

## Adding packages to Brewfile

Edit `Brewfile` and add a `brew "tool-name"` line.
