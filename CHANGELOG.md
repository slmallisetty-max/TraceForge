# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (2026 Q1 - Week 3: Risk Scoring) - January 3, 2026
- **Risk Scoring Engine**: Automated risk classification for AI response changes
  - Analyzes differences between baseline and current responses
  - Three risk categories: Cosmetic (1-3), Semantic (4-7), Safety (8-10)
  - Multiple analysis dimensions:
    - Semantic similarity (using Week 1 embeddings)
    - Word overlap (Jaccard similarity)
    - Length changes
    - Tone shift estimation
    - Format changes (JSON, code blocks, lists)
    - Performance deltas (latency, tokens)
  - Actionable recommendations: Approve, Review, Block
  - Confidence scoring (0-1) for classification quality
  - Human-readable explanations for risk scores
  - Risk factor breakdown in output
- **CLI Integration**: New `trace compare` command
  - Compare two traces by ID
  - Display basic comparison (model, duration, tokens)
  - Optional `--with-risk` flag for risk analysis
  - Formatted output with emojis and color coding
  - Graceful error handling if risk scoring fails
- **Configuration**: Risk scoring settings in `.traceforge.yml`
  - `risk_scoring.enabled`: Toggle feature
  - `risk_scoring.fail_on`: When to fail CI (safety/semantic/cosmetic/never)
  - `risk_scoring.min_severity`: Minimum severity to fail (1-10)
  - `risk_scoring.allow_cosmetic`: Auto-approve cosmetic changes
  - `risk_scoring.auto_approve_below`: Severity threshold for auto-approval
  - `risk_scoring.require_approval_for`: Categories requiring review
- **Programmatic API**: `calculateRiskScore()` from `@traceforge/shared`
  - Flexible input: strings or response objects
  - Optional metadata (duration, tokens)
  - Custom thresholds (semantic, length, tone)
  - Policy violation integration (for Week 4)
- **Testing**: 32 comprehensive tests covering all scenarios
  - Risk classification accuracy tests
  - Factor calculation tests (word overlap, tone, format)
  - Edge cases (empty strings, unicode, special chars)
  - Threshold customization tests
  - Output formatting tests
- **Documentation**: `guides/RISK_SCORING_GUIDE.md`
  - Quick start examples
  - Risk categories explained
  - Configuration reference (strict/balanced/permissive modes)
  - Programmatic usage guide
  - CI/CD integration examples (GitHub Actions)
  - Troubleshooting guide and FAQ

### Added (2026 Q1 - Week 1 & 2: Semantic Assertions + Polish)
- **Semantic Assertions**: Meaning-based test validation using embeddings
  - `semantic` assertion type: Validate responses by semantic similarity (cosine similarity)
  - `semantic-contradiction` assertion type: Detect contradictions with forbidden statements
  - `semantic-intent` assertion type: Coming in Week 4 (intent classification)
  - Embedding service infrastructure with OpenAI integration
  - Automatic embedding caching for deterministic CI runs
  - Configuration via `embedding` section in config.yaml
  - Example test: `.ai-tests/tests/semantic-example.yaml`
  - Documentation: Updated assertions.md with semantic assertion types
- Embedding service with caching layer
  - OpenAI `text-embedding-3-small` model support
  - Disk and memory caching for performance
  - Configurable cache directory
  - SHA-256 hashing for cache keys
- Updated type definitions for new assertion types (11 total assertion types)
- Comprehensive test suite for semantic assertions (47 CLI tests passing)
- **Week 2 Polish & Integration Testing**:
  - Performance benchmark tool (`packages/proxy/benchmarks/embeddings.js`)
  - Improved error messages with helpful context and suggestions
  - Enhanced validation for empty texts and API key issues
  - Better error handling for rate limits and network issues
  - Quick Start Guide: `guides/SEMANTIC_ASSERTIONS_QUICK_START.md`
  - Updated README.md with semantic assertions documentation

### Changed (2026 Q1 - Week 2)
- Enhanced error messages for semantic assertions with actionable suggestions
- Added validation for empty expected/forbidden statements
- Improved API error messages with status code classification (401, 429, 400)
- Updated cosineSimilarity to handle edge cases (zero vectors, dimension mismatches)
- Better user feedback for common issues (missing API key, rate limits)

### Added (2025-12-20 - VCR Mode)
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
