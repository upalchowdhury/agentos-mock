# AgentOS Mock - GKE Deployment Guide

## Prerequisites

1. Google Cloud Platform account with billing enabled
2. `gcloud` CLI installed and authenticated
3. `kubectl` installed
4. `helm` installed (version 3.x)
5. Docker installed locally

## Step 1: Configure GCP Project

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Step 2: Build and Push Docker Images

```bash
# Update Makefile with your PROJECT_ID
sed -i '' "s/YOUR_GCP_PROJECT_ID/$PROJECT_ID/g" Makefile

# Build and push all images
make build-push PROJECT_ID=$PROJECT_ID
```

This will build and push 7 Docker images to `gcr.io/$PROJECT_ID/`:
- agentos-runtime-mock
- agentos-registry-mock
- agentos-ingest-mock
- agentos-api-mock
- agentos-bridge-mock
- agentos-policy-mock
- agentos-web-ui

## Step 3: Connect to Your Existing GKE Cluster

```bash
# List your clusters
gcloud container clusters list

# Get credentials for your cluster
gcloud container clusters get-credentials YOUR_CLUSTER_NAME --zone YOUR_ZONE
```

## Step 4: Deploy PostgreSQL (In-Cluster)

```bash
# Add Bitnami Helm repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install PostgreSQL
helm install postgresql bitnami/postgresql \
  -n agentos --create-namespace \
  --set auth.username=agentos \
  --set auth.password=agentos \
  --set auth.database=agentos_mock \
  --set primary.persistence.size=10Gi
```

Wait for PostgreSQL to be ready:
```bash
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n agentos --timeout=300s
```

## Step 5: Run Database Migrations

```bash
# Port-forward to PostgreSQL
kubectl port-forward -n agentos svc/postgresql 5432:5432 &

# Run migrations locally
export DATABASE_URL="postgresql://agentos:agentos@localhost:5432/agentos_mock"
cd db
python -m alembic upgrade head

# Generate mock data
cd seeds
python generate_seeds.py
```

## Step 6: Deploy AgentOS Mock

```bash
# Update values.yaml with your project ID
sed -i '' "s/YOUR_PROJECT_ID/$PROJECT_ID/g" helm/agentos-mock/values.yaml

# Deploy using Helm
helm upgrade --install agentos-mock ./helm/agentos-mock \
  -n agentos --create-namespace \
  --set image.registry=gcr.io/$PROJECT_ID \
  --set image.tag=latest \
  --set web.host=mock.pluralfocus.com
```

## Step 7: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n agentos

# Check services
kubectl get svc -n agentos

# Check ingress (if configured)
kubectl get ingress -n agentos
```

Expected output:
```
NAME                    READY   STATUS    RESTARTS   AGE
api-mock-xxx            1/1     Running   0          2m
runtime-mock-xxx        1/1     Running   0          2m
registry-mock-xxx       1/1     Running   0          2m
ingest-mock-xxx         1/1     Running   0          2m
bridge-mock-xxx         1/1     Running   0          2m
policy-mock-xxx         1/1     Running   0          2m
web-ui-xxx              1/1     Running   0          2m
postgresql-0            1/1     Running   0          5m
```

## Step 8: Access the Application

### Option A: LoadBalancer (Simple)

```bash
# Get the external IP
kubectl get svc web-ui -n agentos

# Access at http://EXTERNAL_IP:5173
```

### Option B: Ingress with TLS (Production)

1. Install cert-manager for TLS:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

2. Create ClusterIssuer for Let's Encrypt:
```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@pluralfocus.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: gce
EOF
```

3. Point your domain to the Ingress IP:
```bash
kubectl get ingress -n agentos agentos-ingress
```

4. Update DNS:
- Add an A record for `mock.pluralfocus.com` pointing to the Ingress IP

5. Access at https://mock.pluralfocus.com

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod POD_NAME -n agentos
kubectl logs POD_NAME -n agentos
```

### Database connection issues
```bash
# Check PostgreSQL is running
kubectl get pods -n agentos -l app.kubernetes.io/name=postgresql

# Check connection from a service pod
kubectl exec -it RUNTIME_POD -n agentos -- env | grep DATABASE_URL
```

### Reset deployment
```bash
helm uninstall agentos-mock -n agentos
helm uninstall postgresql -n agentos
kubectl delete namespace agentos
```

## Updating the Deployment

```bash
# Rebuild and push new images
make build-push PROJECT_ID=$PROJECT_ID TAG=v1.1.0

# Upgrade Helm release
helm upgrade agentos-mock ./helm/agentos-mock \
  -n agentos \
  --set image.tag=v1.1.0
```

## Cost Optimization

- Use preemptible nodes for non-production:
  ```bash
  --set nodeSelector."cloud\\.google\\.com/gke-preemptible"="true"
  ```

- Scale down replicas for development:
  ```bash
  --set web.replicaCount=1 \
  --set services.api.replicaCount=1 \
  --set services.runtime.replicaCount=1
  ```

## Next Steps

1. Configure TLS/SSL certificates
2. Set up monitoring with Cloud Monitoring
3. Configure autoscaling
4. Set up CI/CD pipeline with Cloud Build
5. Review the [DEMO_GUIDE.md](./DEMO_GUIDE.md) for a guided tour
