const { analyzeRisk, DEFAULT_RISK_PATTERNS } = require('../src/analyzers/risk');

describe('Risk Analyzer', () => {
  describe('analyzeRisk', () => {
    test('detects security-critical files', async () => {
      const files = [
        { filename: '.env.production', status: 'modified', additions: 5 },
        { filename: 'src/auth/login.js', status: 'added', additions: 100 }
      ];

      const result = await analyzeRisk(files);
      
      expect(result.highRiskCount).toBeGreaterThan(0);
      expect(result.files.some(f => f.categories.includes('security'))).toBe(true);
    });

    test('detects database migrations', async () => {
      const files = [
        { filename: 'migrations/20240101_add_users.sql', status: 'added', additions: 50 }
      ];

      const result = await analyzeRisk(files);
      
      expect(result.files.some(f => f.categories.includes('database'))).toBe(true);
    });

    test('detects infrastructure files', async () => {
      const files = [
        { filename: 'terraform/main.tf', status: 'modified', additions: 20 },
        { filename: 'k8s/deployment.yaml', status: 'added', additions: 100 }
      ];

      const result = await analyzeRisk(files);
      
      expect(result.files.some(f => f.categories.includes('infrastructure'))).toBe(true);
    });

    test('detects config files', async () => {
      const files = [
        { filename: 'docker-compose.yml', status: 'modified', additions: 10 },
        { filename: 'config/database.js', status: 'modified', additions: 5 }
      ];

      const result = await analyzeRisk(files);
      
      expect(result.mediumRiskCount).toBeGreaterThan(0);
    });

    test('respects ignore patterns', async () => {
      const files = [
        { filename: 'vendor/config/settings.json', status: 'added', additions: 10 }
      ];

      const result = await analyzeRisk(files, {
        ignorePatterns: ['**/vendor/**']
      });
      
      expect(result.files).toHaveLength(0);
    });

    test('supports custom patterns', async () => {
      const files = [
        { filename: 'src/payments/checkout.js', status: 'modified', additions: 50 }
      ];

      const result = await analyzeRisk(files, {
        customPatterns: [
          { pattern: '**/payments/**', severity: 'high', category: 'financial', message: 'Payment code' }
        ]
      });
      
      expect(result.files.some(f => f.categories.includes('financial'))).toBe(true);
      expect(result.highRiskCount).toBe(1);
    });

    test('handles empty file list', async () => {
      const result = await analyzeRisk([]);
      
      expect(result.files).toHaveLength(0);
      expect(result.highRiskCount).toBe(0);
    });

    test('categorizes by severity correctly', async () => {
      const files = [
        { filename: '.env', status: 'modified' },           // high
        { filename: 'package.json', status: 'modified' },   // medium
        { filename: 'package-lock.json', status: 'modified' } // low
      ];

      const result = await analyzeRisk(files);
      
      expect(result.highRiskCount).toBeGreaterThan(0);
      expect(result.mediumRiskCount).toBeGreaterThan(0);
      expect(result.lowRiskCount).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_RISK_PATTERNS', () => {
    test('has reasonable number of patterns', () => {
      expect(DEFAULT_RISK_PATTERNS.length).toBeGreaterThan(20);
    });

    test('all patterns have required fields', () => {
      for (const pattern of DEFAULT_RISK_PATTERNS) {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('category');
        expect(pattern).toHaveProperty('severity');
        expect(pattern).toHaveProperty('message');
        expect(['high', 'medium', 'low']).toContain(pattern.severity);
      }
    });
  });
});
