#!/usr/bin/env node

/**
 * Script to update all imports from OLD social system to NEW migration adapter
 * Run this to activate the NEW social system across the codebase
 */

const fs = require('fs');
const path = require('path');

// Track changes for reporting
const changes = {
  updated: [],
  skipped: [],
  errors: []
};

// Define import replacements
const replacements = [
  // From old social/init.js to migrationAdapter
  {
    pattern: /from\s+['"]\.\.\/social\/init\.js['"]/g,
    replacement: "from '../../social/migrationAdapter.js'",
    description: 'social/init.js -> migrationAdapter'
  },
  {
    pattern: /from\s+['"]\.\.\/js\/social\/init\.js['"]/g,
    replacement: "from '../../social/migrationAdapter.js'",
    description: 'js/social/init.js -> migrationAdapter'
  },
  {
    pattern: /from\s+['"]\.\/social\/init\.js['"]/g,
    replacement: "from '../social/migrationAdapter.js'",
    description: './social/init.js -> migrationAdapter'
  },
  
  // From old dialogueTreesV2 to NEW dialogue system
  {
    pattern: /from\s+['"]\.\.\/social\/dialogueTreesV2\.js['"]/g,
    replacement: "from '../../social/dialogue.js'",
    description: 'dialogueTreesV2 -> dialogue'
  },
  {
    pattern: /from\s+['"]\.\.\/js\/social\/dialogueTreesV2\.js['"]/g,
    replacement: "from '../../social/dialogue.js'",
    description: 'js/social/dialogueTreesV2 -> dialogue'
  },
  
  // From old memory.js to NEW memory
  {
    pattern: /from\s+['"]\.\.\/social\/memory\.js['"]/g,
    replacement: "from '../../social/memory.js'",
    description: 'old memory -> new memory'
  },
  {
    pattern: /from\s+['"]\.\.\/js\/social\/memory\.js['"]/g,
    replacement: "from '../../social/memory.js'",
    description: 'js/social/memory -> new memory'
  },
  
  // From old traits.js to NEW traits
  {
    pattern: /from\s+['"]\.\.\/social\/traits\.js['"]/g,
    replacement: "from '../../social/traits.js'",
    description: 'old traits -> new traits'
  },
  {
    pattern: /from\s+['"]\.\.\/js\/social\/traits\.js['"]/g,
    replacement: "from '../../social/traits.js'",
    description: 'js/social/traits -> new traits'
  }
];

// Find all JavaScript files
function findJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and backup directories
      if (file !== 'node_modules' && !file.startsWith('old-social-backup')) {
        findJSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const appliedChanges = [];
    
    replacements.forEach(({ pattern, replacement, description }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
        appliedChanges.push(description);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      changes.updated.push({
        file: filePath,
        changes: appliedChanges
      });
      return true;
    } else {
      changes.skipped.push(filePath);
      return false;
    }
  } catch (error) {
    changes.errors.push({
      file: filePath,
      error: error.message
    });
    return false;
  }
}

// Main execution
function main() {
  console.log('🔄 Starting import update for NEW social system...\n');
  
  // Find all JS files in src directory
  const srcDir = path.join(__dirname, 'src');
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found!');
    process.exit(1);
  }
  
  const files = findJSFiles(srcDir);
  console.log(`📋 Found ${files.length} JavaScript files to check\n`);
  
  // Process each file
  files.forEach(file => {
    processFile(file);
  });
  
  // Report results
  console.log('✅ Import Update Complete!\n');
  console.log('📊 Summary:');
  console.log(`  Updated: ${changes.updated.length} files`);
  console.log(`  Skipped: ${changes.skipped.length} files (no changes needed)`);
  console.log(`  Errors: ${changes.errors.length} files\n`);
  
  if (changes.updated.length > 0) {
    console.log('📝 Updated Files:');
    changes.updated.forEach(({ file, changes }) => {
      const relativePath = path.relative(__dirname, file);
      console.log(`  ✓ ${relativePath}`);
      changes.forEach(change => {
        console.log(`    - ${change}`);
      });
    });
    console.log('');
  }
  
  if (changes.errors.length > 0) {
    console.log('❌ Errors:');
    changes.errors.forEach(({ file, error }) => {
      const relativePath = path.relative(__dirname, file);
      console.log(`  ✗ ${relativePath}: ${error}`);
    });
    console.log('');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'import-update-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(changes, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
  
  // Final message
  if (changes.updated.length > 0) {
    console.log('🎉 NEW social system imports activated!');
    console.log('⚠️  Please test the game to ensure everything works correctly.');
    console.log('💡 If issues arise, restore from git or the backup directory.');
  } else {
    console.log('ℹ️  No files needed updating - system may already be migrated.');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { processFile, replacements };