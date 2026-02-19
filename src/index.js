const core = require('@actions/core');
const github = require('@actions/github');
const { analyzeCoverage } = require('./analyzers/coverage');
const { analyzeRisk } = require('./analyzers/risk');
const { analyzeDocs } = require('./analyzers/docs');
const { analyzeComplexity } = require('./analyzers/complexity');
const { postComment } = require('./reporters/comment');
const { generateAISummary } = require('./ai/summary');

async function run() {
  try {
    // Get inputs
    const token = core.getInput('github-token', { required: true });
    const coverageThreshold = parseInt(core.getInput('coverage-threshold') || '80');
    const riskPatterns = JSON.parse(core.getInput('risk-patterns') || '[]');
    const enableAI = core.getInput('enable-ai-summary') === 'true';
    const aiProvider = core.getInput('ai-provider') || 'openai';
    const aiApiKey = core.getInput('ai-api-key');
    const aiModel = core.getInput('ai-model') || 'gpt-4o-mini';
    const ollamaUrl = core.getInput('ollama-url') || 'http://localhost:11434';
    const maxFiles = parseInt(core.getInput('max-files') || '100');
    const ignorePatterns = JSON.parse(core.getInput('ignore-patterns') || '[]');
    const failOnRisk = core.getInput('fail-on-risk') === 'true';
    const commentMode = core.getInput('comment-mode') || 'update';

    // Setup
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.info('Not a pull request event, skipping...');
      return;
    }

    const { owner, repo } = context.repo;
    const pullNumber = context.payload.pull_request.number;

    core.info(`🔍 Analyzing PR #${pullNumber} in ${owner}/${repo}`);

    // Get PR files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: maxFiles
    });

    core.info(`📁 Found ${files.length} changed files`);

    // Get PR diff for detailed analysis
    const { data: diff } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: 'diff' }
    });

    // Run all analyzers in parallel
    const [coverageResult, riskResult, docsResult, complexityResult] = await Promise.all([
      analyzeCoverage(files, { threshold: coverageThreshold }),
      analyzeRisk(files, { customPatterns: riskPatterns, ignorePatterns }),
      analyzeDocs(files, { ignorePatterns }),
      analyzeComplexity(files, diff, { ignorePatterns })
    ]);

    // Generate AI summary if enabled
    let aiSummary = null;
    if (enableAI && aiApiKey) {
      core.info('🤖 Generating AI summary...');
      try {
        aiSummary = await generateAISummary(files, diff, {
          provider: aiProvider,
          apiKey: aiApiKey,
          model: aiModel,
          ollamaUrl
        });
      } catch (error) {
        core.warning(`AI summary failed: ${error.message}`);
      }
    }

    // Build summary object
    const summary = {
      coverage: coverageResult,
      risk: riskResult,
      docs: docsResult,
      complexity: complexityResult,
      ai: aiSummary,
      meta: {
        filesAnalyzed: files.length,
        timestamp: new Date().toISOString(),
        pr: pullNumber
      }
    };

    // Set outputs
    core.setOutput('coverage-delta', coverageResult.delta || 0);
    core.setOutput('risk-files', riskResult.files.length);
    core.setOutput('missing-docs', docsResult.missingDocs.length);
    core.setOutput('complexity-warnings', complexityResult.warnings.length);
    core.setOutput('summary', JSON.stringify(summary));

    // Post comment
    await postComment(octokit, context, summary, { mode: commentMode });

    // Fail if high-risk files detected and failOnRisk is true
    if (failOnRisk && riskResult.highRiskCount > 0) {
      core.setFailed(`Found ${riskResult.highRiskCount} high-risk file(s). Review required.`);
      return;
    }

    core.info('✅ PR review completed successfully!');

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
