/**
 * Risk Analyzer
 * Detects potentially risky file changes that require careful review
 */

const { minimatch } = require('minimatch');

// Default risk patterns with severity levels
const DEFAULT_RISK_PATTERNS = [
  // Security-critical files (HIGH)
  { pattern: '**/.env*', category: 'security', severity: 'high', message: 'Environment configuration file' },
  { pattern: '**/secrets*', category: 'security', severity: 'high', message: 'Secrets file' },
  { pattern: '**/*credentials*', category: 'security', severity: 'high', message: 'Credentials file' },
  { pattern: '**/*password*', category: 'security', severity: 'high', message: 'Password-related file' },
  { pattern: '**/*.pem', category: 'security', severity: 'high', message: 'Private key file' },
  { pattern: '**/*.key', category: 'security', severity: 'high', message: 'Key file' },
  { pattern: '**/auth/**', category: 'security', severity: 'high', message: 'Authentication code' },
  { pattern: '**/security/**', category: 'security', severity: 'high', message: 'Security module' },
  
  // Database migrations (HIGH)
  { pattern: '**/migrations/**', category: 'database', severity: 'high', message: 'Database migration' },
  { pattern: '**/migrate/**', category: 'database', severity: 'high', message: 'Database migration' },
  { pattern: '**/*.sql', category: 'database', severity: 'medium', message: 'SQL file' },
  { pattern: '**/schema*', category: 'database', severity: 'high', message: 'Database schema' },
  
  // Configuration files (MEDIUM)
  { pattern: '**/config/**', category: 'config', severity: 'medium', message: 'Configuration file' },
  { pattern: '**/*.config.js', category: 'config', severity: 'medium', message: 'Configuration file' },
  { pattern: '**/*.config.ts', category: 'config', severity: 'medium', message: 'Configuration file' },
  { pattern: '**/settings.*', category: 'config', severity: 'medium', message: 'Settings file' },
  { pattern: '**/docker-compose*', category: 'config', severity: 'medium', message: 'Docker Compose configuration' },
  { pattern: '**/Dockerfile*', category: 'config', severity: 'medium', message: 'Dockerfile' },
  { pattern: '**/nginx*', category: 'config', severity: 'medium', message: 'Nginx configuration' },
  { pattern: '**/.github/workflows/**', category: 'ci', severity: 'medium', message: 'CI/CD workflow' },
  
  // Infrastructure as Code (HIGH)
  { pattern: '**/*.tf', category: 'infrastructure', severity: 'high', message: 'Terraform configuration' },
  { pattern: '**/*.tfvars', category: 'infrastructure', severity: 'high', message: 'Terraform variables' },
  { pattern: '**/cloudformation/**', category: 'infrastructure', severity: 'high', message: 'CloudFormation template' },
  { pattern: '**/k8s/**', category: 'infrastructure', severity: 'high', message: 'Kubernetes configuration' },
  { pattern: '**/kubernetes/**', category: 'infrastructure', severity: 'high', message: 'Kubernetes configuration' },
  { pattern: '**/helm/**', category: 'infrastructure', severity: 'high', message: 'Helm chart' },
  
  // Package management (MEDIUM)
  { pattern: '**/package.json', category: 'dependencies', severity: 'medium', message: 'Node.js dependencies' },
  { pattern: '**/package-lock.json', category: 'dependencies', severity: 'low', message: 'Node.js lockfile' },
  { pattern: '**/yarn.lock', category: 'dependencies', severity: 'low', message: 'Yarn lockfile' },
  { pattern: '**/requirements.txt', category: 'dependencies', severity: 'medium', message: 'Python dependencies' },
  { pattern: '**/Gemfile', category: 'dependencies', severity: 'medium', message: 'Ruby dependencies' },
  { pattern: '**/go.mod', category: 'dependencies', severity: 'medium', message: 'Go dependencies' },
  { pattern: '**/Cargo.toml', category: 'dependencies', severity: 'medium', message: 'Rust dependencies' },
  
  // API and routing (MEDIUM)
  { pattern: '**/routes/**', category: 'api', severity: 'medium', message: 'API routes' },
  { pattern: '**/api/**', category: 'api', severity: 'medium', message: 'API code' },
  { pattern: '**/middleware/**', category: 'api', severity: 'medium', message: 'Middleware' },
  
  // Build and deployment (MEDIUM)
  { pattern: '**/webpack*', category: 'build', severity: 'medium', message: 'Webpack configuration' },
  { pattern: '**/rollup*', category: 'build', severity: 'medium', message: 'Rollup configuration' },
  { pattern: '**/vite.config*', category: 'build', severity: 'medium', message: 'Vite configuration' },
  { pattern: '**/.gitlab-ci*', category: 'ci', severity: 'medium', message: 'GitLab CI configuration' },
  { pattern: '**/Jenkinsfile', category: 'ci', severity: 'medium', message: 'Jenkins pipeline' },
];

