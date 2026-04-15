data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "apprunner_ecr_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_ecr_repository" "consultation" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_iam_role" "apprunner_ecr_access" {
  name               = "${var.project_name}-apprunner-ecr-access"
  assume_role_policy = data.aws_iam_policy_document.apprunner_ecr_assume.json
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_apprunner_auto_scaling_configuration_version" "consultation" {
  auto_scaling_configuration_name = "${var.project_name}-asg"

  max_concurrency = var.auto_scaling_max_concurrency
  min_size        = var.auto_scaling_min_size
  max_size        = var.auto_scaling_max_size
}

locals {
  image_identifier = "${aws_ecr_repository.consultation.repository_url}:${var.image_tag}"
}

resource "aws_apprunner_service" "consultation" {
  service_name = var.app_runner_service_name

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.consultation.arn

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    auto_deployments_enabled = false

    image_repository {
      image_identifier      = local.image_identifier
      image_repository_type = "ECR"

      image_configuration {
        port = "8000"
        runtime_environment_variables = {
          CLERK_JWKS_URL        = var.clerk_jwks_url
          OPENROUTER_API_KEY    = var.openrouter_api_key
          OPENROUTER_BASE_URL   = var.openrouter_base_url
        }
      }
    }
  }

  instance_configuration {
    cpu    = var.app_runner_cpu
    memory = var.app_runner_memory
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = var.health_check_path
    interval            = 20
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }

  depends_on = [
    aws_iam_role_policy_attachment.apprunner_ecr_access,
  ]
}
