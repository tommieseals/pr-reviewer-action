/**
 * Comment Reporter
 * Posts beautifully formatted PR review comments
 */

const COMMENT_SIGNATURE = '\n\n---\n🤖 *Powered by [PR Reviewer Assistant](https://github.com/tommieseals/pr-reviewer-action)*';
const COMMENT_IDENTIFIER = '<!-- pr-reviewer-action -->';

/**
 * Post or update PR comment with review results
 */
async function postComment(octokit, context, summary, options = {}) {
  const { mode = 'update' } = options;
  const { owner, repo } = context.repo;
  const pullNumber = context.payload.pull_request.number;

  // Generate comment body
  const body = formatComment(summary);

  if (mode === 'update' || mode === 'both') {
    // Try to find existing comment
    const existingComment = await findExistingComment(octokit, owner, repo, pullNumber);
    
    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body
      });
      return { action: 'updated', commentId: existingComment.id };
    }
  }

  // Create new comment
  const { data: newComment } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body
  });

  return { action: 'created', commentId: newComment.id };
}

/**
 * Find existing PR Reviewer comment
 */
async function findExistingComment(octokit, owner, repo, pullNumber) {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100
  });

  return comments.find(c => c.body?.includes(COMMENT_IDENTIFIER));
}

/**
 * Format the review comment
 */
function formatComment(summary) {
  const sections = [];
  
  // Header
  sections.push(COMMENT_IDENTIFIER);
  sections.push('# 🔍 PR Review Summary\n');

  // AI Summary (if available)
  if (summary.ai?.summary) {
    sections.push('## 🤖 AI Analysis\n');
    sections.push(summary.ai.summary);
    sections.push('');
  }

  // Quick Stats
  sections.push('## 📊 Quick Stats\n');
  sections.push(formatQuickStats(summary));

  // Coverage Section
  if (summary.coverage) {
    sections.push('\n## 🧪 Test Coverage\n');
    sections.push(formatCoverage(summary.coverage));
  }

  // Risk Section
  if (summary.risk && summary.risk.files.length > 0) {
    sections.push('\n## ⚠️ Risk Analysis\n');
    sections.push(formatRisk(summary.risk));
  }

  // Documentation Section
  if (summary.docs) {
    sections.push('\n## 📚 Documentation\n');
    sections.push(formatDocs(summary.docs));
  }

  // Complexity Section
  if (summary.complexity && summary.complexity.warnings.length > 0) {
    sections.push('\n## 🔀 Complexity\n');
    sections.push(formatComplexity(summary.complexity));
  }

  // Footer
  sections.push(COMMENT_SIGNATURE);

  return sections.join('\n');
}

/**
 * Format quick stats table
 */
function formatQuickStats(summary) {
  const stats = [];
  
  stats.push('| Metric | Value |');
  stats.push('|--------|-------|');
  stats.push(`| Files Analyzed | ${summary.meta.filesAnalyzed} |`);
  
  if (summary.complexity?.summary) {
    stats.push(`| Lines Added | +${summary.complexity.summary.totalAdditions} |`);
    stats.push(`| Lines Removed | -${summary.complexity.summary.totalDeletions} |`);
  }
  
  if (summary.risk?.summary) {
    const riskIcon = summary.risk.summary.highRisk > 0 ? '🚨' : 
                     summary.risk.summary.mediumRisk > 0 ? '⚠️' : '✅';
    stats.push(`| Risk Files | ${riskIcon} ${summary.risk.summary.totalRiskFiles} |`);
  }
  
  if (summary.coverage?.summary) {
    const testIcon = summary.coverage.summary.netTestChange > 0 ? '📈' :
                     summary.coverage.summary.netTestChange < 0 ? '📉' : '➡️';
    stats.push(`| Test Files Changed | ${testIcon} ${summary.coverage.summary.testFilesChanged} |`);
  }

  return stats.join('\n');
}

/**
 * Format coverage section
 */
