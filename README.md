<div align="center">
    <img src="https://github.com/imprvhub/gitset/blob/main/public/favicon-114-precomposed.png" alt="GitSet CLI" />
    <br>
    <a href="https://badge.fury.io/js/@gitset-dev%2Fcli">
        <img src="https://img.shields.io/npm/v/@gitset-dev/cli?color=%237BFEF5" alt="npm version" />
    </a>
    <a href="https://opensource.org/licenses/MPL-2.0">
        <img src="https://img.shields.io/badge/License-MPL_2.0-%237BFEF5" alt="License: MPL 2.0" />
    </a>
    <br>
    <br>
    <h3>
        GitSet CLI - AI-Driven Commit Message Generation
    </h3>
</div>

## Overview

GitSet CLI is an integral component of the GitSet.dev ecosystem, designed to enhance Git workflow automation through AI-driven commit message generation. By leveraging Google's Gemini Pro AI technology, it provides intelligent analysis of staged changes to generate contextually appropriate commit messages, supporting both semantic and personalized formatting styles.

## Key Capabilities

The GitSet CLI enhances repository management through:

- **AI-Powered Analysis**: Utilizes advanced AI processing to analyze staged changes and generate contextually appropriate commit messages
- **Semantic Versioning Support**: Implements conventional commit standards for maintaining structured version control
- **Style Adaptation**: Analyzes existing commit patterns to match personal or team commit message conventions
- **Efficient Processing**: Provides rapid analysis and suggestion generation while maintaining minimal resource utilization
- **Cross-Platform Architecture**: Ensures consistent operation across various operating systems and environments
- **License Management**: Flexible licensing system with both free and pro tiers for different usage needs
- **Usage Tracking**: Built-in monitoring of API usage and license status

## System Requirements

- Node.js Runtime Environment (Version 18.0.0 or higher)
- Git (Installed and configured)
- Active internet connection for AI processing

## Installation Process

Install the GitSet CLI globally via npm:

```bash
npm install -g @gitset-dev/cli
```

## Implementation Guide

### Basic Usage

1. Stage your modifications:
```bash
git add .
```

2. Generate commit message suggestions:
```bash
# Semantic versioning format (default)
gitset suggest

# Custom formatting style
gitset suggest --mode custom
```

3. Implement the generated message:
```bash
git commit -m "generated_message"
```

### License Management

Activate your GitSet license:
```bash
# Activate with license key
gitset activate <license-key>

# Check license status and usage
gitset status

# Remove current license
gitset deactivate
```

### Operational Modes

#### Semantic Mode (Default Implementation)
Implements conventional commit standards to generate structured, semantic commit messages. This mode is optimized for maintaining consistent and professional Git history in enterprise environments.

Example output:
```bash
$ gitset suggest
✨ Generated Suggestion:
------------------------
feat: Implement JWT authentication system

- Add token generation and validation mechanisms
- Integrate login and registration endpoints
- Configure route protection middleware
```

#### Custom Mode
Analyzes existing commit patterns to generate messages that align with established conventions:

- Evaluates recent commit history (default: 20 commits) for pattern recognition
- Adapts to existing formatting conventions and structural patterns
- Maintains sequential naming conventions if detected
- Preserves emoji usage patterns and placement
- Replicates capitalization and punctuation styles
- Balances descriptive content with stylistic consistency

Example of style adaptation:
```bash
# Given existing commit pattern:
FEATURE_123: Enhanced login interface 🚀
FEATURE_124: Updated navigation system ✨
FEATURE_125: Resolved routing conflicts 🔧

# Generated suggestion maintains consistency:
FEATURE_126: Implemented user preferences 🎯
```

## Configuration Reference

### Command Structure

Available commands:
- `gitset suggest` - Initiates commit message generation based on staged changes
- `gitset activate` - Activates GitSet with a license key
- `gitset status` - Checks current license status and usage
- `gitset deactivate` - Removes current license configuration
- `gitset help` - Displays detailed usage information

### Available Parameters

For suggest command:
- `--mode <mode>` - Specifies generation mode ('semantic' or 'custom')
- `--commit-count <count>` - Defines number of commits to analyze (default: 20)
- `--version` - Displays CLI version information
- `--help` - Provides command usage information

## Plans and Pricing

- **Basic (Free)**
  - 10 requests per month
  - Basic commit message generation
  - Semantic and custom modes support

- **Pro**
  - Unlimited requests
  - Advanced features and priority support
  - Visit https://gitset.dev/pricing for details

## Development Contribution

We welcome contributions to enhance the GitSet CLI. Please follow these steps:

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/enhancement-description
   ```
3. Implement modifications:
   ```bash
   git commit -m 'feat: Add enhancement description'
   ```
4. Push changes:
   ```bash
   git push origin feature/enhancement-description
   ```
5. Submit a Pull Request

## License Information

This project operates under the Mozilla Public License 2.0 - refer to [LICENSE.md](LICENSE.md) for detailed terms.

## Support Channels

- Technical Support: support@gitset.dev
- Contact Form: https://gitset.dev/contact
- Issue Tracking: https://github.com/gitset-dev/gitset-cli/issues
- Account Management: https://gitset.dev/account

## Acknowledgments

- Contributors who have helped improve this tool
- Commander.js for CLI framework support
- Google's Gemini Pro for AI capabilities

---

Part of the [GitSet.dev](https://gitset.dev) ecosystem - Smart AI Documentation & Version Control for GitHub Repositories.
