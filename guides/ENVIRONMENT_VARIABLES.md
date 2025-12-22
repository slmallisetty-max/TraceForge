# Environment Variables Reference

TraceForge supports various environment variables for configuration. This document lists all available options.

## Table of Contents
- [Proxy Configuration](#proxy-configuration)
- [VCR Mode Configuration](#vcr-mode-configuration)
- [Path Configuration](#path-configuration)
- [Provider Configuration](#provider-configuration)
- [Development & Testing](#development--testing)

---

## Proxy Configuration

### `OPENAI_API_KEY`
**Required for OpenAI provider**  
Your OpenAI API key for authenticating requests.

```bash
OPENAI_API_KEY=sk-...
```

### `ANTHROPIC_API_KEY`
**Required for Anthropic provider**  
Your Anthropic API key for Claude models.

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### `GOOGLE_API_KEY`
**Required for Google provider**  
Your Google API key for Gemini models.

```bash
GOOGLE_API_KEY=...
```

---

## VCR Mode Configuration

### `TRACEFORGE_VCR_MODE`
**Default:** `off`  
**Options:** `off`, `record`, `replay`, `auto`

Controls VCR (cassette recording) mode:
- `off`: VCR disabled, all requests go to real providers
- `record`: Record all requests as cassettes (overwrites existing)
- `replay`: Replay from cassettes only (errors if cassette missing)
- `auto`: Replay if cassette exists, otherwise make real request and record

```bash
TRACEFORGE_VCR_MODE=auto
```

**Use cases:**
- `record`: Initial test creation, updating test data
- `replay`: CI/CD, deterministic testing
- `auto`: Development, gradual test coverage increase
- `off`: Production, live debugging

### `TRACEFORGE_VCR_MATCH`
**Default:** `fuzzy`  
**Options:** `fuzzy`, `exact`

Controls how requests are matched to cassettes:
- `fuzzy`: Match only on model, messages/prompt, and tools (ignores temperature, etc.)
- `exact`: Match on all parameters including temperature, max_tokens, etc.

```bash
TRACEFORGE_VCR_MATCH=exact
```

### `TRACEFORGE_VCR_DIR`
**Default:** `.ai-tests/cassettes`

Directory where VCR cassettes are stored.

```bash
TRACEFORGE_VCR_DIR=./my-cassettes
```

---

## Path Configuration

### `TRACEFORGE_CONFIG_DIR`
**Default:** `.ai-tests`

Root directory for all TraceForge configuration and data.

```bash
TRACEFORGE_CONFIG_DIR=./traceforge-data
```

This affects:
- Config file location: `${TRACEFORGE_CONFIG_DIR}/config.yaml`
- Traces directory: `${TRACEFORGE_CONFIG_DIR}/traces`
- Tests directory: `${TRACEFORGE_CONFIG_DIR}/tests`

### `TRACEFORGE_TRACES_DIR`
**Default:** `.ai-tests/traces`

Directory where request/response traces are saved.

```bash
TRACEFORGE_TRACES_DIR=./traces
```

**Note:** This overrides the traces subdirectory independently of `TRACEFORGE_CONFIG_DIR`.

---

## Provider Configuration

Provider configurations can also be set via environment variables:

### `OPENAI_BASE_URL`
**Default:** `https://api.openai.com`

```bash
OPENAI_BASE_URL=https://api.openai.com
```

### `ANTHROPIC_BASE_URL`
**Default:** `https://api.anthropic.com`

```bash
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

### `GOOGLE_BASE_URL`
**Default:** `https://generativelanguage.googleapis.com`

```bash
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com
```

### `OLLAMA_BASE_URL`
**Default:** `http://localhost:11434`

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

---

## Development & Testing

### `NODE_ENV`
**Default:** `development`  
**Options:** `development`, `production`, `test`

Controls logging format and error handling:
- `development`: Pretty logs, detailed errors, hot reload
- `production`: JSON logs, minimal errors
- `test`: Minimal logging, optimized for testing

```bash
NODE_ENV=production
```

### `LOG_LEVEL`
**Default:** `info`  
**Options:** `trace`, `debug`, `info`, `warn`, `error`, `fatal`

Controls logging verbosity.

```bash
LOG_LEVEL=debug
```

---

## Configuration Priority

TraceForge follows this priority order for configuration:

1. **Environment variables** (highest priority)
2. **Config file** (`.ai-tests/config.yaml`)
3. **Defaults** (lowest priority)

Example: If you set `TRACEFORGE_VCR_MODE=replay` as an environment variable, it overrides the `vcr.mode` setting in `config.yaml`.

---

## Example Configurations

### Local Development
```bash
# .env
OPENAI_API_KEY=sk-...
TRACEFORGE_VCR_MODE=auto
NODE_ENV=development
```

### CI/CD Testing
```bash
# .env.test
TRACEFORGE_VCR_MODE=replay
TRACEFORGE_VCR_MATCH=exact
NODE_ENV=test
LOG_LEVEL=warn
```

### Production
```bash
# .env.production
OPENAI_API_KEY=sk-...
TRACEFORGE_VCR_MODE=off
NODE_ENV=production
LOG_LEVEL=error
TRACEFORGE_CONFIG_DIR=/var/lib/traceforge
```

### Multi-Provider Setup
```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
TRACEFORGE_VCR_MODE=auto
```

---

## Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use different keys per environment** - Separate dev/staging/prod
3. **Rotate keys regularly** - Especially after team member departures
4. **Limit key permissions** - Use read-only keys where possible
5. **Review traces** - Traces may contain sensitive data even with redaction
6. **Don't commit cassettes with real keys** - Use VCR with sanitized data in repos

---

## Troubleshooting

### "API key not found"
Ensure the correct environment variable is set for your provider:
- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Google: `GOOGLE_API_KEY`

### "VCR replay miss"
In `replay` mode, a cassette wasn't found. Options:
1. Switch to `auto` or `record` mode
2. Verify cassette path with `TRACEFORGE_VCR_DIR`
3. Check request signature matches (consider `fuzzy` mode)

### "Configuration not updating"
Config is cached for 60 seconds. To force reload:
1. Restart the proxy
2. Wait 60 seconds
3. Use `clearConfigCache()` API if programmatic

---

## See Also

- [Getting Started Guide](../docs/getting-started.md)
- [VCR Mode Documentation](../docs/VCR_USAGE.md)
- [Configuration Reference](../docs/baseline-format.md)
