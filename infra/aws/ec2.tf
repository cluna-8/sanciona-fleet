# EC2 única: t3.small con Docker + Caddy. user_data la deja lista para recibir
# despliegues por SSM Run Command. Las imágenes llegan por ECR desde CI.

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_eip" "main" {
  domain = "vpc"
  tags   = merge(local.common_tags, { Name = "${var.project_name}-${var.environment}-eip" })
}

resource "aws_instance" "main" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  subnet_id            = aws_subnet.public.id
  iam_instance_profile = aws_iam_instance_profile.ec2.name

  vpc_security_group_ids = [
    aws_security_group.web.id,
    aws_security_group.ssh.id,
  ]

  user_data_base64 = base64encode(templatefile("${path.module}/user_data.sh", {
    project_name = var.project_name
    environment  = var.environment
    repo_url     = "https://github.com/${var.github_org}/${var.github_repo}.git"
    domain_name  = var.domain_name
  }))

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  tags = merge(local.common_tags, { Name = "${var.project_name}-${var.environment}-web" })
}

resource "aws_eip_association" "main" {
  instance_id   = aws_instance.main.id
  allocation_id = aws_eip.main.id
}