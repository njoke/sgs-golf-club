#!/bin/sh
set -eu

node tests/cypress/scripts/wait-for-services.mjs
cypress run --project tests/cypress
