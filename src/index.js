#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { program } from 'commander';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);
const API_URL = 'https://gitset-commit-messages.vercel.app';

const CONFIG_LOCATIONS = {
    global: {
        dir: path.join(os.homedir(), '.config', 'gitset'),
        file: 'credentials.json'
    },
    local: {
        dir: path.join(process.cwd(), '.gitset'),
        file: 'credentials.json'
    },
    system: {
        darwin: path.join(os.homedir(), 'Library', 'Application Support', 'GitSet'),
        win32: path.join(process.env.APPDATA || '', 'GitSet'),
        linux: path.join(os.homedir(), '.local', 'share', 'gitset')
    }
};

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    customCyan: '\x1b[38;2;126;255;247m',
    darkCyan: '\x1b[38;2;75;208;214m'  
};

function log(step, message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? colors.red + '❌' : colors.customCyan + '●';
    const stepColor = isError ? colors.red : colors.cyan;
    console.log(`${prefix} ${colors.reset}[${timestamp}] ${stepColor}${step}${colors.reset}: ${message}`);
}

function getConfigPath() {
    const localPath = path.join(CONFIG_LOCATIONS.local.dir, CONFIG_LOCATIONS.local.file);
    try {
        if (fs.existsSync(localPath)) {
            return localPath;
        }
    } catch (error) {}

    const globalPath = path.join(CONFIG_LOCATIONS.global.dir, CONFIG_LOCATIONS.global.file);
    try {
        if (fs.existsSync(globalPath)) {
            return globalPath;
        }
    } catch (error) {}

    const systemDir = CONFIG_LOCATIONS.system[process.platform] || CONFIG_LOCATIONS.system.linux;
    return path.join(systemDir, CONFIG_LOCATIONS.local.file);
}

async function ensureConfigDir() {
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    try {
        await fs.mkdir(configDir, { recursive: true, mode: 0o700 });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
    return configPath;
}

async function saveConfig(config) {
    const configPath = await ensureConfigDir();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

async function loadConfig() {
    const storedConfig = {
        licenseKey: null,
        lastValidation: null,
        installationId: null
    };

    try {
        const configPath = getConfigPath();
        const configData = await fs.readFile(configPath, 'utf8');
        const parsedConfig = JSON.parse(configData);

        if (!parsedConfig.installationId) {
            parsedConfig.installationId = crypto.randomUUID();
            await saveConfig(parsedConfig);
        }

        return parsedConfig;
    } catch (error) {
        if (error.code === 'ENOENT') {

            storedConfig.installationId = crypto.randomUUID();
            await saveConfig(storedConfig);
            return storedConfig;
        }
        throw error;
    }
}

async function makeApiRequest(endpoint, data) {
    const config = await loadConfig();
    const headers = {
        'Content-Type': 'application/json'
    };

    if (config.licenseKey) {
        headers['X-License-Key'] = config.licenseKey;
    }

    if (!config.installationId) {
        config.installationId = crypto.randomUUID();
        await saveConfig(config);
    }

    headers['X-Installation-Id'] = config.installationId;
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429 && errorData.status === 'quota_exceeded') {
            log('Quota', 'Monthly request limit reached:', true);
            log('Info', errorData.message);
            log('Info', `Next reset date: ${new Date(errorData.next_reset_date).toLocaleDateString()}`);
            log('Info', `Remaining days: ${errorData.days_until_reset}`);
            log('Upgrade', 'To remove limits, activate a pro license:');
            log('Command', '  gitset activate <license-key>');
            log('Purchase', 'Visit https://gitset.dev/pricing to get a license');
            process.exit(1);
        }
        
        throw new Error(errorData.message || 'Failed to make request');
    }

    return response.json();
}

const IGNORED_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.env',
    'venv',
    'node_modules',
    '.DS_Store',
    'dist',
    'build',
    '__pycache__',
    '.pytest_cache',
    'coverage'
];

function shouldIgnoreFile(filePath) {
    return IGNORED_FILES.some(ignored => 
        filePath === ignored || 
        filePath.startsWith(ignored + '/') || 
        filePath.includes('/node_modules/') ||
        filePath.includes('/__pycache__/') ||
        filePath.includes('/venv/')
    );
}

async function getLastCommits(count = 20) {
    try {
        log('History', `Fetching last ${count} commits...`);
        const { stdout } = await execAsync(`git log -${count} --pretty=format:"%s"`);
        const commits = stdout.split('\n');
        log('History', `✓ Retrieved ${commits.length} commits`);
        return commits;
    } catch (error) {
        log('History', `Error fetching commit history: ${error.message}`, true);
        return [];
    }
}

