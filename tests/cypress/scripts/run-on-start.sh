#!/bin/sh
set -eu

node tests/cypress/scripts/wait-for-services.mjs
cypress run --config-file tests/cypress/cypress.config.ts
