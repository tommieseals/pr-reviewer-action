const { formatComment, COMMENT_IDENTIFIER } = require('../src/reporters/comment');

describe('Comment Reporter', () => {
  describe('formatComment', () => {
    const baseSummary = {
      coverage: {
        status: 'stable',
        testFilesAdded: [],
        testFilesModified: [],
        testFilesDeleted: [],
        sourceFilesWithoutTests: [],
        details: ['✓ Test coverage appears stable'],
        summary: { testFilesChanged: 0, netTestChange: 0 }
      },
      risk: {
        files: [],
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        byCategory: {},
        details: [],
        summary: { totalRiskFiles: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 }
      },
      docs: {
        missingDocs: [],
        docFilesModified: [],
        docFilesAdded: [],
        triggersNeedingDocs: [],
        readmeUpdated: false,
        changelogUpdated: false,
        details: [],
        suggestions: [],
        summary: { docFilesChanged: 0 }
      },
      complexity: {
        warnings: [],
        largeFiles: [],
        complexFiles: [],
        codeSmells: [],
        stats: { totalAdditions: 100, totalDeletions: 20 },
        details: ['✅ No significant complexity issues detected'],
        summary: { totalWarnings: 0, totalAdditions: 100, totalDeletions: 20 }
      },
      meta: {
        filesAnalyzed: 5,
        timestamp: '2024-01-01T00:00:00.000Z',
        pr: 42
      }
    };

    test('includes comment identifier', () => {
      const comment = formatComment(baseSummary);
      expect(comment).toContain(COMMENT_IDENTIFIER);
    });

    test('includes header', () => {
      const comment = formatComment(baseSummary);
      expect(comment).toContain('# 🔍 PR Review Summary');
    });

    test('includes quick stats table', () => {
      const comment = formatComment(baseSummary);
      expect(comment).toContain('## 📊 Quick Stats');
      expect(comment).toContain('Files Analyzed');
      expect(comment).toContain('5');
    });

    test('includes coverage section', () => {
      const comment = formatComment(baseSummary);
      expect(comment).toContain('## 🧪 Test Coverage');
    });

    test('includes AI summary when present', () => {
      const summaryWithAI = {
        ...baseSummary,
        ai: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          summary: 'This PR implements a new feature...',
          generatedAt: '2024-01-01T00:00:00.000Z'
        }
      };

      const comment = formatComment(summaryWithAI);
      expect(comment).toContain('## 🤖 AI Analysis');
      expect(comment).toContain('This PR implements a new feature...');
    });

    test('includes risk section when risks detected', () => {
      const summaryWithRisks = {
        ...baseSummary,
        risk: {
          ...baseSummary.risk,
          files: [
            { filename: '.env', severity: 'high', categories: ['security'], messages: ['Environment file'] }
          ],
          highRiskCount: 1,
          details: ['🚨 1 high-risk file(s) require careful review'],
          summary: { totalRiskFiles: 1, highRisk: 1, mediumRisk: 0, lowRisk: 0 }
        }
      };

      const comment = formatComment(summaryWithRisks);
      expect(comment).toContain('## ⚠️ Risk Analysis');
      expect(comment).toContain('.env');
    });

    test('includes complexity section when warnings exist', () => {
      const summaryWithComplexity = {
        ...baseSummary,
        complexity: {
          ...baseSummary.complexity,
          warnings: [
            { type: 'size', severity: 'medium', filename: 'bigFile.js', message: 'Large file' }
          ],
          details: ['📏 1 file(s) with large changes'],
          summary: { totalWarnings: 1, totalAdditions: 500, totalDeletions: 20 }
        }
      };

      const comment = formatComment(summaryWithComplexity);
      expect(comment).toContain('## 🔀 Complexity');
    });

    test('includes footer with action link', () => {
      const comment = formatComment(baseSummary);
      expect(comment).toContain('Powered by');
      expect(comment).toContain('pr-reviewer-action');
    });
  });
});
