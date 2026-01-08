# TraceForge Deployment Guide

This directory contains deployment configurations for TraceForge in production environments.

## Deployment Options

- **Kubernetes** - Recommended for production at scale
- **Docker Compose** - Good for development and small deployments
- **Systemd** - Direct deployment on VMs

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Persistent storage provisioner
- Load balancer support (or Ingress controller)

### Quick Start

```bash
# 1. Create namespace and resources
kubectl apply -f kubernetes/proxy-deployment.yaml

# 2. Update secrets with your API keys
kubectl edit secret traceforge-secrets -n traceforge

# 3. Verify deployment
kubectl get pods -n traceforge
kubectl get svc -n traceforge

# 4. Test health endpoint
PROXY_IP=$(kubectl get svc traceforge-proxy -n traceforge -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$PROXY_IP/health
```

### Configuration

Update ConfigMap for environment-specific settings:
```bash
kubectl edit configmap traceforge-config -n traceforge
```

Key configuration options:
- `TRACEFORGE_STORAGE_BACKEND`: `file` or `sqlite`
- `TRACEFORGE_VCR_MODE`: `auto`, `record`, `replay`, or `strict`
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error`

### Scaling

The deployment includes HorizontalPodAutoscaler (HPA):
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

Manual scaling:
```bash
kubectl scale deployment traceforge-proxy -n traceforge --replicas=5
```

### Monitoring

Prometheus metrics are exposed at `/metrics` on port 9090.

To scrape metrics with Prometheus:
```yaml
- job_name: 'traceforge'
  kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
          - traceforge
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
```

### Backup

Persistent data is stored in PVC `traceforge-data`. Back up regularly:

```bash
# Create backup
kubectl exec -n traceforge deployment/traceforge-proxy -- tar czf /tmp/backup.tar.gz /data
kubectl cp traceforge/$(kubectl get pod -n traceforge -l app=traceforge-proxy -o jsonpath='{.items[0].metadata.name}'):/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz

# Restore backup
kubectl cp ./backup.tar.gz traceforge/POD_NAME:/tmp/
kubectl exec -n traceforge POD_NAME -- tar xzf /tmp/backup.tar.gz -C /
```

### Troubleshooting

Check logs:
```bash
kubectl logs -n traceforge -l app=traceforge-proxy --tail=100 -f
```

Check events:
```bash
kubectl get events -n traceforge --sort-by='.lastTimestamp'
```

Shell into pod:
```bash
kubectl exec -it -n traceforge deployment/traceforge-proxy -- /bin/sh
```

## Docker Compose Deployment

For development or single-server deployments:

```bash
cd /path/to/traceforge
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f proxy
```

## Production Checklist

Before deploying to production:

- [ ] Set real API keys in secrets (not defaults)
- [ ] Configure persistent storage with backups
- [ ] Set up monitoring and alerting
- [ ] Configure appropriate resource limits
- [ ] Enable TLS/HTTPS (use Ingress or LoadBalancer with SSL)
- [ ] Set up log aggregation (ELK, Loki, etc.)
- [ ] Test disaster recovery procedures
- [ ] Document runbooks for common issues
- [ ] Set up CI/CD pipeline for deployments
- [ ] Configure network policies for security

## Security Considerations

1. **Secrets Management**: Use external secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **Network Policies**: Restrict pod-to-pod communication
3. **RBAC**: Implement least-privilege access
4. **Container Security**: Scan images for vulnerabilities
5. **TLS**: Always use HTTPS in production
6. **Rate Limiting**: Configure appropriately for your load
7. **Authentication**: Add authentication layer if exposing publicly

## Performance Tuning

### Resource Requests/Limits

Adjust based on your workload:
```yaml
resources:
  requests:
    memory: "512Mi"  # Minimum guaranteed
    cpu: "500m"
  limits:
    memory: "2Gi"    # Maximum allowed
    cpu: "2000m"
```

### Database Optimization

For SQLite backend:
- Enable WAL mode (default in code)
- Increase cache size for high load
- Consider PostgreSQL for very high throughput

### Horizontal Scaling

Adjust HPA targets:
```bash
kubectl patch hpa traceforge-proxy -n traceforge --patch '
spec:
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
'
```

## Cost Optimization

1. **Right-size resources**: Monitor actual usage and adjust
2. **Use spot instances**: For non-critical workloads
3. **Enable cluster autoscaling**: Scale nodes with demand
4. **Storage tiering**: Move old traces to cheaper storage
5. **Cache embeddings**: Reduce OpenAI API costs

## Support

For issues and questions:
- Check runbooks: `docs/runbooks/`
- Review logs for error messages
- Consult architecture docs: `docs/architecture-review.md`
- Open GitHub issue with logs and configuration

---

**Last Updated:** 2026-01-08  
**Maintainer:** SRE Team
