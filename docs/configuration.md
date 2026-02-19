# Configuration Guide

This guide covers all configuration options for PR Reviewer Assistant.

## Table of Contents

- [Basic Configuration](#basic-configuration)
- [Coverage Settings](#coverage-settings)
- [Risk Detection](#risk-detection)
- [Documentation Checks](#documentation-checks)
- [Complexity Analysis](#complexity-analysis)
- [AI Summary](#ai-summary)
- [Comment Behavior](#comment-behavior)
- [Advanced Examples](#advanced-examples)

## Basic Configuration

### Minimal Setup

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Required Permissions

Your workflow needs these permissions:

```yaml
permissions:
  contents: read      # To read PR files
  pull-requests: write # To post comments
```

## Coverage Settings

### `coverage-threshold`

Minimum acceptable coverage percentage. Used for reporting purposes.

```yaml
coverage-threshold: 80  # default
```

The action analyzes:
- Test files added/modified/deleted
- Source files that may need tests
- Coverage report files (if present)

### Supported Test Patterns

The action automatically detects test files:

| Language | Patterns |
|----------|----------|
| JavaScript/TypeScript | `*.test.js`, `*.spec.ts`, `__tests__/*` |
| Python | `test_*.py`, `*_test.py`, `tests/*` |
| Java | `*Test.java`, `*Tests.java` |
| Go | `*_test.go` |
| Ruby | `*_spec.rb`, `*_test.rb` |
| C# | `*Test.cs`, `*Tests.cs` |

## Risk Detection

### `risk-patterns`

Add custom risk patterns beyond the defaults:

```yaml
risk-patterns: |
  [
    {
      "pattern": "**/payments/**",
      "severity": "high",
      "category": "financial",
      "message": "Payment processing code requires security review"
    },
    {
      "pattern": "**/pii/**",
      "severity": "high",
      "category": "privacy",
      "message": "PII handling code"
    }
  ]
```

### Pattern Format

| Field | Type | Description |
|-------|------|-------------|
| `pattern` | string | Glob pattern to match files |
| `severity` | string | `high`, `medium`, or `low` |
| `category` | string | Category name for grouping |
| `message` | string | Description shown in review |

### `fail-on-risk`

Fail the action if high-risk files are detected:

```yaml
fail-on-risk: true  # default: false
```

### `ignore-patterns`

Skip certain files from analysis:

```yaml
ignore-patterns: |
  [
    "**/vendor/**",
    "**/node_modules/**",
    "**/*.generated.*",
    "**/dist/**",
    "**/*.min.js"
  ]
```

### Built-in Risk Categories

| Category | Severity | Examples |
|----------|----------|----------|
| security | high | `.env*`, `*credentials*`, `*.pem` |
| database | high | `**/migrations/**`, `*.sql` |
| infrastructure | high | `*.tf`, `**/k8s/**` |
| config | medium | `**/config/**`, `Dockerfile` |
| ci | medium | `.github/workflows/**` |
| dependencies | medium | `package.json`, `requirements.txt` |
| api | medium | `**/routes/**`, `**/api/**` |

## Documentation Checks

The action automatically checks:

- README.md updates when API changes
- CHANGELOG.md updates for significant changes
- New files > 50 lines without docs
- Config changes without documentation

### Triggers

Files in these directories trigger doc checks:

- `**/api/**` - API documentation
- `**/config/**` - Configuration documentation
- `**/cli/**` - CLI documentation
- `**/public/**` - Public API docs

## Complexity Analysis

### Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| File size | 500 lines | Large files flagged |
| Function size | 50 lines | Long functions flagged |
| Nesting depth | 4 levels | Deep nesting flagged |
| Line length | 150 chars | Long lines flagged |
| Cyclomatic complexity | 10 | Complex code flagged |
| Large additions | 300 lines | Big changes to single file |

### Code Smells Detected

- `TODO`/`FIXME`/`HACK` comments
- `console.log`, `debugger` statements
- `.only()` in tests (skips other tests)
- `eslint-disable` comments
- Hardcoded passwords/API keys
- Async operations in `forEach`

## AI Summary

### `enable-ai-summary`

Enable AI-powered PR summaries:

```yaml
enable-ai-summary: true  # default: false
```

### `ai-provider`

Supported providers:

| Provider | Models | Cost |
|----------|--------|------|
| `openai` | `gpt-4o`, `gpt-4o-mini` | ~$0.002-0.01/review |
| `anthropic` | `claude-3-haiku`, `claude-3-sonnet` | ~$0.001-0.015/review |
| `ollama` | `llama3.2`, `mistral`, etc. | Free (self-hosted) |

### OpenAI Setup

```yaml
enable-ai-summary: true
ai-provider: openai
ai-api-key: ${{ secrets.OPENAI_API_KEY }}
ai-model: gpt-4o-mini  # Recommended for cost
```

### Anthropic Setup

```yaml
enable-ai-summary: true
ai-provider: anthropic
ai-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
ai-model: claude-3-haiku-20240307
```

### Ollama Setup (Self-Hosted)

Requires a self-hosted runner with Ollama installed:

```yaml
enable-ai-summary: true
ai-provider: ollama
ollama-url: http://localhost:11434
ai-model: llama3.2
```

## Comment Behavior

### `comment-mode`

| Mode | Behavior |
|------|----------|
| `update` | Updates existing comment, creates if none exists |
| `create` | Always creates a new comment |
| `both` | Updates if exists, otherwise creates |

```yaml
comment-mode: update  # default
```

### `max-files`

Maximum number of files to analyze:

```yaml
max-files: 100  # default
```

## Advanced Examples

### Enterprise Security Review

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-risk: true
    risk-patterns: |
      [
        {"pattern": "**/pci/**", "severity": "high", "category": "compliance", "message": "PCI DSS scope"},
        {"pattern": "**/hipaa/**", "severity": "high", "category": "compliance", "message": "HIPAA scope"},
        {"pattern": "**/gdpr/**", "severity": "high", "category": "compliance", "message": "GDPR scope"}
      ]
    enable-ai-summary: true
    ai-provider: anthropic
    ai-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Monorepo Setup

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    max-files: 200
    ignore-patterns: |
      ["packages/deprecated/**", "packages/*/node_modules/**"]
```

### CI/CD Integration

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  id: review
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Block Merge on High Risk
  if: steps.review.outputs.risk-files > 0
  run: |
    echo "::error::High-risk files detected. Manual review required."
    exit 1
```
