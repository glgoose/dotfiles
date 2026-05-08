.PHONY: help install stow unstow update-skills sync-vendor-skills

DOTFILES := $(shell pwd)
PACKAGES := zsh git vim vscode claude agents pi copilot

help:
	@echo "Targets:"
	@echo "  install            - run install.sh (brew, stow, submodules, sync skills)"
	@echo "  stow               - stow all packages: $(PACKAGES)"
	@echo "  unstow             - unstow all packages"
	@echo "  update-skills      - bump vendored skill submodules to upstream HEAD and re-sync symlinks"
	@echo "  sync-vendor-skills - regenerate per-skill symlinks from vendored submodules"

install:
	./install.sh

stow:
	cd $(DOTFILES) && stow $(PACKAGES)

unstow:
	cd $(DOTFILES) && stow -D $(PACKAGES)

update-skills:
	cd $(DOTFILES) && git submodule update --remote --recursive
	$(MAKE) sync-vendor-skills
	cd $(DOTFILES) && git add agents/.agents/skills-vendor agents/.agents/skills && \
		(git diff --cached --quiet && echo "no submodule changes" || git commit -m "bump vendored skills")

sync-vendor-skills:
	$(DOTFILES)/bin/sync-vendor-skills
