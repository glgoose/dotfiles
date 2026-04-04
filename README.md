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

## Scripts (~/dotfiles/bin)

Scripts are on `PATH` via `~/dotfiles/bin` (set in `.zshrc`).

| Script | Purpose |
|---|---|
| `lec-process` | Rename, transcribe, optionally correct lecture WAVs |
| `lec-archive` | Normalize and encode WAVs to Opus/FLAC |
| `lec-normalize` | Two-pass loudnorm a single WAV (called by lec-archive) |
| `lec-correct` | Post-process transcripts via Anthropic API |
| `lec-benchmark` | Compare mlx-whisper vs lightning-whisper-mlx speed |

### Extra dependencies for scripts

```sh
uv tool install mlx-whisper              # lec-process, lec-benchmark
pip install lightning-whisper-mlx        # lec-benchmark only
```

Model (`mlx-community/whisper-large-v3-turbo`) downloads automatically on first use.
