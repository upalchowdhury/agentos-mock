#!/bin/bash
# Instructions to setup GitHub Actions for GKE deployment

cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════╗
║          GitHub Actions + GKE Deployment Setup Instructions          ║
╚══════════════════════════════════════════════════════════════════════╝

STEP 1: Run Service Account Setup in Google Cloud Shell
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open Google Cloud Shell: https://shell.cloud.google.com
2. Clone this repo or upload setup-gcp-sa.sh
3. Make it executable and run:

   chmod +x setup-gcp-sa.sh
   ./setup-gcp-sa.sh

4. The script will create a service account and generate a JSON key file


STEP 2: Copy the Service Account Key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In Cloud Shell, display and copy the key:

   cat github-actions-key.json

Copy the ENTIRE output (including the { } braces)


STEP 3: Add GitHub Secrets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Go to: https://github.com/upalchowdhury/agentos-mock/settings/secrets/actions

Click "New repository secret" and add each of these:

┌─────────────────────┬────────────────────────────────────────────────┐
│ Secret Name         │ Value                                          │
├─────────────────────┼────────────────────────────────────────────────┤
│ GCP_PROJECT_ID      │ abstract-hydra-477523-q7                       │
│ GCP_SA_KEY          │ <paste entire JSON from github-actions-key>    │
│ GKE_CLUSTER_NAME    │ autopilot-cluster-1                            │
│ GKE_ZONE            │ us-central1                                    │
│ ARTIFACT_REGISTRY   │ us-central1-docker.pkg.dev/abstract-hydra-...  │
│                     │   477523-q7/agentos-mock                       │
└─────────────────────┴────────────────────────────────────────────────┘


STEP 4: Delete the Local Key File (IMPORTANT!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In Cloud Shell, remove the key file:

   rm github-actions-key.json


STEP 5: Test the Workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The workflow will trigger on:
  • Every push to main branch
  • Manual trigger from GitHub Actions tab

To manually trigger:
1. Go to: https://github.com/upalchowdhury/agentos-mock/actions
2. Click "Deploy to GKE" workflow
3. Click "Run workflow"


STEP 6: Monitor Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Watch the deployment in GitHub Actions:
https://github.com/upalchowdhury/agentos-mock/actions

After successful deployment, check pods:

   gcloud container clusters get-credentials autopilot-cluster-1 \
     --region us-central1 \
     --project abstract-hydra-477523-q7
   
   kubectl get pods -n agentos
   kubectl get svc -n agentos


STEP 7: Access the Application
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Get the external IP:

   kubectl get svc web-ui -n agentos

Or port-forward locally:

   kubectl port-forward -n agentos svc/web-ui 8080:80

Then access: http://localhost:8080


═══════════════════════════════════════════════════════════════════════

📋 What the Workflow Does:
  1. Builds all 7 service Docker images
  2. Pushes to Artifact Registry
  3. Deploys to GKE using Helm
  4. Creates namespace 'agentos'
  5. Sets up PostgreSQL database
  6. Configures services and ingress

🔧 Services Deployed:
  • web-ui (React frontend)
  • api-mock (Observability API)
  • policy-mock (Policy engine)
  • ingest-mock (Telemetry ingest)
  • bridge-mock (OTel bridge)
  • registry-mock (Agent registry)
  • runtime-mock (Runtime service)
  • postgres (Database)

🌐 Endpoints:
  • Web UI: http://<EXTERNAL-IP>/
  • API: http://<EXTERNAL-IP>/api
  • Policy: http://<EXTERNAL-IP>/policy

═══════════════════════════════════════════════════════════════════════

EOF
