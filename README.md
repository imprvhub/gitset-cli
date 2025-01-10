# @gitset-dev/cli

<div align="center">
  <img src="https://github.com/imprvhub/gitset/blob/main/public/favicon-120-precomposed.png" alt="Gitset" />
  <br>
  <a href="https://badge.fury.io/js/@gitset-dev%2Fcli">
    <img src="https://img.shields.io/npm/v/@gitset-dev/cli?color=%237BFEF5" alt="npm version" />
  </a>
  <a href="https://opensource.org/licenses/MPL-2.0">
    <img src="https://img.shields.io/badge/License-MPL_2.0-%237BFEF5" alt="License: MPL 2.0" />
  </a>
  <br>
  <br>
  <p><em>Generate commit messages using AI-driven analysis - now with style adaptation!</em></p>
</div>

## Features

- 🤖 AI-powered commit message generation
- 📝 Semantic commit message formatting
- 🎨 Personal style adaptation (New!)
- 🔍 Smart analysis of staged changes
- 🚀 Fast and lightweight
- 💻 Cross-platform support

## Installation

```bash
npm install -g @gitset-dev/cli
```

## Usage

1. Stage your changes:
```bash
git add .
```

2. Generate a commit message:
```bash
# Semantic mode (default)
gitset suggest

# Custom style mode
gitset suggest --mode custom
```

3. Review and use the generated message:
```bash
git commit -m "your generated message"
```

## Examples

```bash
# Semantic mode (default)
$ gitset suggest
✨ Suggested message:
------------------
feat: Add user authentication feature with JWT support

- Implement JWT token generation and validation
- Add login and signup endpoints
- Create middleware for route protection

# Custom style mode
$ gitset suggest --mode custom
✨ Suggested message:
------------------
[Auth] Added JWT user authentication 🔐

Implemented token system, added login/signup routes,
and set up protection middleware! Ready for testing.
```

## Requirements

- Node.js >= 18.0.0
- Git installed and configured

## Commit Message Modes

### Semantic Mode (Default)
The default mode follows conventional commit standards to generate structured, semantic commit messages. Perfect for maintaining a clean and standard Git history in professional projects.

### Custom Mode
Custom mode analyzes your previous commit messages and adapts to your personal writing style:
- Studies your last commits (default: 20) to understand your patterns
- Learns from your formatting, tone, and structure
- Maintains your sequential patterns if you use them
- Adapts emoji usage based on your style
- Preserves your capitalization and punctuation preferences
- Keeps descriptive content while matching your style

Example of style adaptation:
```bash
# If your commits look like this:
FEATURE_123: added login page 🚀
FEATURE_124: updated navbar design ✨
FEATURE_125: fixed routing issues 🔧

# Custom mode will generate similar style:
FEATURE_126: implemented user settings 🎯
```

## Configuration

No additional configuration needed. The CLI automatically detects your Git repository and staged changes.

## API Reference

### Commands

- `gitset suggest` - Generate a commit message based on staged changes

### Options

- `--mode <mode>` - Choose between 'semantic' (default) or 'custom' style
- `--commit-count <count>` - Number of previous commits to analyze (default: 20)
- `--version` - Show CLI version
- `--help` - Show help information

## Contributing

We love your input! We want to make contributing to @gitset-dev/cli as easy and transparent as possible.

1. Fork the repo
2. Create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'feat: Add some amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

## License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE.md](LICENSE.md) file for details.

## Support

- Email: support@gitset.dev
- Contact Form: https://gitset.dev/contact
- Issues: https://github.com/gitset-dev/gitset-cli/issues

## Acknowledgments

- Thanks to all our contributors
- Built with [Commander.js](https://github.com/tj/commander.js)
- Powered by Google's Gemini Pro

---
