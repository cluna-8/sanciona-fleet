# Security groups. Caddy termina TLS (80/443 abiertos a Internet). SSH
# restringido a var.ssh_cidr_blocks. SSM Session Manager no necesita inbound.

resource "aws_security_group" "web" {
  name        = "${var.project_name}-${var.environment}-web"
  description = "HTTP/HTTPS para Caddy (terminación TLS)"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(local.common_tags, { Name = "${var.project_name}-${var.environment}-web-sg" })
}

resource "aws_security_group" "ssh" {
  name        = "${var.project_name}-${var.environment}-ssh"
  description = "SSH restringido (uso de mantenimiento; preferir SSM Session Manager)"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_cidr_blocks
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(local.common_tags, { Name = "${var.project_name}-${var.environment}-ssh-sg" })
}