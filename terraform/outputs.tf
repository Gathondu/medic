output "aws_account_id" {
  description = "Current AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "ecr_repository_url" {
  description = "ECR repository URL (for docker tag/push)"
  value       = aws_ecr_repository.consultation.repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = aws_ecr_repository.consultation.arn
}

output "apprunner_service_arn" {
  description = "App Runner service ARN (for start-deployment)"
  value       = aws_apprunner_service.consultation.arn
}

output "apprunner_service_url" {
  description = "Default HTTPS URL for the App Runner service"
  value       = "https://${aws_apprunner_service.consultation.service_url}"
}

output "apprunner_ecr_access_role_arn" {
  description = "IAM role App Runner uses to pull from ECR"
  value       = local.apprunner_ecr_access_role_arn
}

output "image_uri" {
  description = "Full image URI including tag (matches App Runner source)"
  value       = local.image_identifier
}