async function getGitDiff(file) {
    try {
        log('Diff', `Getting differences for ${file}...`);
        const { stdout: lastCommit } = await execAsync('git rev-parse HEAD');
        
        let previousContent = '';
        try {
            const { stdout } = await execAsync(`git show ${lastCommit.trim()}:${file}`);
            previousContent = stdout;
            log('Diff', `✓ Retrieved previous content`);
        } catch (e) {
            log('Diff', `New file detected: ${file}`);
        }

        const { stdout: currentContent } = await execAsync(`git show :${file}`);
        log('Diff', `✓ Retrieved current content`);

        return {
            previous: previousContent,
            current: currentContent
        };
    } catch (error) {
        log('Diff', `Error processing ${file}: ${error.message}`, true);
        return null;
    }
}

async function getStagedFiles() {
    try {
        log('Git', 'Retrieving staged files...');
        const { stdout } = await execAsync('git diff --cached --name-status');
        const files = stdout.split('\n')
            .filter(line => line)
            .map(line => {
                const [status, ...fileParts] = line.split('\t');
                const file = fileParts.join('\t');
                return { status, file };
            })
            .filter(({ file }) => !shouldIgnoreFile(file));
        
        log('Git', `✓ Found ${files.length} staged files`);
        return files;
    } catch (error) {
        log('Git', `Error: ${error.message}`, true);
        return [];
    }
}

async function getRepoInfo() {
    try {
        log('Repo', 'Retrieving repository information...');
        const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url');
        const repoPath = remoteUrl.trim()
            .replace('git@github.com:', '')
            .replace('https://github.com/', '')
            .replace('.git', '');
        log('Repo', `✓ Repository identified: ${repoPath}`);
        return repoPath;
    } catch (error) {
        log('Repo', `Error: ${error.message}`, true);
        return '';
    }
}

async function generateCommitMessage(options) {
    try {
        log('Start', 'Starting commit message generation process...');
        const { mode = 'semantic', commitCount = 20 } = options;

        const files = await getStagedFiles();
        if (files.length === 0) {
            log('Git', 'No files staged. Use `git add <file>` first.', true);
            return;
        }

        log('Files', 'Analyzing:');
        files.forEach(({ status, file }) => {
            const statusText = {
                'A': `${colors.green}➕ Added`,
                'M': `${colors.yellow}📝 Modified`,
                'D': `${colors.red}❌ Deleted`
            }[status] || status;
            console.log(`   ${statusText}${colors.reset}: ${file}`);
        });

        const fileChanges = [];
        for (const { status, file } of files) {
            const diffResult = await getGitDiff(file);
            if (!diffResult) continue;

            fileChanges.push({
                name: path.basename(file),
                path: file,
                changeType: status === 'A' ? 'added' : status === 'M' ? 'modified' : 'deleted',
                contentType: 'text',
                changes: {
                    before: diffResult.previous,
                    after: diffResult.current
                }
            });
        }

        const repoName = await getRepoInfo();
        const commitHistory = mode === 'custom' ? await getLastCommits(parseInt(commitCount)) : [];
        
        log('API', `Processing diffs with AI using ${mode} mode...`);
        
        const response = await makeApiRequest('/generate-commit-message', {
            repo_name: repoName,
            file_changes: fileChanges,
            mode: mode,
            commit_history: commitHistory
        });

        log('Success', '✨ Commit message generated\n');

        function formatCommitMessage(message) {
            const [title, ...descriptionParts] = message.split('\n');
            const description = descriptionParts.join('\n');
            return `${colors.bright}${colors.customCyan}${title}${colors.reset}${description ? `\n${colors.darkCyan}${description}${colors.reset}` : ''}`;
        }

        console.log(`${colors.bright}📝 Suggested message (${mode} mode):${colors.reset}`);
        console.log(`${colors.yellow}------------------${colors.reset}`);
        console.log(formatCommitMessage(response.commit_message));

    } catch (error) {
        log('Error', error.message, true);
        if (error.message.includes('permission denied')) {
            log('Help', 'Make sure you have the necessary permissions and are in a git repository.');
        }
        process.exit(1);
    }
}

program
    .name('gitset')
    .description('Smart AI Docs & Versioning for GitHub Repositories.')
    .version('1.1.0');

