# Proxy Integration Issues & Workaround

**Date:** 2025-01-04  
**Status:** Proxy module resolution issue identified

---

## Issue Discovered

When attempting to start the TraceForge proxy from the monorepo:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 
'C:\repo\TraceForge.baseline\packages\proxy\dist\vcr' 
imported from C:\repo\TraceForge.baseline\packages\proxy\dist\config.js
```

**Cause:** TypeScript compilation is not adding `.js` extensions to ES module imports.

---

## Impact on Validation

### ❌ Cannot Test (Currently)
- Full proxy integration with example
- Record mode testing
- Replay mode testing
- Strict mode enforcement testing

### ✅ Can Still Validate
- Cassette structure (already validated)
- Example code correctness
- CI workflow configuration
- Documentation completeness

---

## Workarounds for Validation

### Option 1: Fix Proxy Build (Recommended)
Update `tsconfig.json` in proxy package to add `.js` extensions:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "allowImportingTsExtensions": false
  }
}
```

Or update imports in source files to include `.js` extensions.

### Option 2: Mock Proxy for Example Testing
Create a minimal mock proxy that:
- Serves the committed cassette
- Demonstrates replay behavior
- Validates the example pattern

### Option 3: Document Known Issue
- Note that proxy needs fixing in main project
- Validate example structure and docs only
- Defer full integration testing until proxy is fixed

---

## Validation Status Update

### Phase 1: Structure Validation ✅
- [x] Example files correct
- [x] Cassettes valid
- [x] Documentation complete
- [x] Setup scripts work

### Phase 2: Proxy Integration ⚠️
- [ ] Proxy has module resolution issue
- [ ] Cannot start from monorepo
- [ ] Blocking full workflow testing

### Phase 3: CI Testing ⏳
- Can still test (CI uses published package)
- Or wait for proxy fix

---

## Recommendation

**For Strict CI Starter validation:**

Since the example is designed to demonstrate enforcement with a published/installed TraceForge package, we can:

1. **Document the example as-is** - Structure is correct
2. **Note proxy issue** - Separate from example validation
3. **Proceed with CI testing** - Use GitHub Actions with published package (or fix proxy first)
4. **User testing phase** - Users will `npm install -g @traceforge/proxy` (published version)

The example itself is correct; the monorepo proxy just needs the ES module fix.

---

## Next Actions

### Immediate
1. Document this issue in main project issues
2. Either:
   - Fix proxy ES module imports, OR
   - Continue validation with conceptual understanding

### For Example Validation
1. Confirm example structure is production-ready ✅
2. Test CI workflow with published package (or after fix)
3. Proceed to user engagement phase

---

**Decision Point:** Should we fix the proxy now, or continue with structural validation?
