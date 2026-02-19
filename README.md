# 🔍 PR Reviewer Assistant

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-PR%20Reviewer%20Assistant-blue?logo=github)](https://github.com/marketplace/actions/pr-reviewer-assistant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/tommieseals/pr-reviewer-action)](https://github.com/tommieseals/pr-reviewer-action/releases)

**Automatically review pull requests with intelligent analysis, risk detection, and optional AI-powered summaries.**

![PR Reviewer Demo](docs/screenshots/demo-comment.png)

## ✨ Features

- 🧪 **Test Coverage Analysis** - Detect test file changes, identify source files needing tests
- ⚠️ **Risk Detection** - Flag security configs, database migrations, infrastructure changes
- 📚 **Documentation Checks** - Ensure docs stay up-to-date with code changes
- 🔀 **Complexity Analysis** - Identify overly complex code, code smells, and potential issues
- 🤖 **AI-Powered Summaries** - Optional integration with OpenAI, Anthropic, or local Ollama

## 🚀 Quick Start

Add this to your repository at `.github/workflows/pr-review.yml`:

```yaml
name: PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: tommieseals/pr-reviewer-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

That's it! The action will automatically review PRs and post a summary comment.

## 📖 Configuration

### Basic Options

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token for API access | `${{ github.token }}` |
| `coverage-threshold` | Minimum coverage percentage | `80` |
| `max-files` | Maximum files to analyze | `100` |
| `fail-on-risk` | Fail if high-risk files detected | `false` |
| `comment-mode` | `create`, `update`, or `both` | `update` |

### Risk Detection

| Input | Description | Default |
|-------|-------------|---------|
| `risk-patterns` | JSON array of custom patterns | `[]` |
| `ignore-patterns` | Files to ignore | `[]` |

### AI Summary (Optional)

| Input | Description | Default |
|-------|-------------|---------|
| `enable-ai-summary` | Enable AI-powered summaries | `false` |
| `ai-provider` | `openai`, `anthropic`, or `ollama` | `openai` |
| `ai-api-key` | API key for AI provider | - |
| `ai-model` | Model to use | `gpt-4o-mini` |
| `ollama-url` | Ollama API URL | `http://localhost:11434` |

## 📋 Examples

### With AI Summary (OpenAI)

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    enable-ai-summary: true
    ai-provider: openai
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### With Custom Risk Patterns

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    risk-patterns: |
      [
        {"pattern": "**/payments/**", "severity": "high", "category": "financial", "message": "Payment processing code"},
        {"pattern": "**/billing/**", "severity": "high", "category": "financial", "message": "Billing code"}
      ]
```

### Strict Mode (Fail on Risk)

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-risk: true
    coverage-threshold: 90
```

### With Local Ollama

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    enable-ai-summary: true
    ai-provider: ollama
    ollama-url: http://localhost:11434
    ai-model: llama3.2
```

### Ignore Specific Files

```yaml
- uses: tommieseals/pr-reviewer-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ignore-patterns: |
      ["**/generated/**", "**/vendor/**", "**/*.min.js"]
```

## 📊 Output Example

The action posts a comment like this:

```markdown
# 🔍 PR Review Summary

## 🤖 AI Analysis
This PR implements a new user authentication flow with OAuth2 support...

## 📊 Quick Stats
| Metric | Value |
|--------|-------|
| Files Analyzed | 12 |
| Lines Added | +342 |
| Lines Removed | -45 |
| Risk Files | ⚠️ 3 |
| Test Files Changed | 📈 2 |

## ⚠️ Risk Analysis
🚨 2 high-risk file(s) require careful review
⚠️ 1 medium-risk file(s) detected

| File | Category | Reason |
|------|----------|--------|
| `src/auth/oauth.js` | security | Authentication code |
| `migrations/add_oauth.sql` | database | Database migration |
```

## 🔧 Built-in Risk Patterns

The action detects these file types by default:

| Category | Patterns | Severity |
|----------|----------|----------|
| 🔒 Security | `.env*`, `*credentials*`, `*password*`, `*.pem`, `*.key` | High |
| 🗄️ Database | `**/migrations/**`, `*.sql`, `**/schema*` | High |
| 🏗️ Infrastructure | `*.tf`, `**/k8s/**`, `**/cloudformation/**` | High |
| ⚙️ Config | `**/config/**`, `docker-compose*`, `Dockerfile` | Medium |
| 🔄 CI/CD | `.github/workflows/**`, `Jenkinsfile` | Medium |
| 📦 Dependencies | `package.json`, `requirements.txt`, `go.mod` | Medium |

## 🎯 Outputs

| Output | Description |
|--------|-------------|
| `coverage-delta` | Change in test coverage |
| `risk-files` | Number of risky files |
| `missing-docs` | Files needing documentation |
| `complexity-warnings` | Number of complexity warnings |
| `summary` | Full review as JSON |

## 🧠 AI Providers

### OpenAI
- Models: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- Cost: ~$0.002-0.01 per review

### Anthropic
- Models: `claude-3-haiku-20240307`, `claude-3-sonnet-20240229`
- Cost: ~$0.001-0.015 per review

### Ollama (Free/Local)
- Models: `llama3.2`, `mistral`, `codellama`
- Cost: Free (self-hosted)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT © [tommieseals](https://github.com/tommieseals)

---

**⭐ Star this repo** if you find it helpful!
