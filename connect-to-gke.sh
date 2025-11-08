#!/bin/bash
# Connect to GKE cluster from local machine

# 1. Authenticate with Google Cloud (if not already)
gcloud auth login

# 2. Set the project
gcloud config set project abstract-hydra-477523-q7

# 3. Get GKE cluster credentials
gcloud container clusters get-credentials autopilot-cluster-1 \
  --region us-central1 \
  --project abstract-hydra-477523-q7

# 4. Verify connection
kubectl cluster-info

# 5. Check the services
kubectl get svc -n agentos



gcloud container clusters get-credentials autopilot-cluster-1 \
  --region us-central1 \
  --project abstract-hydra-477523-q7

echo ""
echo "✅ Connected to GKE cluster!"
echo ""
echo "Now you can run:"
echo "  kubectl get pods -n agentos"
echo "  kubectl get svc -n agentos"
echo "  kubectl get svc web-ui -n agentos"
