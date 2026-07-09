import '_vars.just'

# ─── Observability — Alloy agent on the VPS, logs/metrics/traces to Grafana Cloud. ───
# No local Loki/Grafana: view everything on grafana.net (no tunnel). Config ships
# in-repo; sync it to the box with `just deploy` (or git pull) first, then bring the
# agent up. Requires GRAFANA_CLOUD_* in .env.prod.

# Bring the Alloy agent up (run on the VPS).
mon-up: env-prod-check
    {{COMPOSE_MON}} up -d

# Stop the agent (keeps the tiny positions/WAL volume).
mon-down:
    {{COMPOSE_MON}} down

# Recreate after a config edit (Alloy needs a restart to reload).
mon-restart:
    {{COMPOSE_MON}} up -d --force-recreate

# Agent container status.
mon-ps:
    {{COMPOSE_MON}} ps --format "table {{{{.Name}}\t{{{{.Status}}"

# Tail the Alloy agent (check it connects to Grafana Cloud, no 401/403).
mon-logs n="200":
    {{COMPOSE_MON}} logs -f --tail {{n}} alloy

# Bring the agent up on the VPS from the laptop (config must already be synced).
mon-deploy:
    ssh -t aurore "bash -lc 'cd ~/aurore && just mon-up'"
