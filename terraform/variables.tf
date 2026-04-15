variable "aws_region" {
  description = "AWS region (must match ECR and App Runner)"
  type        = string
}

variable "project_name" {
  description = "Prefix for resource names and default tags"
  type        = string
  default     = "consultation-app"
}

variable "ecr_repository_name" {
  description = "ECR repository name (course uses consultation-app)"
  type        = string
  default     = "consultation-app"
}

variable "app_runner_service_name" {
  description = "App Runner service name"
  type        = string
  default     = "consultation-app-service"
}

variable "image_tag" {
  description = "Container image tag deployed by App Runner"
  type        = string
  default     = "latest"
}

variable "app_runner_cpu" {
  description = "App Runner instance CPU (256 = 0.25 vCPU)"
  type        = string
  default     = "256"
}

variable "app_runner_memory" {
  description = "App Runner instance memory in MB (512 = 0.5 GB)"
  type        = string
  default     = "512"
}

variable "health_check_path" {
  description = "HTTP health check path"
  type        = string
  default     = "/health"
}

variable "clerk_jwks_url" {
  description = "Clerk JWKS URL for API auth"
  type        = string
  sensitive   = true
}

variable "openrouter_api_key" {
  description = "OpenRouter API key"
  type        = string
  sensitive   = true
}

variable "openrouter_base_url" {
  description = "OpenRouter API base URL"
  type        = string
  default     = "https://openrouter.ai/api/v1"
}

variable "auto_scaling_min_size" {
  description = "Minimum App Runner instances"
  type        = number
  default     = 1
}

variable "auto_scaling_max_size" {
  description = "Maximum App Runner instances"
  type        = number
  default     = 1
}

variable "auto_scaling_max_concurrency" {
  description = "Max concurrent requests per instance"
  type        = number
  default     = 100
}
