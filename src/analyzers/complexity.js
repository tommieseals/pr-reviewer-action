/**
 * Complexity Analyzer
 * Detects code complexity issues and potential code smells
 */

const path = require('path');
const { minimatch } = require('minimatch');

// Complexity thresholds
const THRESHOLDS = {
  maxFileLines: 500,      // Files larger than this get flagged
  maxFunctionLines: 50,   // Functions larger than this get flagged
  maxNestingDepth: 4,     // Nesting deeper than this gets flagged
  maxLineLength: 150,     // Lines longer than this get flagged
  maxCyclomaticComplexity: 10, // Estimated from control flow keywords
  largeAdditions: 300     // PRs adding more than this to a single file
};

// Control flow keywords by language (for cyclomatic complexity estimation)
const CONTROL_FLOW_PATTERNS = {
  js: /\b(if|else|for|while|do|switch|case|catch|&&|\|\||\?)\b/g,
  py: /\b(if|elif|else|for|while|try|except|and|or)\b/g,
  java: /\b(if|else|for|while|do|switch|case|catch|&&|\|\||\?)\b/g,
  go: /\b(if|else|for|switch|case|select)\b/g,
  rb: /\b(if|elsif|else|unless|case|when|while|until|for|rescue)\b/g
};

// Code smell patterns
const CODE_SMELL_PATTERNS = [
  { pattern: /TODO|FIXME|HACK|XXX/gi, type: 'todo', message: 'Contains TODO/FIXME comments' },
  { pattern: /console\.(log|debug|info|warn|error)/g, type: 'debug', message: 'Contains console statements' },
  { pattern: /debugger;?/g, type: 'debug', message: 'Contains debugger statement' },
  { pattern: /print\s*\(/g, type: 'debug', message: 'Contains print statements' },
  { pattern: /\.only\s*\(/g, type: 'test', message: 'Contains .only() in tests (will skip other tests)' },
  { pattern: /eslint-disable|@ts-ignore|@ts-nocheck|noqa/g, type: 'lint', message: 'Contains lint disable comments' },
  { pattern: /password\s*=\s*['"][^'"]+['"]/gi, type: 'security', message: 'Possible hardcoded password' },
  { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, type: 'security', message: 'Possible hardcoded API key' },
  { pattern: /\w+\.forEach\([^)]+\)\s*{[^}]+await/g, type: 'async', message: 'Async operation in forEach (use for...of instead)' }
];

/**
 * Analyze code complexity
 */
async function analyzeComplexity(files, diff, options = {}) {
  const { ignorePatterns = [] } = options;
  
  const result = {
    warnings: [],
    largeFiles: [],
    complexFiles: [],
    codeSmells: [],
    stats: {
      totalAdditions: 0,
      totalDeletions: 0,
      largestFile: null,
      averageFileSize: 0
    },
    details: []
  };

  // Parse diff to get actual code content
  const diffContent = parseDiff(diff);

  for (const file of files) {
    // Skip ignored patterns
    if (ignorePatterns.some(p => minimatch(file.filename, p))) {
      continue;
    }

    // Skip non-code files
    if (!isCodeFile(file.filename)) {
      continue;
    }

    result.stats.totalAdditions += file.additions;
    result.stats.totalDeletions += file.deletions;

    // Check for large additions
    if (file.additions > THRESHOLDS.largeAdditions) {
      result.largeFiles.push({
        filename: file.filename,
        additions: file.additions,
        deletions: file.deletions,
        message: `Large file change: +${file.additions} lines`
      });
      result.warnings.push({
        type: 'size',
        severity: 'medium',
        filename: file.filename,
        message: `Adding ${file.additions} lines to single file. Consider breaking into smaller changes.`
      });
    }

    // Get file content from diff
    const fileContent = diffContent[file.filename];
    if (fileContent) {
      // Analyze complexity of added lines
      const complexityResult = analyzeFileComplexity(file.filename, fileContent);
      
      if (complexityResult.complexity > THRESHOLDS.maxCyclomaticComplexity) {
        result.complexFiles.push({
          filename: file.filename,
          complexity: complexityResult.complexity,
          message: `High cyclomatic complexity: ${complexityResult.complexity}`
        });
        result.warnings.push({
          type: 'complexity',
          severity: 'high',
          filename: file.filename,
          message: `Estimated cyclomatic complexity (${complexityResult.complexity}) exceeds threshold (${THRESHOLDS.maxCyclomaticComplexity})`
        });
      }

      if (complexityResult.maxNesting > THRESHOLDS.maxNestingDepth) {
        result.warnings.push({
          type: 'nesting',
          severity: 'medium',
          filename: file.filename,
          message: `Deep nesting detected (${complexityResult.maxNesting} levels). Consider refactoring.`
        });
      }

      // Check for code smells
      const smells = detectCodeSmells(fileContent);
      if (smells.length > 0) {
        for (const smell of smells) {
          result.codeSmells.push({
            filename: file.filename,
            ...smell
          });
        }
      }

      // Check for long lines
      if (complexityResult.longLines > 0) {
        result.warnings.push({
          type: 'formatting',
          severity: 'low',
          filename: file.filename,
          message: `${complexityResult.longLines} line(s) exceed ${THRESHOLDS.maxLineLength} characters`
        });
      }
    }
  }

  // Calculate stats
  if (files.length > 0) {
    result.stats.averageFileSize = Math.round(result.stats.totalAdditions / files.length);
    const largestFile = files.reduce((max, f) => f.additions > max.additions ? f : max, files[0]);
    result.stats.largestFile = {
      filename: largestFile.filename,
      additions: largestFile.additions
    };
  }

  // Generate details
  if (result.largeFiles.length > 0) {
    result.details.push(`📏 ${result.largeFiles.length} file(s) with large changes (>${THRESHOLDS.largeAdditions} lines)`);
  }

  if (result.complexFiles.length > 0) {
    result.details.push(`🔀 ${result.complexFiles.length} file(s) with high complexity`);
  }

  if (result.codeSmells.length > 0) {
    const byType = {};
    for (const smell of result.codeSmells) {
      byType[smell.type] = (byType[smell.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(byType)) {
      const icon = getSmellIcon(type);
      result.details.push(`${icon} ${count} ${type} code smell(s) detected`);
    }
  }

  if (result.warnings.length === 0 && result.codeSmells.length === 0) {
    result.details.push('✅ No significant complexity issues detected');
  }

  result.summary = {
    totalWarnings: result.warnings.length,
    largeFiles: result.largeFiles.length,
    complexFiles: result.complexFiles.length,
    codeSmells: result.codeSmells.length,
    totalAdditions: result.stats.totalAdditions,
    totalDeletions: result.stats.totalDeletions
  };

  return result;
}

/**
 * Parse unified diff format to extract file contents
 */
function parseDiff(diff) {
  const files = {};
  if (!diff || typeof diff !== 'string') return files;

  const fileParts = diff.split(/^diff --git/m);
  
  for (const part of fileParts) {
    if (!part.trim()) continue;
    
    // Extract filename
    const fileMatch = part.match(/a\/(.+?) b\//);
    if (!fileMatch) continue;
    
    const filename = fileMatch[1];
    
    // Extract added lines (lines starting with +, but not +++)
    const addedLines = part
      .split('\n')
      .filter(line => line.startsWith('+') && !line.startsWith('+++'))
      .map(line => line.substring(1))
      .join('\n');
    
    files[filename] = addedLines;
  }
  
  return files;
}

/**
 * Analyze complexity of file content
 */
function analyzeFileComplexity(filename, content) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const langMap = { js: 'js', jsx: 'js', ts: 'js', tsx: 'js', py: 'py', java: 'java', go: 'go', rb: 'rb' };
  const lang = langMap[ext] || 'js';
  
  const pattern = CONTROL_FLOW_PATTERNS[lang] || CONTROL_FLOW_PATTERNS.js;
  
  // Count control flow keywords for cyclomatic complexity estimate
  const matches = content.match(pattern) || [];
  const complexity = matches.length + 1; // Base complexity of 1

  // Estimate max nesting by counting indentation changes
  const lines = content.split('\n');
  let maxNesting = 0;
  let currentNesting = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('{') || trimmed.match(/:\s*$/)) {
      currentNesting++;
      maxNesting = Math.max(maxNesting, currentNesting);
    }
    if (trimmed.includes('}') || (lang === 'py' && trimmed.match(/^(return|pass|break|continue)/))) {
      currentNesting = Math.max(0, currentNesting - 1);
    }
  }

  // Count long lines
  const longLines = lines.filter(line => line.length > THRESHOLDS.maxLineLength).length;

  return { complexity, maxNesting, longLines };
}

/**
 * Detect code smells in content
 */
function detectCodeSmells(content) {
  const smells = [];
  
  for (const smell of CODE_SMELL_PATTERNS) {
    const matches = content.match(smell.pattern);
    if (matches && matches.length > 0) {
      smells.push({
        type: smell.type,
        count: matches.length,
        message: smell.message
      });
    }
  }
  
  return smells;
}

/**
 * Check if file is a code file
 */
function isCodeFile(filename) {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.kt', '.go',
    '.rb', '.rs', '.c', '.cpp', '.h', '.cs', '.php', '.swift'
  ];
  const ext = path.extname(filename).toLowerCase();
  return codeExtensions.includes(ext);
}

/**
 * Get icon for code smell type
 */
function getSmellIcon(type) {
  const icons = {
    todo: '📝',
    debug: '🐛',
    test: '🧪',
    lint: '🔇',
    security: '🔐',
    async: '⏳'
  };
  return icons[type] || '👃';
}

module.exports = { analyzeComplexity, THRESHOLDS };
