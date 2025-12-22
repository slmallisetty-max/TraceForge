# Security Policy

## Supported Versions

We release security patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in TraceForge.baseline, please report it responsibly:

### How to Report

1. **Email**: Send details to security@traceforge.dev
2. **Subject**: Prefix with `[SECURITY]`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)
   - Your contact information

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Status Updates**: Every 7 days until resolved
- **Disclosure Timeline**: We aim to resolve critical issues within 30 days

### Disclosure Policy

We follow a coordinated disclosure approach:
1. We'll work with you to validate and fix the issue
2. Once fixed, we'll release a security patch
3. We'll publish a security advisory with credit to the reporter (if desired)
4. Public disclosure occurs 30 days after patch release, or sooner if agreed upon

## Security Scope

### In Scope

The following components are covered by this security policy:

- **Proxy Server** (`packages/proxy/`)
  - API request/response handling
  - Provider credential handling
  - Sensitive data redaction
  - Request forwarding logic
  
- **CLI** (`packages/cli/`)
  - Test execution and validation
  - Trace file handling
  - Local file system operations
  
- **Web UI** (`packages/web/`)
  - Dashboard and trace viewer
  - Configuration management
  - API communication
  
- **Docker Images**
  - Container security
  - Environment variable handling

### Out of Scope

- Third-party dependencies (report to their maintainers)
- Social engineering attacks
- Physical access attacks
- Denial of Service via excessive API usage (use rate limiting)
- Issues in example/demo applications

## Security Best Practices

When using TraceForge.baseline:

### API Keys & Credentials

- **Never commit** `.env` files or API keys
- Use environment variables for all secrets
- Rotate credentials regularly
- Use separate keys for dev/staging/production

### Redaction Configuration

- Review and test redaction patterns before production use
- Ensure PII patterns match your data format
- Regularly audit stored traces for leaked sensitive data

### Deployment

- Run the proxy in a private network when possible
- Use HTTPS/TLS for all external communication
- Enable rate limiting in production
- Set appropriate body size limits
- Monitor logs for suspicious activity

### Trace Storage

- Traces may contain sensitive data even with redaction
- Store traces securely with appropriate access controls
- Implement retention policies and automatic cleanup
- Encrypt traces at rest if required by compliance

## Known Security Considerations

### Redaction Limitations

The redaction system uses regex patterns and may not catch all sensitive data:
- Complex PII formats may not match patterns
- New formats may emerge that aren't covered
- Always validate redaction effectiveness for your use case

### VCR Mode Cassettes

Cassette files may contain:
- API request/response data
- Headers (except explicitly redacted ones)
- Token usage and metadata

**Never commit cassettes containing real API keys or production data.**

## Security Updates

Security patches are released as:
- Patch versions (x.x.X) for minor issues
- Minor versions (x.X.x) if API changes required
- Immediate hotfixes for critical vulnerabilities

Subscribe to GitHub releases or watch the repository to receive notifications.

## Hall of Fame

We recognize security researchers who help keep TraceForge.baseline secure:

<!-- Security researchers will be listed here with permission -->

## Contact

For non-security questions, use GitHub Issues or Discussions.

For security concerns, email: [INSERT_SECURITY_EMAIL@example.com]

---

*This security policy is based on industry best practices and may be updated periodically.*
