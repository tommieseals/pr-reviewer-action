/**
 * Documentation Analyzer
 * Checks for missing or outdated documentation
 */

const path = require('path');
const { minimatch } = require('minimatch');

// Documentation file patterns
const DOC_FILE_PATTERNS = [
  /readme\.md$/i,
  /changelog\.md$/i,
  /contributing\.md$/i,
  /docs[\/\\].*\.md$/i,
  /documentation[\/\\].*\.md$/i,
  /\.github[\/\\].*\.md$/i,
  /wiki[\/\\].*\.md$/i,
  /api[\/\\].*\.md$/i,
  /guides?[\/\\].*\.md$/i
];

// Files that typically need documentation updates
const DOC_TRIGGER_PATTERNS = [
  // API changes
  { pattern: '**/api/**', docHint: 'API documentation may need updates' },
  { pattern: '**/routes/**', docHint: 'API documentation may need updates' },
  { pattern: '**/endpoints/**', docHint: 'API documentation may need updates' },
  
  // Public interfaces
  { pattern: '**/public/**', docHint: 'Public API documentation may need updates' },
  { pattern: '**/exports/**', docHint: 'Module documentation may need updates' },
  
  // Configuration
  { pattern: '**/config/**', docHint: 'Configuration documentation may need updates' },
  { pattern: '**/*.config.*', docHint: 'Configuration documentation may need updates' },
  { pattern: '**/action.yml', docHint: 'Action documentation may need updates' },
  
  // CLI changes
  { pattern: '**/cli/**', docHint: 'CLI documentation may need updates' },
  { pattern: '**/commands/**', docHint: 'Command documentation may need updates' },
  { pattern: '**/bin/**', docHint: 'CLI documentation may need updates' },
  
  // Breaking changes indicators
  { pattern: '**/breaking-changes*', docHint: 'Migration guide may be needed' },
  { pattern: '**/migration*', docHint: 'Migration documentation may need updates' }
];

// Files that should have inline documentation
const INLINE_DOC_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs'];

/**
 * Analyze documentation status
 */
async function analyzeDocs(files, options = {}) {
  const { ignorePatterns = [] } = options;
  
  const result = {
    missingDocs: [],
    docFilesModified: [],
    docFilesAdded: [],
    triggersNeedingDocs: [],
    readmeUpdated: false,
    changelogUpdated: false,
    details: [],
    suggestions: []
  };

  // Separate doc files from source files
  const docFiles = files.filter(f => isDocFile(f.filename));
  const sourceFiles = files.filter(f => !isDocFile(f.filename) && !shouldIgnore(f.filename, ignorePatterns));

  // Process doc files
  for (const file of docFiles) {
    if (file.status === 'added') {
      result.docFilesAdded.push(file.filename);
    } else if (file.status !== 'removed') {
      result.docFilesModified.push(file.filename);
    }

    if (/readme\.md$/i.test(file.filename)) {
      result.readmeUpdated = true;
    }
    if (/changelog\.md$/i.test(file.filename)) {
      result.changelogUpdated = true;
    }
  }

  // Check source files for documentation triggers
  for (const file of sourceFiles) {
    if (file.status === 'removed') continue;

    // Check if file matches doc trigger patterns
    for (const trigger of DOC_TRIGGER_PATTERNS) {
      if (minimatch(file.filename, trigger.pattern)) {
        result.triggersNeedingDocs.push({
          filename: file.filename,
          hint: trigger.docHint,
          status: file.status
        });
        break; // Only report once per file
      }
    }
  }

  // Check for significant new files without docs
  const significantNewFiles = sourceFiles.filter(f => 
    f.status === 'added' && 
    isSignificantFile(f.filename) &&
    f.additions > 50 // More than 50 lines
  );

  for (const file of significantNewFiles) {
    if (!hasRelatedDocFile(file.filename, files)) {
      result.missingDocs.push({
        filename: file.filename,
        additions: file.additions,
        reason: 'New significant file without documentation'
      });
    }
  }

  // Generate details and suggestions
  if (result.docFilesAdded.length > 0) {
    result.details.push(`📚 ${result.docFilesAdded.length} documentation file(s) added`);
  }

  if (result.docFilesModified.length > 0) {
    result.details.push(`📝 ${result.docFilesModified.length} documentation file(s) updated`);
  }

  if (result.readmeUpdated) {
    result.details.push('✅ README.md was updated');
  }

  if (result.changelogUpdated) {
    result.details.push('✅ CHANGELOG.md was updated');
  }

  // Suggestions
  if (result.triggersNeedingDocs.length > 0 && !result.docFilesModified.length) {
    result.suggestions.push({
      type: 'warning',
      message: 'API or config changes detected but no documentation updates found',
      files: result.triggersNeedingDocs.slice(0, 5).map(t => t.filename)
    });
    result.details.push(`⚠️ ${result.triggersNeedingDocs.length} file(s) may need documentation updates`);
  }

  if (result.missingDocs.length > 0) {
    result.suggestions.push({
      type: 'info',
      message: 'New significant files may benefit from documentation',
      files: result.missingDocs.map(m => m.filename)
    });
    result.details.push(`📋 ${result.missingDocs.length} new file(s) may need documentation`);
  }

  // Check for public API changes without changelog
  const hasApiChanges = sourceFiles.some(f => 
    /api|public|export/i.test(f.filename) && f.status !== 'removed'
  );
  
  if (hasApiChanges && !result.changelogUpdated) {
    result.suggestions.push({
      type: 'info',
      message: 'Consider updating CHANGELOG.md for API changes'
    });
  }

  result.summary = {
    docFilesChanged: docFiles.length,
    triggersFound: result.triggersNeedingDocs.length,
    missingDocs: result.missingDocs.length,
    readmeUpdated: result.readmeUpdated,
    changelogUpdated: result.changelogUpdated
  };

  return result;
}

/**
 * Check if a file is a documentation file
 */
function isDocFile(filename) {
  return DOC_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Check if a file is significant enough to need docs
 */
function isSignificantFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return INLINE_DOC_EXTENSIONS.includes(ext);
}

/**
 * Check if a source file has a related doc file in the PR
 */
function hasRelatedDocFile(filename, files) {
  const baseName = path.basename(filename, path.extname(filename)).toLowerCase();
  return files.some(f => 
    isDocFile(f.filename) && 
    f.filename.toLowerCase().includes(baseName)
  );
}

/**
 * Check if file should be ignored
 */
function shouldIgnore(filename, patterns) {
  return patterns.some(p => minimatch(filename, p));
}

module.exports = { analyzeDocs, isDocFile };
