variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "db_name" {
  description = "MySQL database name"
  type        = string
  default     = "cloudjudge"
}

variable "db_user" {
  description = "MySQL master username"
  type        = string
  default     = "codestorm_admin"
}

variable "db_password" {
  description = "MySQL master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "email_user" {
  description = "Gmail address for sending contest emails"
  type        = string
}

variable "email_pass" {
  description = "Gmail app password"
  type        = string
  sensitive   = true
}
