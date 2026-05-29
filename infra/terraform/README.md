# Terraform — Google Cloud (optional)

This is a **future-extension skeleton**. The MVP runs entirely locally via Docker Compose.

```bash
cd infra/terraform
terraform init
terraform plan -var project_id=YOUR_PROJECT
# terraform apply   # review IAM + costs first
```

Provisions: Artifact Registry, Cloud Run (web/api), Compute Engine (agent-runner),
Cloud SQL Postgres, Secret Manager secrets, Pub/Sub topics, BigQuery dataset, service
accounts with least-privilege IAM, and a monitoring alert. Secrets are stored in Secret
Manager — never in plaintext. Do **not** enable live trading on cloud without the
`docs/safety.md` checklist.
