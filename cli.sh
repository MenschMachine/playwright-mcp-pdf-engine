#!/usr/bin/env bash

npm run build > /dev/null
node lib/cli/shell.js
