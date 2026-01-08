# GDPR & CCPA Compliance Guide

## Overview

TraceForge records LLM interactions which may contain Personally Identifiable Information (PII). This guide outlines compliance measures for GDPR (EU) and CCPA (California) regulations.

## Data Classification

### Data Collected
- **Request Data**: User prompts sent to LLM providers
- **Response Data**: LLM completions and responses
- **Metadata**: Timestamps, model IDs, token counts, latencies
- **Technical Data**: Request IDs, session IDs, IP addresses (if logged)

### Potential PII
- Names, email addresses, phone numbers
- Addresses, postal codes
- Social security numbers, ID numbers
- Financial information
- Health information
- Any user-generated content in prompts

## Compliance Principles

### 1. Data Minimization
**Requirement**: Collect only necessary data

**Implementation**:
```javascript
// Enable PII redaction (in .traceforgerc.json)
{
  "policies": {
    "redact_pii": true,
    "redact_patterns": [
      "ssn",
      "email",
      "phone",
      "credit_card"
    ]
  }
}
```

### 2. Purpose Limitation
**Purpose**: Data collected for:
- Debugging LLM interactions
- Testing AI behavior consistency
- Audit trail for compliance
- Performance monitoring

**Not Used For**:
- Marketing
- Profiling
- Third-party sharing
- Any purpose not disclosed

### 3. Storage Limitation
**Requirement**: Don't keep data longer than necessary

**Implementation**:
```bash
# Configure retention period (default: 90 days)
export TRACEFORGE_RETENTION_DAYS=90

# Automatic cleanup
traceforge vcr clean --older-than 90d
```

**Automated Cleanup** (cron):
```bash
# Daily cleanup of old traces
0 3 * * * cd /path/to/traceforge && traceforge vcr clean --older-than 90d
```

## Data Subject Rights

### Right to Access (GDPR Art. 15, CCPA 1798.110)
**Request**: "What data do you have about me?"

**Response Process**:
```bash
# Export all traces for a user
traceforge trace export --user-id=<user_id> --format=json > user_data.json

# Or via API
curl -X GET "http://localhost:3001/api/traces?user_id=<user_id>" \
  -H "Authorization: Bearer <token>"
```

**Timeline**: 30 days (GDPR), 45 days (CCPA)

### Right to Deletion (GDPR Art. 17, CCPA 1798.105)
**Request**: "Delete my data"

**Implementation**:
```bash
# Delete all traces for a user
traceforge trace delete --user-id=<user_id> --confirm

# Or via API
curl -X DELETE "http://localhost:3001/api/traces?user_id=<user_id>" \
  -H "Authorization: Bearer <token>"
```

**Exceptions**: Data retained for legal obligations or legitimate interests

### Right to Rectification (GDPR Art. 16)
**Request**: "Correct my data"

**Process**:
1. Locate incorrect trace
2. Delete or update (if immutable, delete and recreate)
3. Notify user of correction

### Right to Portability (GDPR Art. 20, CCPA 1798.110)
**Request**: "Give me my data in a portable format"

**Implementation**:
```bash
# Export in JSON format (machine-readable)
traceforge trace export --user-id=<user_id> --format=json

# Or CSV format
traceforge trace export --user-id=<user_id> --format=csv
```

### Right to Object (GDPR Art. 21)
**Request**: "Stop processing my data"

**Implementation**:
1. Add user to opt-out list
2. Stop recording new interactions
3. Optionally delete existing data

```javascript
// In application code
if (isUserOptedOut(userId)) {
  // Skip TraceForge proxy, call OpenAI directly
  return callOpenAIDirect(request);
}
```

## Consent Management

### Obtaining Consent
- **Clear disclosure**: Inform users that interactions are recorded
- **Granular consent**: Separate consent for different processing activities
- **Withdrawable**: Users can withdraw consent at any time

### Consent Record
```javascript
{
  "user_id": "user123",
  "consent_given": true,
  "consent_date": "2024-01-15T10:30:00Z",
  "consent_version": "1.0",
  "purposes": ["debugging", "testing", "audit"],
  "ip_address": "redacted",
  "user_agent": "Mozilla/5.0..."
}
```

## Technical Safeguards

### 1. Encryption
**At Rest**:
```bash
# Enable encryption for cassettes
export TRACEFORGE_ENCRYPT_AT_REST=true
export TRACEFORGE_ENCRYPTION_KEY=<secure_key>
```

