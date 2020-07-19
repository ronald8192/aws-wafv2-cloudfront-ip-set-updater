# WAFv2 CloudFront IP set Updater

## wafv2-cloudfront-ip-set-updater

Work standalone except opt-in regions. (Asia Pacific (Hong Kong), Middle East (Bahrain), EU (Milano), and Africa (Cape Town))

Create below resources:

* WAFv2 ACL (optional)
* 4 x WAFv2 IPSet (CloudFront IPv4, CloudFront IPv6, Manual IPv4, Manual IPv6)
* 2 x WAFv2 RuleGroup (CloudFront, Manual)
* Lambda to update IPset
* Lambda subscribe to SNS `AmazonIpSpaceChanged`

### Deploy

1. Edit `deploy.sh`'s region (`AWS_DEFAULT_REGION`) and code bucket name (`bucket`)
1. Run: `bash deploy.sh`

## lambda-caller

Lambda function to invoke Lambda in `wafv2-cloudfront-ip-set-updater`

Deploy this stack to us-east-1 if your WAFv2 in `Asia Pacific (Hong Kong)`, `Middle East (Bahrain)`, `EU (Milano)` or `Africa (Cape Town)`.
