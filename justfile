set shell := ["bash", "-c"]

# Default (bare `just`): list recipes instead of booting the dev stack
default:
    @just --list

import 'scripts/just/_vars.just'
import 'scripts/just/dev.just'
import 'scripts/just/test.just'
import 'scripts/just/e2e.just'
import 'scripts/just/db.just'
import 'scripts/just/audit.just'
import 'scripts/just/artifacts.just'
import 'scripts/just/data.just'
import 'scripts/just/images.just'
import 'scripts/just/inci.just'
import 'scripts/just/quality.just'
import 'scripts/just/ops.just'

# Show available commands
help:
    @just --list
