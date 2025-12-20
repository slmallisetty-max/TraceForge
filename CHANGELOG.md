# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-12-20

### Added
- Initial release of TraceForge.baseline.
- Multi-provider support (OpenAI, Anthropic, Gemini, Ollama).
- Web UI for trace visualization and comparison.
- VS Code extension for test management.
- Security hardening (redaction, input validation).
- CI/CD workflows with GitHub Actions.

### Changed
- **License**: Changed from MIT to Apache 2.0.
- Improved error handling in Proxy server.
- Enhanced streaming support with chunk limits to prevent OOM.
- Updated documentation structure.

### Security
- Added `SECURITY.md` policy.
- Implemented strict Zod schema validation for all inputs.
- Added redaction middleware for sensitive keys.
