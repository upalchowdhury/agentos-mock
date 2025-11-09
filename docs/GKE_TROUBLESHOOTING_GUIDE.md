# GKE Deployment Troubleshooting Guide

## Table of Contents
1. [Initial Setup Issues](#1-initial-setup-issues)  
   1.1 [GKE Cluster Setup](#11-gke-cluster-setup)  
   1.2 [Service Account and IAM](#12-service-account-and-iam)  
2. [Ingress and Networking](#2-ingress-and-networking)  
   2.1 [Ingress IP Not Assigned](#21-ingress-ip-not-assigned)  
   2.2 [DNS and SSL Setup](#22-dns-and-ssl-setup)  
3. [Database (Bitnami PostgreSQL) Setup](#3-database-bitnami-postgresql-setup)  
   3.1 [Installation](#31-installation)  
   3.2 [Connection Issues](#32-connection-issues)  
4. [API and Application Issues](#4-api-and-application-issues)  
   4.1 [Database Schema Mismatch](#41-database-schema-mismatch)  
   4.2 [Data Seeding](#42-data-seeding)  
5. [Troubleshooting Commands](#5-troubleshooting-commands)  
   5.1 [Pod and Logs](#51-pod-and-logs)  
   5.2 [Database Inspection](#52-database-inspection)  
   5.3 [Network and Ingress](#53-network-and-ingress)  
6. [Final Working Configuration](#6-final-working-configuration)  
7. [Lessons Learned](#7-lessons-learned)  
8. [Common Pitfalls](#8-common-pitfalls)  
9. [Useful Resources](#9-useful-resources)

## 1. Initial Setup Issues

### 1.1 GKE Cluster Setup
**Issue**: Cluster creation and configuration
**Solution**:
```bash
gcloud container clusters create autopilot-cluster-1 \
  --region=us-central1 \
  --project=abstract-hydra-477523-q7
```

### 1.2 Service Account and IAM
**Issue**: Missing permissions for GitHub Actions
**Solution**:
```bash
gcloud iam service-accounts create github-actions-deployer
gcloud projects add-iam-policy-binding abstract-hydra-477523-q7 \
  --member="serviceAccount:github-actions-deployer@abstract-hydra-477523-q7.iam.gserviceaccount.com" \
  --role="roles/container.developer"
```

## 2. Ingress and Networking

### 2.1 Ingress IP Not Assigned
**Symptoms**:
- `kubectl get ingress` shows no IP address
- Ingress remains in "pending" state

**Solutions**:
```bash
# Check ingress events
kubectl describe ingress agentos-ingress -n agentos

# Common fixes:
# 1. Ensure you have enough IP quota
gcloud compute addresses list

# 2. Check for annotation issues
kubectl get ingress agentos-ingress -n agentos -o yaml | grep -A 5 annotations

# 3. Verify cloud provider integration
kubectl get nodes -o wide
```

### 2.2 DNS and SSL Setup
**Domain**: mock.pluralfocus.com
**Steps**:
1. Created DNS A record pointing to Ingress IP
2. Set up Google Managed Certificate
3. Added DNS-01 challenge for SSL

## 3. Database (Bitnami PostgreSQL) Setup

### 3.1 Installation
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install agentos-mock-postgresql bitnami/postgresql \
  --namespace agentos \
  --set auth.username=agentos \
  --set auth.password=agentos \
  --set auth.database=agentos_mock
```

### 3.2 Connection Issues
**Symptoms**:
- API pods crash with connection errors
- `psql` connection timeouts

**Verification**:
```bash
# Get database pod name
export PG_POD=$(kubectl get pods -n agentos -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}')

# Test connection from API pod
kubectl exec -n agentos deploy/api-mock -- nc -zv agentos-mock-postgresql 5432

# Check database logs
kubectl logs -n agentos $PG_POD
```

## 4. API and Application Issues

### 4.1 Database Schema Mismatch
**Symptoms**:
- API returns 500 errors
- Logs show "relation does not exist"

**Fix**:
```bash
# Get API pod
export API_POD=$(kubectl get pods -n agentos -l app=api-mock -o jsonpath='{.items[0].metadata.name}')

# Copy db models
kubectl cp ./db $API_POD:/app/db -n agentos

# Recreate tables
kubectl exec -n agentos $API_POD -- python -c "
from db.models import Base
from sqlalchemy import create_engine
import os
engine = create_engine(os.getenv('DATABASE_URL'))
Base.metadata.create_all(engine)
print('Tables created')"
```

### 4.2 Data Seeding
**Issue**: Mock endpoint not seeding data
**Solution**:
- Located seed script at `/app/db/seeds/generate_seeds.py`
- Manually triggered seed execution
- Verified data insertion with direct SQL queries

## 5. Troubleshooting Commands

### 5.1 Pod and Logs
**Symptoms**:
- HTTPS connections fail
- Certificate not issued

**Troubleshooting**:
```bash
# Check certificate status
kubectl get managedcertificate -n agentos
kubectl describe managedcertificate agentos-cert -n agentos

# Check ingress events
kubectl describe ingress agentos-ingress -n agentos

# Check DNS resolution
nslookup mock.pluralfocus.com
```

### 5.2 Database Inspection
**Diagnosis**:
```bash
# Get failing pods
kubectl get pods -n agentos --field-selector=status.phase!=Running

# Check logs
kubectl logs -n agentos <pod-name> --previous

# Describe pod events
kubectl describe pod -n agentos <pod-name>
```

### 5.3 Network and Ingress

## 6. Final Working Configuration

### 6.1 Values.yaml Highlights
```yaml
postgresql:
  enabled: true
  auth:
    username: agentos
    password: agentos
    database: agentos_mock

ingress:
  enabled: true
  className: "gce"
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "agentos-mock-ip"
    networking.gke.io/v1beta1.FrontendConfig: "agentos-frontend-config"
  hosts:
    - host: mock.pluralfocus.com
      paths:
        - path: /*
          pathType: ImplementationSpecific
  tls:
    - secretName: agentos-tls
      hosts:
        - mock.pluralfocus.com
```

## 7. Lessons Learned

1. **Database Initialization**:
   - Always verify schema matches application expectations
   - Use migrations for production deployments

2. **GKE Best Practices**:
   - Use BackendConfig for health checks
   - Configure proper readiness/liveness probes
   - Set resource requests/limits

3. **Troubleshooting Flow**:
   - Check pod logs first
   - Verify database connectivity
   - Inspect ingress and services
   - Check for resource constraints

## 8. Common Pitfalls

1. **Missing IAM Permissions**:
   - Ensure service accounts have correct roles
   - Check audit logs for permission issues

2. **Network Configuration**:
   - Verify VPC-native clusters
   - Check firewall rules for GKE nodes

3. **Certificate Issues**:
   - Verify DNS propagation
   - Check certificate status with `kubectl describe managedcertificate`

## 9. Useful Resources

- [GKE Ingress Troubleshooting](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/ingress)
- [Cloud SQL Proxy Sidecar](https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine)
- [GKE Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Kubernetes Ingress Controller](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/)
- [PostgreSQL Kubernetes Operator](https://postgres-operator.readthedocs.io/)

```bash
# Get pod logs
kubectl logs -n agentos deploy/api-mock -f

# Connect to database
kubectl exec -n agentos -it $PG_POD -- psql -U agentos -d agentos_mock

# Check ingress
kubectl get ingress -n agentos
kubectl describe ingress agentos-ingress -n agentos

# Check services
kubectl get svc -n agentos

# Get pod status
kubectl get pods -n agentos -o wide

# Check events
kubectl get events -n agentos --sort-by='.metadata.creationTimestamp'

# Port forward for local access
kubectl port-forward -n agentos svc/agentos-mock 8080:80
```

## Resolving Common Errors

### "Error: context deadline exceeded"
- Check cluster node status
- Verify network connectivity
- Check for resource constraints

### "ImagePullBackOff"
- Verify image exists in container registry
- Check image pull secrets
- Verify network connectivity to container registry

### "CrashLoopBackOff"
- Check container logs
- Verify environment variables
- Check resource limits

## Getting Help
1. Check logs: `kubectl logs -n agentos <pod-name>`
2. Describe resource: `kubectl describe -n agentos <resource>/<name>`
3. Check events: `kubectl get events -n agentos --sort-by='.metadata.creationTimestamp'`
4. Check GKE logs in Cloud Console