/**
 * Analyze files for risk patterns
 */
async function analyzeRisk(files, options = {}) {
  const { customPatterns = [], ignorePatterns = [] } = options;
  
  // Combine default and custom patterns
  const patterns = [...DEFAULT_RISK_PATTERNS, ...customPatterns.map(p => ({
    pattern: p.pattern || p,
    category: p.category || 'custom',
    severity: p.severity || 'medium',
    message: p.message || 'Custom risk pattern'
  }))];

  const result = {
    files: [],
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    byCategory: {},
    details: []
  };

  for (const file of files) {
    // Skip ignored patterns
    if (ignorePatterns.some(p => minimatch(file.filename, p))) {
      continue;
    }

    // Check each risk pattern
    const matchedPatterns = patterns.filter(p => minimatch(file.filename, p.pattern));
    
    if (matchedPatterns.length > 0) {
      // Get highest severity
      const severity = getHighestSeverity(matchedPatterns);
      const categories = [...new Set(matchedPatterns.map(p => p.category))];
      const messages = matchedPatterns.map(p => p.message);

      const riskFile = {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        severity,
        categories,
        messages,
        patterns: matchedPatterns.map(p => p.pattern)
      };

      result.files.push(riskFile);

      // Update counts
      if (severity === 'high') result.highRiskCount++;
      else if (severity === 'medium') result.mediumRiskCount++;
      else result.lowRiskCount++;

      // Update by category
      for (const category of categories) {
        if (!result.byCategory[category]) {
          result.byCategory[category] = [];
        }
        result.byCategory[category].push(file.filename);
      }
    }
  }

  // Generate details
  if (result.highRiskCount > 0) {
    result.details.push(`🚨 ${result.highRiskCount} high-risk file(s) require careful review`);
  }
  if (result.mediumRiskCount > 0) {
    result.details.push(`⚠️ ${result.mediumRiskCount} medium-risk file(s) detected`);
  }
  if (result.lowRiskCount > 0) {
    result.details.push(`ℹ️ ${result.lowRiskCount} low-risk file(s) noted`);
  }

  // Category summaries
  for (const [category, categoryFiles] of Object.entries(result.byCategory)) {
    const icon = getCategoryIcon(category);
    result.details.push(`${icon} ${category}: ${categoryFiles.length} file(s)`);
  }

  result.summary = {
    totalRiskFiles: result.files.length,
    highRisk: result.highRiskCount,
    mediumRisk: result.mediumRiskCount,
    lowRisk: result.lowRiskCount,
    categories: Object.keys(result.byCategory)
  };

  return result;
}

/**
 * Get the highest severity from matched patterns
 */
function getHighestSeverity(patterns) {
  const severityOrder = { high: 3, medium: 2, low: 1 };
  let highest = 'low';
  
  for (const p of patterns) {
    if (severityOrder[p.severity] > severityOrder[highest]) {
      highest = p.severity;
    }
  }
  
  return highest;
}

/**
 * Get emoji icon for risk category
 */
function getCategoryIcon(category) {
  const icons = {
    security: '🔒',
    database: '🗄️',
    config: '⚙️',
    infrastructure: '🏗️',
    dependencies: '📦',
    api: '🌐',
    build: '🔧',
    ci: '🔄',
    custom: '🏷️'
  };
  return icons[category] || '📋';
}

module.exports = { analyzeRisk, DEFAULT_RISK_PATTERNS };
