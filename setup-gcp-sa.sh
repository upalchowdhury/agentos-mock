#!/bin/bash
# Setup GCP Service Account for GitHub Actions
# Run this in Google Cloud Shell

set -e

PROJECT_ID="abstract-hydra-477523-q7"
SA_NAME="github-actions-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="github-actions-key.json"

echo "🚀 Setting up Service Account for GitHub Actions"
echo "Project: ${PROJECT_ID}"
echo "Service Account: ${SA_EMAIL}"
echo ""

# Set the project
gcloud config set project ${PROJECT_ID}

# Create the service account
echo "1️⃣ Creating service account..."
if gcloud iam service-accounts describe ${SA_EMAIL} &>/dev/null; then
  echo "   ℹ️  Service account already exists"
else
  gcloud iam service-accounts create ${SA_NAME} \
    --display-name="GitHub Actions Deployer" \
    --description="Service account for GitHub Actions to deploy to GKE and push to Artifact Registry"
  
  echo "   ⏳ Waiting for service account to be fully created..."
  sleep 5
fi

# Verify service account exists
if ! gcloud iam service-accounts describe ${SA_EMAIL} &>/dev/null; then
  echo "❌ ERROR: Service account creation failed"
  exit 1
fi

# Grant Artifact Registry Writer role
echo "2️⃣ Granting Artifact Registry Writer role..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" \
  --condition=None || echo "   ⚠️  Role may already be granted"

# Grant Kubernetes Engine Developer role
echo "3️⃣ Granting Kubernetes Engine Developer role..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.developer" \
  --condition=None || echo "   ⚠️  Role may already be granted"

# Grant Storage Admin role (needed for GKE deployments)
echo "4️⃣ Granting Storage Admin role..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin" \
  --condition=None || echo "   ⚠️  Role may already be granted"

# Grant Service Account User role (needed to act as service accounts)
echo "5️⃣ Granting Service Account User role..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None || echo "   ⚠️  Role may already be granted"

# Create and download the JSON key
echo "6️⃣ Creating JSON key..."
gcloud iam service-accounts keys create ${KEY_FILE} \
  --iam-account=${SA_EMAIL}

echo ""
echo "✅ Service Account setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. The JSON key has been saved to: ${KEY_FILE}"
echo "2. Display the key content:"
echo "   cat ${KEY_FILE}"
echo ""
echo "3. Copy the ENTIRE JSON content (including braces)"
echo ""
echo "4. Add these secrets to your GitHub repository:"
echo "   Go to: https://github.com/upalchowdhury/agentos-mock/settings/secrets/actions"
echo ""
echo "   Add these secrets:"
echo "   - GCP_PROJECT_ID: ${PROJECT_ID}"
echo "   - GCP_SA_KEY: <paste the entire JSON content>"
echo "   - GKE_CLUSTER_NAME: autopilot-cluster-1"
echo "   - GKE_ZONE: us-central1"
echo "   - ARTIFACT_REGISTRY: us-central1-docker.pkg.dev/${PROJECT_ID}/agentos-mock"
echo ""
echo "5. After adding secrets, push the GitHub Actions workflow"
echo ""
echo "⚠️  IMPORTANT: Delete the ${KEY_FILE} file after copying to GitHub:"
echo "   rm ${KEY_FILE}"
echo ""
