#!/bin/bash
# Security Scan Script
# Scans repository for common security issues

set -e

echo "🔍 Running security scans..."

# Check for secrets  
echo "Checking for exposed secrets..."
if git ls-files | xargs grep -E "sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9-]+" 2>/dev/null | grep -v "\.test\." | grep -v "example"; then
  echo "❌ Potential secrets found!"
  exit 1
fi
echo "✅ No secrets found"

# Check for common vulnerabilities
echo "Checking for common anti-patterns..."
COUNT=0
if git ls-files "*.ts" "*.js" | xargs grep -n "eval(" 2>/dev/null | grep -v node_modules | grep -v "\.test\."; then
  echo "⚠️  Found use of eval()"
  COUNT=$((COUNT+1))
fi

if git ls-files "*.ts" "*.js" | xargs grep -n "dangerouslySetInnerHTML" 2>/dev/null | grep -v node_modules; then
  echo "⚠️  Found dangerouslySetInnerHTML"
  COUNT=$((COUNT+1))
fi

if [ $COUNT -gt 0 ]; then
  echo "⚠️  Found $COUNT potential security issues"
else
  echo "✅ No anti-patterns found"
fi

echo "✅ Security scan complete"
