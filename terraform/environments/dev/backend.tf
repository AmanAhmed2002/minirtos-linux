terraform {
  backend "s3" {
    bucket         = "minirtos-terraform-state-058416978707-us-east-1"
    key            = "minirtos/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "minirtos-terraform-locks"
  }
}