program
    .command('activate')
    .description('Activate GitSet with a license key')
    .argument('[licenseKey]', 'Your GitSet license key')
    .action(async (licenseKey) => {
        try {
            if (!licenseKey) {
                const config = await loadConfig();
                if (config.licenseKey) {
                    log('License', 'Current license status:');
                    const status = await makeApiRequest('/validate-license', { licenseKey: config.licenseKey });
                    log('Status', `Plan: ${status.data.product_name}`);
                    log('Status', `Valid until: ${new Date(status.data.renews_at).toLocaleDateString()}`);
                } else {
                    log('License', 'No license key configured', true);
                    log('Info', 'You can use GitSet with limited features (10 requests/month)');
                    log('Info', 'To unlock unlimited usage, activate a pro license:');
                    log('Command', '  gitset activate <license-key>');
                    log('Purchase', 'Visit https://gitset.dev/pricing to get a license');
                }
                return;
            }

            const response = await makeApiRequest('/validate-license', { licenseKey });
            const config = await loadConfig();
            await saveConfig({
                ...config,  // Mantiene el installationId existente
                licenseKey,
                lastValidation: new Date().toISOString(),
                subscriptionData: response.data
            });
            log('Success', '✨ License activated successfully!');
            log('Plan', response.data.product_name);
            log('Info', 'You now have unlimited access to all features');
            
        } catch (error) {
            log('Error', error.message, true);
            process.exit(1);
        }
    });

    program
    .command('suggest')
    .description('Generate commit messages using AI-driven analysis of staged code changes.')
    .option('-m, --mode <mode>', 'Commit message mode (semantic or custom)', 'semantic')
    .option('-c, --commit-count <count>', 'Number of previous commits to analyze for custom mode', '20')
    .action(generateCommitMessage);

program
    .command('status')
    .description('Check your GitSet license status and usage')
    .action(async () => {
        try {
            const config = await loadConfig();
            
            if (!config.licenseKey) {
                log('License', 'No license key configured');
                log('Info', 'You are using GitSet with limited features (10 requests/month)');
                log('Info', 'To unlock unlimited usage, activate a pro license:');
                log('Command', '  gitset activate <license-key>');
                log('Purchase', 'Visit https://gitset.dev/pricing to get a license');
                return;
            }

            const response = await makeApiRequest('/validate-license', { licenseKey: config.licenseKey });
            
            log('License', 'License is active and valid ✨');
            log('Plan', response.data.product_name);
            log('Status', response.data.status);
            if (response.data.renews_at) {
                log('Renewal', `Next renewal: ${new Date(response.data.renews_at).toLocaleDateString()}`);
            }

            if (!response.data.product_name.toLowerCase().includes('pro')) {
                log('Usage', 'Request limits (Basic Plan):');
                const usageResponse = await makeApiRequest('/usage-info', { licenseKey: config.licenseKey });
                log('Info', `Used ${usageResponse.current_usage} of ${usageResponse.limit} monthly requests`);
                log('Info', `Reset date: ${new Date(usageResponse.next_reset_date).toLocaleDateString()}`);
            } else {
                log('Usage', 'Unlimited requests (Pro Plan)');
            }
            
        } catch (error) {
            log('Error', error.message, true);
            if (error.message.includes('validation')) {
                log('Help', 'Your license might have expired or been deactivated');
                log('Info', 'You can check your subscription status at https://gitset.dev/account');
            }
        }
    });

program
    .command('deactivate')
    .description('Deactivate and remove current license key')
    .action(async () => {
        try {
            const config = await loadConfig();
            
            if (!config.licenseKey) {
                log('Info', 'No active license found');
                return;
            }

            await saveConfig({
                ...config,
                licenseKey: null,
                lastValidation: null,
                subscriptionData: null,
            });
            log('Success', 'License deactivated successfully');
            log('Info', 'Switched to basic plan (10 requests/month)');
            log('Info', 'You can reactivate your license anytime with:');
            log('Command', '  gitset activate <license-key>');
            
        } catch (error) {
            log('Error', error.message, true);
            process.exit(1);
        }
    });

program
    .command('help')
    .description('Show detailed help and usage information')
    .action(() => {
        console.log(`
${colors.bright}GitSet CLI - Smart AI Commit Messages${colors.reset}

${colors.cyan}Usage:${colors.reset}
  gitset suggest              Generate a commit message for staged changes
  gitset activate <key>       Activate GitSet with a license key
  gitset status              Check license status and usage
  gitset deactivate          Remove current license key
  gitset help                Show this help message

${colors.cyan}Options for 'suggest':${colors.reset}
  -m, --mode <mode>         Commit message mode (semantic or custom)
  -c, --commit-count <n>    Number of commits to analyze in custom mode

${colors.cyan}Plans:${colors.reset}
  Basic (Free)              10 requests per month
  Pro                       Unlimited requests

${colors.cyan}Examples:${colors.reset}
  $ gitset suggest                    Generate semantic commit message
  $ gitset suggest -m custom          Generate message matching your style
  $ gitset activate ABC123...         Activate pro license
  $ gitset status                     Check current license status

${colors.cyan}Learn more:${colors.reset}
  Visit https://gitset.dev for documentation and pricing
  Report issues at https://github.com/gitset/cli/issues
        `);
    });

program.exitOverride((err) => {
    if (err.code === 'commander.help') {
        process.exit(0);
    }
    
    log('Error', err.message, true);
    
    if (err.code === 'commander.unknownCommand') {
        log('Help', 'Run "gitset help" to see available commands');
    }
    
    process.exit(1);
});

program.parse();