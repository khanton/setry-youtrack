#!/bin/sh

zip -r sy.zip src package.json config.yml

yc serverless function version create \
                --function-name sentry-youtrack \
                --runtime nodejs12-preview \
                --source-path ./sy.zip \
                --memory 128m \
                --execution-timeout 5s \
                --entrypoint src/index.handler