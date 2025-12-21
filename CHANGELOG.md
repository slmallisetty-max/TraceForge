# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **VCR Mode**: Record/replay functionality for deterministic, offline testing
  - Environment variables: `TRACEFORGE_VCR_MODE`, `TRACEFORGE_VCR_MATCH`, `TRACEFORGE_VCR_DIR`
  - Four modes: `off`, `record`, `replay`, `auto`
  - Request matching with fuzzy and exact modes
  - Cassette management CLI commands: `vcr status`, `vcr list`, `vcr clean`
  - Integrated into proxy layer for automatic record/replay
  - Documentation: VCR_MODE_DESIGN.md, VCR_USAGE.md, VCR_QUICK_REFERENCE.md
- VCR benefits: No API keys needed, zero costs, deterministic tests, offline support

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
