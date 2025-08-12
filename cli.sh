#!/usr/bin/env bash

npm run build > /dev/null || (echo "build failed" && exit 1)
node lib/cli/shellFactory.js
