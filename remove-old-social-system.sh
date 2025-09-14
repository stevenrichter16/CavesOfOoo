#!/bin/bash

# Script to remove OLD social system files after migration to NEW system
# Creates backups before removal

echo "🔄 Starting OLD social system removal..."

# Create backup directory
BACKUP_DIR="old-social-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Files to remove (OLD system)
OLD_FILES=(
  "src/js/social/traits.js"
  "src/js/social/memory.js"
  "src/js/social/init.js"
  "src/js/social/dialogueTreesV2.js"
  "src/js/social/dialogueTrees.js"
  "src/js/social/behavior.js"
  "src/js/social/actions.js"
  "src/js/social/hostility.js"
  "src/js/social/factions.js"
  "src/js/social/disguise.js"
  "src/js/social/index.js"
)

# Files to keep (game-specific, not OLD system)
KEEP_FILES=(
  "src/js/social/dialogue.js"
  "src/js/social/dialogue.candyKingdomEvents.js"
  "src/js/social/dialogue.candyMarket.js"
  "src/js/social/dialogueBootstrap.js"
  "src/js/social/shoppingDistrictActions.js"
  "src/js/social/relationship.js"
)

echo "📦 Creating backups..."

# Backup OLD files before removal
for file in "${OLD_FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$(basename $file)"
    echo "  ✓ Backed up $(basename $file)"
  fi
done

echo ""
echo "🗑️ Removing OLD system files..."

# Remove OLD files
for file in "${OLD_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ Removed $file"
  else
    echo "  ⚠️ File not found: $file"
  fi
done

echo ""
echo "📋 Files kept (game-specific):"
for file in "${KEEP_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ Kept: $file"
  fi
done

echo ""
echo "✅ OLD social system removal complete!"
echo "📁 Backups saved in: $BACKUP_DIR"
echo ""
echo "⚠️ Note: If any issues arise, restore from the backup directory."