#!/bin/bash

# export AWS_PROFILE=
# export AWS_DEFAULT_REGION=

sam local invoke WAFv2CloudFrontIPSetUpdaterFunction --event events/ip-update-sns.json