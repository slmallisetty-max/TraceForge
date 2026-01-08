# RUNBOOK-001: Proxy Server Crash Recovery

## Symptoms
- Proxy server is not responding on port 8787
- Health check endpoint returns connection refused
- Applications cannot reach OpenAI through proxy

## Diagnosis

### Check if process is running
```bash
ps aux | grep "traceforge.*proxy"
# or
pgrep -f "@traceforge/proxy"
```

### Check logs
```bash
# Development
tail -100 ~/.pm2/logs/traceforge-proxy-error.log

# Production (Docker)
docker logs traceforge-proxy --tail=100

# Production (systemd)
journalctl -u traceforge-proxy -n 100
```

### Common error patterns
- `EADDRINUSE`: Port 8787 already in use
- `ECONNREFUSED`: Cannot connect to upstream OpenAI
- `Out of memory`: Memory exhaustion

## Resolution

### Quick Restart (Development)
```bash
pnpm --filter @traceforge/proxy start
```

### Restart (PM2)
```bash
pm2 restart traceforge-proxy
pm2 logs traceforge-proxy
```

### Restart (Docker)
```bash
docker restart traceforge-proxy
docker logs -f traceforge-proxy
```

### Restart (systemd)
```bash
sudo systemctl restart traceforge-proxy
sudo systemctl status traceforge-proxy
```

### If port conflict
```bash
# Find process using port 8787
lsof -i :8787
# or
netstat -tulpn | grep 8787

# Kill the process
kill -9 <PID>

# Restart proxy
pnpm --filter @traceforge/proxy start
```

### If out of memory
```bash
# Check memory usage
free -h
docker stats traceforge-proxy

# Increase memory limit (Docker)
docker update --memory 2g --memory-swap 2g traceforge-proxy
docker restart traceforge-proxy
```

## Prevention

1. **Enable health checks** in load balancer
2. **Set memory limits** appropriately
3. **Configure auto-restart** (PM2, Docker, systemd)
4. **Monitor memory usage** with Prometheus alerts

## Escalation

If proxy continues to crash:
1. Check for cassette file corruption
2. Review recent code changes
3. Analyze core dumps if available
4. Contact: SRE on-call

**Severity:** P1 (Critical)  
**Expected Resolution Time:** < 15 minutes
