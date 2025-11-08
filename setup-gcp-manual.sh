#!/bin/bash
# Manual commands to run in Google Cloud Shell if the automated script fails

cat << 'EOF'

Run these commands ONE BY ONE in Google Cloud Shell:

# 1. Set your project
gcloud config set project abstract-hydra-477523-q7

# 2. Enable required APIs
gcloud services enable artifactregistry.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable iam.googleapis.com

# 3. Create service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for GitHub Actions"

# 4. Wait a few seconds for propagation
sleep 10

# 5. Grant Artifact Registry Writer
gcloud projects add-iam-policy-binding abstract-hydra-477523-q7 \
  --member="serviceAccount:github-actions-deployer@abstract-hydra-477523-q7.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# 6. Grant Container Developer
gcloud projects add-iam-policy-binding abstract-hydra-477523-q7 \
  --member="serviceAccount:github-actions-deployer@abstract-hydra-477523-q7.iam.gserviceaccount.com" \
  --role="roles/container.developer"

# 7. Grant Storage Admin
gcloud projects add-iam-policy-binding abstract-hydra-477523-q7 \
  --member="serviceAccount:github-actions-deployer@abstract-hydra-477523-q7.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# 8. Grant Service Account User
gcloud projects add-iam-policy-binding abstract-hydra-477523-q7 \
  --member="serviceAccount:github-actions-deployer@abstract-hydra-477523-q7.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# 9. Create JSON key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-deployer@abstract-hydra-477523-q7.iam.gserviceaccount.com

# 10. Display the key (copy this entire output)
cat github-actions-key.json

# 11. After copying, DELETE the key file
rm github-actions-key.json

EOF
