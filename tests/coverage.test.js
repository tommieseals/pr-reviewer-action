const { analyzeCoverage, isTestFile, isSourceFile, isCoverageFile } = require('../src/analyzers/coverage');

describe('Coverage Analyzer', () => {
  describe('isTestFile', () => {
    test('detects JavaScript test files', () => {
      expect(isTestFile('src/utils.test.js')).toBe(true);
      expect(isTestFile('src/utils.spec.js')).toBe(true);
      expect(isTestFile('__tests__/utils.js')).toBe(true);
    });

    test('detects TypeScript test files', () => {
      expect(isTestFile('src/utils.test.ts')).toBe(true);
      expect(isTestFile('src/utils.spec.tsx')).toBe(true);
    });

    test('detects Python test files', () => {
      expect(isTestFile('test_utils.py')).toBe(true);
      expect(isTestFile('utils_test.py')).toBe(true);
      expect(isTestFile('tests/test_main.py')).toBe(true);
    });

    test('detects Go test files', () => {
      expect(isTestFile('main_test.go')).toBe(true);
    });

    test('does not flag non-test files', () => {
      expect(isTestFile('src/utils.js')).toBe(false);
      expect(isTestFile('main.py')).toBe(false);
      expect(isTestFile('README.md')).toBe(false);
    });
  });

  describe('isSourceFile', () => {
    test('detects source code files', () => {
      expect(isSourceFile('src/index.js')).toBe(true);
      expect(isSourceFile('main.py')).toBe(true);
      expect(isSourceFile('App.tsx')).toBe(true);
      expect(isSourceFile('main.go')).toBe(true);
    });

    test('does not flag non-source files', () => {
      expect(isSourceFile('README.md')).toBe(false);
      expect(isSourceFile('package.json')).toBe(false);
      expect(isSourceFile('style.css')).toBe(false);
    });
  });

  describe('isCoverageFile', () => {
    test('detects coverage files', () => {
      expect(isCoverageFile('coverage/lcov.info')).toBe(true);
      expect(isCoverageFile('coverage.xml')).toBe(true);
      expect(isCoverageFile('coverage-final.json')).toBe(true);
      expect(isCoverageFile('jacoco.xml')).toBe(true);
    });

    test('does not flag non-coverage files', () => {
      expect(isCoverageFile('src/coverage.js')).toBe(false);
      expect(isCoverageFile('README.md')).toBe(false);
    });
  });

  describe('analyzeCoverage', () => {
    test('detects added test files', async () => {
      const files = [
        { filename: 'src/utils.test.js', status: 'added', additions: 50 },
        { filename: 'src/utils.js', status: 'added', additions: 100 }
      ];

      const result = await analyzeCoverage(files);
      
      expect(result.testFilesAdded).toContain('src/utils.test.js');
      expect(result.status).toBe('improved');
    });

    test('detects deleted test files', async () => {
      const files = [
        { filename: 'src/old.test.js', status: 'removed', deletions: 50 }
      ];

      const result = await analyzeCoverage(files);
      
      expect(result.testFilesDeleted).toContain('src/old.test.js');
    });

    test('flags source files without tests', async () => {
      const files = [
        { filename: 'src/newFeature.js', status: 'added', additions: 100 }
      ];

      const result = await analyzeCoverage(files);
      
      expect(result.sourceFilesWithoutTests).toContain('src/newFeature.js');
      expect(result.status).toBe('missing');
    });

    test('handles empty file list', async () => {
      const result = await analyzeCoverage([]);
      
      expect(result.testFilesAdded).toHaveLength(0);
      expect(result.sourceFilesWithoutTests).toHaveLength(0);
    });
  });
});
