#!/bin/bash

export AWS_PROFILE=
export AWS_DEFAULT_REGION=
bucket=my-code-bucket-dev

echo "Package..."
sam package --output-template-file packaged.yaml --s3-bucket $bucket --s3-prefix wafv2-cloudfront-ip-set-updater-function

echo ""
echo "Deploy..."
sam deploy --template-file packaged.yaml --capabilities CAPABILITY_IAM --stack-name wafv2-cloudfront-ip-set-updater-dev
