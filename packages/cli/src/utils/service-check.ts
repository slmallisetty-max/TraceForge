// Service health check utilities

export async function checkServiceAvailability(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function checkProxyAvailable(): Promise<boolean> {
  const proxyUrl = process.env.TRACEFORGE_PROXY_URL || 'http://localhost:8787';
  return checkServiceAvailability(`${proxyUrl}/health`);
}

export async function checkWebApiAvailable(): Promise<boolean> {
  const apiUrl = process.env.TRACEFORGE_API_URL || 'http://localhost:3001';
  return checkServiceAvailability(`${apiUrl}/health`);
}

export function getServiceHelp(): string {
  return `
⚠️  TraceForge services are not running.

To start all services:
  
  1. Quick Start (Recommended):
     ${'\x1b[36m'}pnpm dev${'\x1b[0m'}
     
  2. PowerShell Script:
     ${'\x1b[36m'}.\\dev.ps1${'\x1b[0m'}
     
  3. Docker:
     ${'\x1b[36m'}docker-compose up${'\x1b[0m'}
     
  4. Manual (separate terminals):
     Terminal 1: ${'\x1b[36m'}pnpm --filter @traceforge/proxy dev${'\x1b[0m'}
     Terminal 2: ${'\x1b[36m'}pnpm --filter @traceforge/web dev${'\x1b[0m'}

Services needed:
  🔵 Proxy: http://localhost:8787 (captures LLM traffic)
  🟣 Web:   http://localhost:3001 (API + UI)
`;
}

export async function ensureServicesRunning(requireProxy = false, requireWeb = false): Promise<void> {
  const checks: Array<{ name: string; check: () => Promise<boolean>; required: boolean }> = [];

  if (requireProxy) {
    checks.push({ name: 'Proxy', check: checkProxyAvailable, required: true });
  }
  
  if (requireWeb) {
    checks.push({ name: 'Web API', check: checkWebApiAvailable, required: true });
  }

  const results = await Promise.all(
    checks.map(async (c) => ({
      name: c.name,
      available: await c.check(),
      required: c.required,
    }))
  );

  const failures = results.filter((r) => r.required && !r.available);

  if (failures.length > 0) {
    console.error(`\n❌ Required services not available:\n`);
    failures.forEach((f) => console.error(`   • ${f.name}`));
    console.error(getServiceHelp());
    process.exit(1);
  }

  const warnings = results.filter((r) => !r.required && !r.available);
  if (warnings.length > 0) {
    console.warn(`\n⚠️  Optional services not running:\n`);
    warnings.forEach((w) => console.warn(`   • ${w.name}`));
    console.warn();
  }
}
