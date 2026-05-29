# TradePilot Arena — Google Cloud deployment skeleton (OPTIONAL).
# Local Docker Compose is the MVP. This is a future-extension scaffold; review IAM before use.

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# --- Artifact Registry (container images) ----------------------------------
resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = "tradepilot"
  format        = "DOCKER"
}

# --- Service accounts (least privilege) ------------------------------------
resource "google_service_account" "api" {
  account_id   = "tradepilot-api"
  display_name = "TradePilot API (Cloud Run)"
}

resource "google_service_account" "runner" {
  account_id   = "tradepilot-runner"
  display_name = "TradePilot Agent Runner (Compute Engine)"
}

# --- Secret Manager: provider API keys (NOT stored in plaintext anywhere) ---
resource "google_secret_manager_secret" "provider_keys" {
  for_each  = toset(["openai", "anthropic", "gemini", "deepseek", "app_secret_key"])
  secret_id = "tradepilot-${each.key}"
  replication { auto {} }
}

resource "google_secret_manager_secret_iam_member" "api_access" {
  for_each  = google_secret_manager_secret.provider_keys
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

# --- Cloud SQL (Postgres) ---------------------------------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "tradepilot-pg"
  database_version = "POSTGRES_16"
  region           = var.region
  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    backup_configuration { enabled = true }
  }
  deletion_protection = true
}

# --- Cloud Run: web + api ---------------------------------------------------
resource "google_cloud_run_v2_service" "api" {
  name     = "tradepilot-api"
  location = var.region
  template {
    service_account = google_service_account.api.email
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/tradepilot/api:latest"
      ports { container_port = 8000 }
    }
  }
}

resource "google_cloud_run_v2_service" "web" {
  name     = "tradepilot-web"
  location = var.region
  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/tradepilot/web:latest"
      ports { container_port = 3000 }
    }
  }
}

# --- Compute Engine: always-on agent runner --------------------------------
resource "google_compute_instance" "runner" {
  name         = "tradepilot-runner"
  machine_type = "e2-small"
  zone         = var.zone
  boot_disk { initialize_params { image = "cos-cloud/cos-stable" } }
  network_interface {
    network = "default"
    access_config {}
  }
  service_account {
    email  = google_service_account.runner.email
    scopes = ["cloud-platform"]
  }
}

# --- Pub/Sub: event bus -----------------------------------------------------
resource "google_pubsub_topic" "events" {
  for_each = toset(["decisions", "fills", "risk_events", "equity"])
  name     = "tradepilot-${each.key}"
}

# --- BigQuery: analytics / audit logs --------------------------------------
resource "google_bigquery_dataset" "analytics" {
  dataset_id = "tradepilot_analytics"
  location   = var.region
}

# --- Monitoring alert: monthly AI budget -----------------------------------
resource "google_monitoring_alert_policy" "budget" {
  display_name = "TradePilot AI budget"
  combiner     = "OR"
  conditions {
    display_name = "High request rate"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 100000
      duration        = "300s"
      aggregations { alignment_period = "60s"; per_series_aligner = "ALIGN_RATE" }
    }
  }
}
