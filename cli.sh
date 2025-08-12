#!/usr/bin/env bash

npm run build:inc > /dev/null || (echo "build failed" && exit 1)
node lib/cli/shellFactory.js
