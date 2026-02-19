/**
 * AI Summary Generator
 * Generates intelligent PR summaries using various AI providers
 */

const https = require('https');
const http = require('http');

// Provider configurations
const PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    formatRequest: (prompt, model, apiKey) => ({
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      }
    }),
    parseResponse: (data) => data.choices[0]?.message?.content
  },
  
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
    formatRequest: (prompt, model, apiKey) => ({
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: {
        model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      }
    }),
    parseResponse: (data) => data.content[0]?.text
  },
  
  ollama: {
    defaultModel: 'llama3.2',
    formatRequest: (prompt, model, _, ollamaUrl) => ({
      url: `${ollamaUrl}/api/generate`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        model,
        prompt,
        stream: false,
        options: { temperature: 0.3 }
      }
    }),
    parseResponse: (data) => data.response
  }
};

/**
 * Generate AI summary of PR changes
 */
async function generateAISummary(files, diff, options = {}) {
  const { provider = 'openai', apiKey, model, ollamaUrl = 'http://localhost:11434' } = options;
  
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown AI provider: ${provider}`);
  }

  // Build context from files and diff
  const context = buildContext(files, diff);
  
  // Create prompt
  const prompt = createPrompt(context);
  
  // Get model to use
  const modelToUse = model || providerConfig.defaultModel;
  
  // Format request
  const request = providerConfig.formatRequest(prompt, modelToUse, apiKey, ollamaUrl);
  
  // Make API call
  const response = await makeRequest(request);
  
  // Parse response
  const summary = providerConfig.parseResponse(response);
  
  if (!summary) {
    throw new Error('Failed to generate AI summary: empty response');
  }

  return {
    provider,
    model: modelToUse,
    summary,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Build context object from files and diff
 */
function buildContext(files, diff) {
  // Categorize files
  const added = files.filter(f => f.status === 'added').map(f => f.filename);
  const modified = files.filter(f => f.status === 'modified').map(f => f.filename);
  const deleted = files.filter(f => f.status === 'removed').map(f => f.filename);
  
  // Calculate stats
  const totalAdditions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0);
  
  // Get file types
  const fileTypes = [...new Set(files.map(f => getFileType(f.filename)))];
  
  // Extract key changes from diff (first 5000 chars to avoid token limits)
  const diffSample = typeof diff === 'string' ? diff.substring(0, 5000) : '';

  return {
    files: { added, modified, deleted },
    stats: { totalAdditions, totalDeletions, fileCount: files.length },
    fileTypes,
    diffSample
  };
}

/**
 * Create prompt for AI summary
 */
function createPrompt(context) {
  return `You are a code reviewer analyzing a GitHub Pull Request. Provide a clear, concise summary.

## PR Statistics
- Files changed: ${context.stats.fileCount}
- Lines added: +${context.stats.totalAdditions}
- Lines removed: -${context.stats.totalDeletions}
- File types: ${context.fileTypes.join(', ')}

## Files Changed
${context.files.added.length > 0 ? `**Added:** ${context.files.added.slice(0, 10).join(', ')}${context.files.added.length > 10 ? '...' : ''}` : ''}
${context.files.modified.length > 0 ? `**Modified:** ${context.files.modified.slice(0, 10).join(', ')}${context.files.modified.length > 10 ? '...' : ''}` : ''}
${context.files.deleted.length > 0 ? `**Deleted:** ${context.files.deleted.slice(0, 10).join(', ')}${context.files.deleted.length > 10 ? '...' : ''}` : ''}

## Code Changes (sample)
\`\`\`diff
${context.diffSample}
\`\`\`

Please provide:
1. **Summary** (2-3 sentences): What does this PR do?
2. **Key Changes** (bullet points): Most important changes
3. **Potential Impact** (1-2 sentences): What areas might be affected?
4. **Review Focus** (bullet points): What should reviewers pay attention to?

Keep the response concise and actionable. Use markdown formatting.`;
}

/**
 * Get file type category
 */
function getFileType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap = {
    js: 'JavaScript', jsx: 'React', ts: 'TypeScript', tsx: 'React/TS',
    py: 'Python', java: 'Java', go: 'Go', rs: 'Rust', rb: 'Ruby',
    css: 'CSS', scss: 'SCSS', html: 'HTML', vue: 'Vue', svelte: 'Svelte',
    json: 'JSON', yaml: 'YAML', yml: 'YAML', md: 'Markdown',
    sql: 'SQL', sh: 'Shell', dockerfile: 'Docker'
  };
  return typeMap[ext] || ext?.toUpperCase() || 'Unknown';
}

/**
 * Make HTTP request to AI provider
 */
function makeRequest(config) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.url);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: config.headers,
      timeout: 60000
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`API error ${res.statusCode}: ${data}`));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(JSON.stringify(config.body));
    req.end();
  });
}

module.exports = { generateAISummary, PROVIDERS };
