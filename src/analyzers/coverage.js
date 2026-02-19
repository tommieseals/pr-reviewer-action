/**
 * Coverage Analyzer
 * Detects test coverage changes and coverage file patterns
 */

const path = require('path');

// Common coverage file patterns
const COVERAGE_PATTERNS = [
  /coverage[\/\\]?.*\.json$/i,
  /lcov\.info$/i,
  /coverage\.xml$/i,
  /cobertura\.xml$/i,
  /clover\.xml$/i,
  /jacoco.*\.xml$/i,
  /\.coverage$/i,
  /coverage-final\.json$/i,
  /coverage-summary\.json$/i
];

// Test file patterns by language
const TEST_FILE_PATTERNS = [
  // JavaScript/TypeScript
  /\.(test|spec)\.(js|jsx|ts|tsx)$/i,
  /__tests__[\/\\].*\.(js|jsx|ts|tsx)$/i,
  
  // Python
  /test_.*\.py$/i,
  /.*_test\.py$/i,
  /tests[\/\\].*\.py$/i,
  
  // Java/Kotlin
  /Test\.java$/i,
  /.*Tests\.java$/i,
  /.*Test\.kt$/i,
  
  // Ruby
  /_spec\.rb$/i,
  /_test\.rb$/i,
  
  // Go
  /_test\.go$/i,
  
  // C#
  /Tests?\.cs$/i,
  
  // PHP
  /Test\.php$/i
];

/**
 * Analyze coverage-related changes in PR files
 */
async function analyzeCoverage(files, options = {}) {
  const { threshold = 80 } = options;
  
  const result = {
    testFilesAdded: [],
    testFilesModified: [],
    testFilesDeleted: [],
    coverageFilesChanged: [],
    sourceFilesWithoutTests: [],
    delta: null,
    status: 'unknown',
    details: []
  };

  // Categorize test files
  const testFiles = files.filter(f => isTestFile(f.filename));
  const sourceFiles = files.filter(f => isSourceFile(f.filename) && !isTestFile(f.filename));
  const coverageFiles = files.filter(f => isCoverageFile(f.filename));

  // Process test files
  for (const file of testFiles) {
    if (file.status === 'added') {
      result.testFilesAdded.push(file.filename);
    } else if (file.status === 'removed') {
      result.testFilesDeleted.push(file.filename);
    } else {
      result.testFilesModified.push(file.filename);
    }
  }

  // Check for coverage files
  result.coverageFilesChanged = coverageFiles.map(f => f.filename);

  // Find source files that might need tests
  for (const file of sourceFiles) {
    if (file.status !== 'removed' && !hasMatchingTestFile(file.filename, files)) {
      result.sourceFilesWithoutTests.push(file.filename);
    }
  }

  // Calculate metrics
  const testsAdded = result.testFilesAdded.length;
  const testsDeleted = result.testFilesDeleted.length;
  const netTestChange = testsAdded - testsDeleted;

  // Determine status
  if (testsAdded > 0 && testsDeleted === 0) {
    result.status = 'improved';
    result.details.push(`✅ Added ${testsAdded} new test file(s)`);
  } else if (testsDeleted > testsAdded) {
    result.status = 'degraded';
    result.details.push(`⚠️ Removed ${testsDeleted - testsAdded} more test file(s) than added`);
  } else if (result.sourceFilesWithoutTests.length > 0 && testsAdded === 0) {
    result.status = 'missing';
    result.details.push(`📝 ${result.sourceFilesWithoutTests.length} source file(s) may need tests`);
  } else {
    result.status = 'stable';
    result.details.push('✓ Test coverage appears stable');
  }

  // Add summary
  result.summary = {
    testFilesChanged: testFiles.length,
    sourceFilesChanged: sourceFiles.length,
    netTestChange,
    filesNeedingTests: result.sourceFilesWithoutTests.length
  };

  return result;
}

/**
 * Check if a filename is a test file
 */
function isTestFile(filename) {
  return TEST_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Check if a filename is a source code file
 */
function isSourceFile(filename) {
  const sourceExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.kt', '.rb',
    '.go', '.cs', '.php', '.swift', '.rs', '.c', '.cpp', '.h'
  ];
  const ext = path.extname(filename).toLowerCase();
  return sourceExtensions.includes(ext);
}

/**
 * Check if a filename is a coverage report
 */
function isCoverageFile(filename) {
  return COVERAGE_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Check if a source file has a matching test file in the PR
 */
function hasMatchingTestFile(sourceFilename, files) {
  const baseName = path.basename(sourceFilename, path.extname(sourceFilename));
  const testPatterns = [
    new RegExp(`${baseName}\\.test\\.`, 'i'),
    new RegExp(`${baseName}\\.spec\\.`, 'i'),
    new RegExp(`${baseName}_test\\.`, 'i'),
    new RegExp(`test_${baseName}\\.`, 'i'),
    new RegExp(`${baseName}Test\\.`, 'i'),
    new RegExp(`${baseName}Tests\\.`, 'i')
  ];

  return files.some(f => testPatterns.some(pattern => pattern.test(f.filename)));
}

module.exports = { analyzeCoverage, isTestFile, isSourceFile, isCoverageFile };