**In Transit**: Always use HTTPS/TLS

### 2. Access Controls
- Role-based access control (RBAC)
- Audit logs for data access
- Principle of least privilege

### 3. Pseudonymization
```typescript
// Pseudonymize user identifiers
import { pseudonymize } from '@traceforge/shared';

const pseudoId = pseudonymize(userId, SALT);
// Store pseudoId instead of userId in traces
```

### 4. Anonymization
For long-term storage or analytics:
```bash
# Anonymize old traces (irreversible)
traceforge trace anonymize --older-than 365d
```

## Data Processing Agreement (DPA)

### Third-Party Processors
TraceForge forwards data to:
- **OpenAI** - LLM provider
- **Anthropic** - LLM provider (optional)
- **Google** - LLM provider (optional)

**Requirement**: Ensure DPAs are in place with each processor

### Controller-Processor Relationship
- **You (Application Owner)**: Data Controller
- **TraceForge**: Data Processor
- **LLM Providers**: Sub-processors

## Breach Notification

### Detection
Monitor for:
- Unauthorized access to traces
- Data exfiltration attempts
- Accidental public exposure

### Notification Timeline
- **GDPR**: 72 hours to supervisory authority
- **CCPA**: Without unreasonable delay

### Process
1. Contain the breach
2. Assess impact and scope
3. Notify authorities (if required)
4. Notify affected individuals (if high risk)
5. Document incident and response

## Privacy by Design

### Configuration Template
```json
{
  "privacy": {
    "redact_pii": true,
    "encrypt_at_rest": true,
    "retention_days": 90,
    "pseudonymize_users": true,
    "log_ip_addresses": false,
    "consent_required": true
  },
  "policies": {
    "block_patterns": [
      "ssn",
      "credit_card",
      "api_key",
      "password"
    ]
  }
}
```

## Documentation Requirements

### Records of Processing Activities (GDPR Art. 30)
Maintain:
- Purpose of processing
- Categories of data
- Recipients of data
- Retention periods
- Security measures

### Privacy Impact Assessment (PIA)
Required if:
- Large-scale processing of sensitive data
- Systematic monitoring
- Automated decision-making

## Cross-Border Transfers

### EU to US
- Use Standard Contractual Clauses (SCCs)
- Comply with adequacy decisions
- Implement supplementary measures

### Configuration
```bash
# Restrict data residency
export TRACEFORGE_DATA_REGION=eu-west-1
export TRACEFORGE_ALLOW_TRANSFER=false
```

## Audit and Compliance Monitoring

### Regular Audits
- Quarterly data inventory review
- Annual compliance audit
- Penetration testing (if processing sensitive data)

### Compliance Checklist
```bash
# Run compliance check
traceforge audit compliance --standard=gdpr

# Generate report
traceforge audit report --output=compliance-report.pdf
```

## Training and Awareness

### Staff Training
- Data protection principles
- PII identification
- Incident response procedures
- User rights and how to handle requests

### Documentation
- Internal privacy policy
- Data handling procedures
- Incident response plan

## Contact Information

### Data Protection Officer (DPO)
- Email: dpo@yourcompany.com
- Required if: public authority, large-scale monitoring, or sensitive data

### Privacy Contact
For user inquiries:
- Email: privacy@yourcompany.com
- Response time: 5 business days

## Useful Commands

```bash
# Export user data
traceforge trace export --user-id=<id> --format=json

# Delete user data
traceforge trace delete --user-id=<id> --confirm

# Check retention
traceforge trace stats --group-by=age

# Run cleanup
traceforge vcr clean --older-than 90d

# Audit data access
traceforge audit access-log --date-range="2024-01-01:2024-01-31"

# Generate compliance report
traceforge audit compliance --output=report.pdf
```

## Resources

- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA Full Text](https://oag.ca.gov/privacy/ccpa)
- [ICO GDPR Guidance](https://ico.org.uk/for-organisations/guide-to-data-protection/)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)

---

**Last Updated:** 2026-01-08  
**Owner:** Legal/Compliance + Privacy Team  
**Review Schedule:** Quarterly or when regulations change

**Disclaimer**: This guide provides general information and does not constitute legal advice. Consult with legal counsel for your specific compliance requirements.
