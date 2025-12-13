## test-integration.ps1 - Automated Build Test Script

This PowerShell script runs 3 automated tests:

### **Test 1: Build All Packages**

Builds each package in order and verifies compilation:

- shared - TypeScript types and schemas
- proxy - LLM proxy server
- cli - Command-line tool
- server - Web API backend
- `packages/web/client` - React frontend (typecheck only)

If any build fails, script exits with error code 1.

### **Test 2: Initialize TraceForge**

Runs the CLI init command:

```powershell
node packages\cli\dist\index.js init
```

Creates the .ai-tests directory structure.

### **Test 3: Verify Directory Structure**

Checks that initialization created:

- .ai-tests directory
- traces subdirectory
- tests subdirectory
- `.ai-tests/config.json` file

### **Output**

- Color-coded results (Green ✅ = Pass, Red ❌ = Fail)
- Shows which package is building in real-time
- Displays manual testing instructions at the end

### **Usage**

```powershell
cd C:\TraceForge
.\test-integration.ps1
```

This validates that all code compiles before you start the 4-terminal manual testing workflow.
