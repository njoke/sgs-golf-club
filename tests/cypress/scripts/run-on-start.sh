#!/bin/sh
set -eu

node tests/scripts/wait-for-services.mjs
cypress run --project tests/cypress
