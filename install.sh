#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$REPO_DIR/claude/.claude/skills"
SKILLS_DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
MODE="link"

usage() {
  cat <<EOF
Usage: ./install.sh [--copy] [--dest <dir>] [skill...]

Installs Claude Code skills from claude/.claude/skills into your skills folder.
With no skill names, every skill in the repo is installed.

  --copy        Copy the skill instead of symlinking it
  --dest <dir>  Install into <dir> (default: \${CLAUDE_CONFIG_DIR:-~/.claude}/skills)
  -h, --help    Show this help
EOF
}

skills=()
while [ $# -gt 0 ]; do
  case "$1" in
    --copy) MODE="copy" ;;
    --dest) SKILLS_DEST="${2:?--dest needs a directory}"; shift ;;
    -h | --help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) skills+=("$1") ;;
  esac
  shift
done

if [ ${#skills[@]} -eq 0 ]; then
  for dir in "$SKILLS_SRC"/*/; do
    skills+=("$(basename "$dir")")
  done
fi

# Git Bash on Windows silently copies on `ln -s` unless native symlinks are requested.
export MSYS="${MSYS:+$MSYS }winsymlinks:nativestrict"

SKILLS_DEST="${SKILLS_DEST%/}"
BACKUP_DIR="$SKILLS_DEST.backup"
mkdir -p "$SKILLS_DEST"
status=0

for skill in "${skills[@]}"; do
  src="$SKILLS_SRC/$skill"
  dest="$SKILLS_DEST/$skill"

  if [ ! -f "$src/SKILL.md" ]; then
    echo "Unknown skill: $skill (no $src/SKILL.md)" >&2
    status=1
    continue
  fi

  if [ -L "$dest" ]; then
    rm "$dest"
  elif [ -e "$dest" ]; then
    # Backups live outside the skills folder so Claude Code doesn't load a duplicate.
    mkdir -p "$BACKUP_DIR"
    backup="$BACKUP_DIR/$skill.$(date +%Y%m%d%H%M%S)"
    mv "$dest" "$backup"
    echo "Moved existing $dest to $backup"
  fi

  if [ "$MODE" = "link" ] && ln -s "$src" "$dest" 2>/dev/null; then
    echo "Linked $dest -> $src"
    continue
  fi

  if [ "$MODE" = "link" ]; then
    echo "Could not symlink $skill (on Windows, enable Developer Mode); copying instead" >&2
  fi
  cp -R "$src" "$dest"
  echo "Copied $skill to $dest"
done

exit "$status"
