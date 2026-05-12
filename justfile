set shell := ["bash", "-c"]

import 'just/_vars.just'
import 'just/dev.just'
import 'just/test.just'
import 'just/e2e.just'
import 'just/db.just'
import 'just/audit.just'
import 'just/data.just'
import 'just/images.just'
import 'just/inci.just'
import 'just/quality.just'
import 'just/ops.just'

# Show available commands
help:
    @just --list
