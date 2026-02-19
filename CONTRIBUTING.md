# Contributing to PR Reviewer Assistant

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tommieseals/pr-reviewer-action.git
   cd pr-reviewer-action
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Run linter**
   ```bash
   npm run lint
   npm run lint:fix  # Auto-fix issues
   ```

5. **Build**
   ```bash
   npm run build
   ```

## Project Structure

```
pr-reviewer-action/
├── src/
│   ├── index.js           # Main entry point
│   ├── analyzers/         # Analysis modules
│   │   ├── coverage.js    # Test coverage analysis
│   │   ├── risk.js        # Risk detection
│   │   ├── docs.js        # Documentation checks
│   │   └── complexity.js  # Code complexity
│   ├── ai/
│   │   └── summary.js     # AI summary generation
│   └── reporters/
│       └── comment.js     # PR comment formatting
├── tests/                 # Test files
├── docs/                  # Documentation
└── examples/              # Example workflows
```

## Making Changes

### Adding a New Analyzer

1. Create a new file in `src/analyzers/`
2. Export an async function that takes `files` and `options`
3. Return an object with `details`, `summary`, and relevant data
4. Add tests in `tests/`
5. Import and call in `src/index.js`

### Adding Risk Patterns

Edit `src/analyzers/risk.js` and add to `DEFAULT_RISK_PATTERNS`:

```javascript
{ 
  pattern: '**/your-pattern/**', 
  category: 'your-category', 
  severity: 'high|medium|low', 
  message: 'Description' 
}
```

### Adding AI Providers

Edit `src/ai/summary.js` and add to `PROVIDERS`:

```javascript
yourProvider: {
  defaultModel: 'model-name',
  formatRequest: (prompt, model, apiKey) => ({ /* request config */ }),
  parseResponse: (data) => /* extract summary string */
}
```

## Pull Request Guidelines

1. **Fork the repo** and create a feature branch
2. **Write tests** for new functionality
3. **Update documentation** if needed
4. **Run tests and linter** before submitting
5. **Keep PRs focused** - one feature/fix per PR

## Code Style

- Use ES6+ features
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- No trailing whitespace

## Testing

- Write tests for all new features
- Maintain or improve coverage
- Test edge cases

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage  # With coverage
```

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for GitLab CI files in risk detection
fix: handle empty diff in complexity analyzer
docs: update configuration examples
test: add tests for custom risk patterns
```

## Questions?

Open an issue for:
- Feature requests
- Bug reports
- Questions about contributing

Thank you for contributing! 🎉
