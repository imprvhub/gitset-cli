#!/usr/bin/env node 
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { program } from 'commander';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

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
    const prefix = isError ? colors.red + '❌' : colors.green + '✨';
    const stepColor = isError ? colors.red : colors.cyan;
    console.log(`${prefix} ${colors.reset}[${timestamp}] ${stepColor}${step}${colors.reset}: ${message}`);
}

async function getGitDiff(file) {
    try {
        log('Diff', `Getting differences for ${file}...`);
        const { stdout: lastCommit } = await execAsync('git rev-parse HEAD');
        
        let previousContent = '';
        try {
            const { stdout } = await execAsync(`git show ${lastCommit.trim()}:${file}`);
            const lineCount = stdout.split('\n').length;
            if (lineCount > MAX_LINES) {
                log('Diff', `Skipping ${file}: exceeds ${MAX_LINES} lines (has ${lineCount} lines)`, true);
                return null;
            }
            previousContent = stdout;
            log('Diff', `✓ Retrieved previous content (${stdout.length} bytes, ${lineCount} lines)`);
        } catch (e) {
            log('Diff', `New file detected: ${file}`);
        }

        const { stdout: currentContent } = await execAsync(`git show :${file}`);
        const currentLineCount = currentContent.split('\n').length;
        if (currentLineCount > MAX_LINES) {
            log('Diff', `Skipping ${file}: exceeds ${MAX_LINES} lines (has ${currentLineCount} lines)`, true);
            return null;
        }
        log('Diff', `✓ Retrieved current content (${currentContent.length} bytes, ${currentLineCount} lines)`);

        return {
            previous: previousContent,
            current: currentContent
        };
    } catch (error) {
        log('Diff', `Error processing ${file}: ${error.message}`, true);
        return null;
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

// Files that should typically be ignored
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

const MAX_LINES = 3000;

function shouldIgnoreFile(filePath) {
    return IGNORED_FILES.some(ignored => 
        filePath === ignored || 
        filePath.startsWith(ignored + '/') || 
        filePath.includes('/node_modules/') ||
        filePath.includes('/__pycache__/') ||
        filePath.includes('/venv/')
    );
}

async function getStagedFiles() {
    try {
        log('Git', 'Looking for staged files...');
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

async function generateCommitMessage() {
    try {
        log('Start', 'Starting commit message generation process...');

        const files = await getStagedFiles();
        if (files.length === 0) {
            log('Git', 'No files staged. Use git add first.', true);
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

        const fileChanges = (await Promise.all(
            files.map(async ({ status, file }) => {
                const diffResult = await getGitDiff(file);
                if (!diffResult) return null;
                
                const { previous, current } = diffResult;
                const extension = path.extname(file).toLowerCase();

                return {
                    name: path.basename(file),
                    path: file,
                    changeType: status === 'A' ? 'added' : status === 'M' ? 'modified' : 'deleted',
                    contentType: ['.jpg', '.png', '.gif', '.pdf'].includes(extension) ? 'binary' : 'text',
                    changes: {
                        before: previous,
                        after: current
                    }
                };
            })
        )).filter(change => change !== null);

        const repoName = await getRepoInfo();
        log('API', 'Processing diffs with AI...');

        const payload = {
            repo_name: repoName,
            file_changes: fileChanges
        };

        await fs.writeFile('debug-payload.json', JSON.stringify(payload, null, 2));
        log('Debug', `Payload saved to debug-payload.json (${JSON.stringify(payload).length} bytes)`);

        const response = await fetch('https://gitset-commit-messages.vercel.app/generate-commit-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repo_name: repoName,
                file_changes: fileChanges
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            let errorMessage;
            
            try {
                const parsedError = JSON.parse(errorData);
                if (response.status === 500 && parsedError.message?.includes('429')) {
                    errorMessage = `${colors.yellow}The API rate limit has been reached. Please try again in a few minutes.${colors.reset}`;
                } else {
                    errorMessage = `Server error (${response.status}): ${parsedError.message || errorData}`;
                }
            } catch {
                errorMessage = `Server error (${response.status}): ${errorData}`;
            }
            
            throw new Error(errorMessage);
        }

        const { commit_message } = await response.json();
        log('Success', '✨ Commit message generated\n');
        function formatCommitMessage(message) {
            const [title, ...descriptionParts] = message.split('\n');
            const description = descriptionParts.join('\n');
            return `${colors.bright}${colors.customCyan}${title}${colors.reset}\n${description ? `\n${colors.darkCyan}${description}${colors.reset}` : ''}`;
        }

        console.log(`${colors.bright}📝 Suggested message:${colors.reset}`);
        console.log(`${colors.yellow}------------------${colors.reset}`);
        console.log(formatCommitMessage(commit_message));

    } catch (error) {
        log('Error', error.message, true);
        process.exit(1);
    }
}

program
    .name('gitset')
    .description('Generate semantic commit messages using AI-driven analysis of staged code changes.')
    .version('0.2.0')
    .action(generateCommitMessage);

program.parse();