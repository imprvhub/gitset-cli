#!/usr/bin/env node 
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { program } from 'commander';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

function log(step, message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '❌' : '✨';
    console.log(`${prefix} [${timestamp}] ${step}: ${message}`);
}

function getFormattedTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

async function getGitDiff(file) {
    try {
        log('Diff', `Getting differences for ${file}...`);
        const { stdout: lastCommit } = await execAsync('git rev-parse HEAD');
        
        let previousContent = '';
        try {
            const { stdout } = await execAsync(`git show ${lastCommit.trim()}:${file}`);
            previousContent = stdout;
            log('Diff', `✓ Retrieved previous content (${stdout.length} bytes)`);
        } catch (e) {
            log('Diff', `New file detected: ${file}`);
        }

        const { stdout: currentContent } = await execAsync(`git show :${file}`);
        log('Diff', `✓ Retrieved current content (${currentContent.length} bytes)`);

        return {
            previous: previousContent,
            current: currentContent
        };
    } catch (error) {
        log('Diff', `Error processing ${file}: ${error.message}`, true);
        return { previous: '', current: '' };
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

async function getStagedFiles() {
    try {
        log('Git', 'Looking for staged files...');
        const { stdout } = await execAsync('git diff --cached --name-status');
        const files = stdout.split('\n')
            .filter(line => line)
            .map(line => {
                const [status, ...fileParts] = line.split('\t');
                return { status, file: fileParts.join('\t') };
            });
        
        log('Git', `✓ Found ${files.length} staged files`);
        return files;
    } catch (error) {
        log('Git', `Error: ${error.message}`, true);
        return [];
    }
}

function formatFileContent(fileName, status, previousContent, currentContent) {
    return `File: ${fileName}
Status: ${status}

----- PREVIOUS VERSION -----
${previousContent || '[New File - No Previous Content]'}

----- CURRENT VERSION -----
${currentContent || '[File Deleted - No Current Content]'}

========================================
`;
}

async function saveChangesToFile(fileChanges) {
    try {
        const logsDir = path.join(process.cwd(), 'logs');
        await fs.mkdir(logsDir, { recursive: true });

        const timestamp = getFormattedTimestamp();
        const logFile = path.join(logsDir, `changes-${timestamp}.txt`);

        let fullContent = `Changes Log - ${new Date().toLocaleString()}\n\n`;

        for (const change of fileChanges) {
            fullContent += formatFileContent(
                change.path,
                change.changeType,
                change.changes.before,
                change.changes.after
            );
        }

        await fs.writeFile(logFile, fullContent, 'utf8');
        return logFile;
    } catch (error) {
        console.error('Error saving changes:', error);
        throw error;
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
                'A': '➕ Added',
                'M': '📝 Modified',
                'D': '❌ Deleted'
            }[status] || status;
            console.log(`   ${statusText}: ${file}`);
        });

        const fileChanges = await Promise.all(
            files.map(async ({ status, file }) => {
                const { previous, current } = await getGitDiff(file);
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
        );

        const logFilePath = await saveChangesToFile(fileChanges);
        log('Log', `Changes saved to: ${logFilePath}`);

        const repoName = await getRepoInfo();
        log('API', 'Sending information to the server...');
        
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
            throw new Error(`Server error (${response.status}): ${errorData}`);
        }

        const { commit_message } = await response.json();
        log('Success', '✨ Commit message generated\n');
        console.log('📝 Suggested message:');
        console.log('------------------');
        console.log(commit_message);
        console.log('------------------');
        console.log('\n💡 To use this message:');
        console.log(`git commit -m "${commit_message}"`);

    } catch (error) {
        log('Error', error.message, true);
        process.exit(1);
    }
}

program
    .name('gitset')
    .description('AI-powered commit message generator - Creates meaningful commit messages based on your staged changes')
    .version('0.1.0')
    .action(generateCommitMessage);

program.parse();