function formatCoverage(coverage) {
  const lines = [];
  
  // Status badge
  const statusBadge = {
    improved: '![Coverage](https://img.shields.io/badge/coverage-improved-brightgreen)',
    stable: '![Coverage](https://img.shields.io/badge/coverage-stable-green)',
    degraded: '![Coverage](https://img.shields.io/badge/coverage-degraded-red)',
    missing: '![Coverage](https://img.shields.io/badge/coverage-needs_attention-yellow)',
    unknown: '![Coverage](https://img.shields.io/badge/coverage-unknown-lightgrey)'
  };
  
  lines.push(statusBadge[coverage.status] || statusBadge.unknown);
  lines.push('');

  // Details
  for (const detail of coverage.details || []) {
    lines.push(detail);
  }

  // Test files added
  if (coverage.testFilesAdded?.length > 0) {
    lines.push('\n<details>');
    lines.push('<summary>✅ Test Files Added</summary>\n');
    for (const file of coverage.testFilesAdded.slice(0, 10)) {
      lines.push(`- \`${file}\``);
    }
    if (coverage.testFilesAdded.length > 10) {
      lines.push(`- ... and ${coverage.testFilesAdded.length - 10} more`);
    }
    lines.push('</details>');
  }

  // Files needing tests
  if (coverage.sourceFilesWithoutTests?.length > 0) {
    lines.push('\n<details>');
    lines.push('<summary>📝 Files That May Need Tests</summary>\n');
    for (const file of coverage.sourceFilesWithoutTests.slice(0, 10)) {
      lines.push(`- \`${file}\``);
    }
    if (coverage.sourceFilesWithoutTests.length > 10) {
      lines.push(`- ... and ${coverage.sourceFilesWithoutTests.length - 10} more`);
    }
    lines.push('</details>');
  }

  return lines.join('\n');
}

/**
 * Format risk section
 */
function formatRisk(risk) {
  const lines = [];
  
  // Summary
  for (const detail of risk.details || []) {
    lines.push(detail);
  }

  // High risk files
  const highRiskFiles = risk.files.filter(f => f.severity === 'high');
  if (highRiskFiles.length > 0) {
    lines.push('\n<details open>');
    lines.push('<summary>🚨 High Risk Files (Require Review)</summary>\n');
    lines.push('| File | Category | Reason |');
    lines.push('|------|----------|--------|');
    for (const file of highRiskFiles.slice(0, 10)) {
      lines.push(`| \`${file.filename}\` | ${file.categories.join(', ')} | ${file.messages[0]} |`);
    }
    if (highRiskFiles.length > 10) {
      lines.push(`\n*... and ${highRiskFiles.length - 10} more high-risk files*`);
    }
    lines.push('</details>');
  }

  // Medium risk files
  const mediumRiskFiles = risk.files.filter(f => f.severity === 'medium');
  if (mediumRiskFiles.length > 0) {
    lines.push('\n<details>');
    lines.push('<summary>⚠️ Medium Risk Files</summary>\n');
    for (const file of mediumRiskFiles.slice(0, 10)) {
      lines.push(`- \`${file.filename}\` - ${file.messages[0]}`);
    }
    if (mediumRiskFiles.length > 10) {
      lines.push(`- ... and ${mediumRiskFiles.length - 10} more`);
    }
    lines.push('</details>');
  }

  return lines.join('\n');
}

/**
 * Format documentation section
 */
function formatDocs(docs) {
  const lines = [];
  
  // Status
  for (const detail of docs.details || []) {
    lines.push(detail);
  }

  // Suggestions
  if (docs.suggestions?.length > 0) {
    lines.push('\n**Suggestions:**');
    for (const suggestion of docs.suggestions) {
      const icon = suggestion.type === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`- ${icon} ${suggestion.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format complexity section
 */
function formatComplexity(complexity) {
  const lines = [];
  
  // Summary
  for (const detail of complexity.details || []) {
    lines.push(detail);
  }

  // Warnings
  if (complexity.warnings?.length > 0) {
    lines.push('\n<details>');
    lines.push('<summary>🔍 Detailed Warnings</summary>\n');
    lines.push('| Severity | File | Issue |');
    lines.push('|----------|------|-------|');
    for (const warning of complexity.warnings.slice(0, 15)) {
      const severityIcon = warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`| ${severityIcon} ${warning.severity} | \`${warning.filename}\` | ${warning.message} |`);
    }
    if (complexity.warnings.length > 15) {
      lines.push(`\n*... and ${complexity.warnings.length - 15} more warnings*`);
    }
    lines.push('</details>');
  }

  // Code smells
  if (complexity.codeSmells?.length > 0) {
    lines.push('\n<details>');
    lines.push('<summary>👃 Code Smells</summary>\n');
    for (const smell of complexity.codeSmells.slice(0, 10)) {
      lines.push(`- \`${smell.filename}\`: ${smell.message} (${smell.count} occurrence${smell.count > 1 ? 's' : ''})`);
    }
    if (complexity.codeSmells.length > 10) {
      lines.push(`- ... and ${complexity.codeSmells.length - 10} more`);
    }
    lines.push('</details>');
  }

  return lines.join('\n');
}

module.exports = { postComment, formatComment, COMMENT_IDENTIFIER };
