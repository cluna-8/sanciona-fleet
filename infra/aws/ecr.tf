# ECR: un repositorio por servicio. Scan on push para detectar CVEs.
resource "aws_ecr_repository" "bff_web" {
  name                 = "${var.project_name}/bff-web"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = merge(local.common_tags, { Name = "${var.project_name}-bff-web" })
}

resource "aws_ecr_repository" "deadlines_service" {
  name                 = "${var.project_name}/deadlines-service"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = merge(local.common_tags, { Name = "${var.project_name}-deadlines-service" })
}