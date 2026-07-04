import '_vars.just'

# ─── Observability (Grafana + Loki + Alloy). Runs ON the VPS alongside prod. ───
# Config ships in-repo; sync it to the box with `just deploy` (or git pull) first,
# then bring the stack up. Grafana is loopback-only — reach it via `just mon-tunnel`.

# Bring the monitoring stack up (run on the VPS).
mon-up: env-prod-check
    {{COMPOSE_MON}} up -d

# Stop the monitoring stack (keeps volumes/data).
mon-down:
    {{COMPOSE_MON}} down

# Recreate after a config edit (Alloy/Loki need a restart to reload).
mon-restart:
    {{COMPOSE_MON}} up -d --force-recreate

# Monitoring container status.
mon-ps:
    {{COMPOSE_MON}} ps --format "table {{{{.Name}}\t{{{{.Status}}"

# Tail a monitoring service. Usage: just mon-logs [grafana|loki|alloy] [lines]
mon-logs svc="grafana" n="200":
    {{COMPOSE_MON}} logs -f --tail {{n}} {{svc}}

# Bring the monitoring stack up on the VPS from the laptop (config must already be synced).
mon-deploy:
    ssh -t aurore "bash -lc 'cd ~/aurore && just mon-up'"

# Open an SSH tunnel to Grafana, then browse http://localhost:3001 (admin / .env.prod pwd).
mon-tunnel:
    @printf "Grafana → http://localhost:3001  (Ctrl-C to close tunnel)\n"
    ssh -N -L 3001:127.0.0.1:3001 aurore
