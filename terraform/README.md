# AWS infrastructure (ECR + App Runner)

Terraform provisions:

- Private ECR repository `consultation-app` (name configurable)
- IAM role for App Runner to pull from ECR
- App Runner auto scaling (default min 1, max 1)
- App Runner service on port **8000**, HTTP health check **`/health`**, **manual** deployments (push updates via CI or `start-deployment`)

Runtime environment variables match the FastAPI app: `CLERK_JWKS_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1` in Terraform).

## Prerequisites

- [Terraform](https://www.terraform.io/) >= 1.5
- [AWS CLI](https://aws.amazon.com/cli/) configured (`aws configure` or environment variables)
- AWS permissions to create ECR, IAM, and App Runner resources

## First-time bootstrap (why two steps)

App Runner needs a real image in ECR before the service can run. Use one of these approaches.

### Option A: GitHub Actions (recommended)

1. Add **repository secrets** and **variables** (see [GitHub configuration](#github-configuration)).
2. Run workflow **“AWS Terraform bootstrap”** (`aws-terraform-bootstrap.yml`) manually from the Actions tab.
3. **State file**: the workflow uploads `terraform-state` as an artifact. Download it from the run summary and save it as `terraform/terraform.tfstate` on your machine if you want to run `terraform plan` / `terraform apply` locally later. Treat it as sensitive. For teams, configure an [S3 backend](https://developer.hashicorp.com/terraform/language/settings/backends/s3) instead of relying on artifacts.
4. After bootstrap succeeds, use **“AWS Docker deploy”** on every push to `main` (or run it manually) to rebuild the image and call `start-deployment`.

### Option B: Local Terraform + Docker

1. Copy `terraform.tfvars.example` to `terraform.tfvars` (gitignored) and set `aws_region`, `clerk_jwks_url`, and `openrouter_api_key`.

2. **Phase 1** — ECR and auto scaling only (IAM + App Runner run in phase 2):

```bash
cd terraform
terraform init
terraform apply -auto-approve \
  -target=aws_ecr_repository.consultation \
  -target=aws_apprunner_auto_scaling_configuration_version.consultation
```

If the App Runner ECR pull role already exists in IAM (`EntityAlreadyExists`), set `create_apprunner_ecr_access_role = false` in `terraform.tfvars` (or `TF_VAR_create_apprunner_ecr_access_role=false`). Terraform will look up that role by name instead of creating it. The role must trust `build.apprunner.amazonaws.com` and typically attach `AWSAppRunnerServicePolicyForECRAccess`.

3. **Build and push** the `linux/amd64` image to `consultation-app:latest` (same commands as in your course / `aws-docker-deploy.yml`).

4. **Phase 2** — create the App Runner service:

```bash
terraform apply -auto-approve
```

5. Note `terraform output apprunner_service_url` and test the app.

## Routine updates (after bootstrap)

Rebuild and push a new image, then start a deployment:

- **CI**: push to `main` runs `.github/workflows/aws-docker-deploy.yml` (build → ECR → `aws apprunner start-deployment`).
- **CLI**: `aws apprunner start-deployment --service-arn "$(terraform output -raw apprunner_service_arn)"`

Optional: set `auto_deployments_enabled = true` on the App Runner source in `main.tf` if you want deploys on every ECR push without `start-deployment`.

## GitHub configuration

### Repository variables (Settings → Secrets and variables → Actions → Variables)

| Variable                 | Example        | Purpose                          |
| ------------------------ | -------------- | -------------------------------- |
| `AWS_REGION`             | `us-east-1`    | Region for AWS CLI and resources |
| `APP_RUNNER_SERVICE_NAME` | `consultation-app-service` | Optional; defaults to this if unset |
| `CREATE_APPRUNNER_ECR_ACCESS_ROLE` | `false` | Optional. Set to `false` if the IAM role `consultation-app-apprunner-ecr-access` already exists; Terraform will not create it (bootstrap + local apply). |

### Repository secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret                            | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `AWS_ACCESS_KEY_ID`               | IAM user or role access key (see OIDC below) |
| `AWS_SECRET_ACCESS_KEY`           | IAM secret key                               |
| `CLERK_JWKS_URL`                  | Clerk JWKS URL for the API                   |
| `OPENROUTER_API_KEY`              | OpenRouter API key                           |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (Docker build-arg)   |

Optional: override `OPENROUTER_BASE_URL` by adding it to `terraform.tfvars` locally or by extending the workflows with `TF_VAR_openrouter_base_url` (defaults are set in `variables.tf`).

### OIDC instead of long-lived access keys (optional)

Long-lived keys are simple for learning; production repos often use **OpenID Connect** from GitHub to AWS.

1. Create an IAM OIDC identity provider for `token.actions.githubusercontent.com` (once per account).
2. Create an IAM role with a trust policy for your `org/repo` and `ref:refs/heads/main`.
3. Attach policies allowing ECR push/pull and App Runner `StartDeployment`, plus Terraform resources as needed.
4. In workflows, grant `permissions: id-token: write` and replace `aws-actions/configure-aws-credentials` inputs with `role-to-assume: <role-arn>` and remove static access keys.

See [GitHub’s AWS documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services).

## State files

By default Terraform stores state locally (`terraform.tfstate`). Do not commit state. For teams, configure a remote backend (S3 + DynamoDB locking) in `versions.tf`.

## Lock file

After `terraform init`, commit **`.terraform.lock.hcl`** so CI uses the same provider versions. Regenerate when upgrading the AWS provider:

```bash
terraform providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=windows_amd64
```

## Workflows summary

| Workflow                    | Trigger              | Behavior                                                |
| --------------------------- | -------------------- | ------------------------------------------------------- |
| `terraform-ci.yml`          | PRs touching `terraform/**` | `terraform fmt -check`, `init`, `validate`        |
| `aws-terraform-bootstrap.yml` | Manual               | Two-phase apply + Docker push (first-time setup)      |
| `aws-docker-deploy.yml`     | Push to `main`, manual | Build/push image, `start-deployment`                 |
