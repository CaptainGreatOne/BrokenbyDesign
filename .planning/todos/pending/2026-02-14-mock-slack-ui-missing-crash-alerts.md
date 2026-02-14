---
created: 2026-02-14T22:20
title: Investigate mock Slack UI not showing crash-triggered alerts
area: alerting
files:
  - services/mock-slack-ui/
  - alerting/alertmanager.yml
  - alerting/rules/
  - docker-compose.yml:424
---

## Problem

When order-api is crashed via the chaos controller, the state change appears correctly in:
- Chaos controller UI (port 9095)
- Prometheus (port 9090)
- Alertmanager (port 9093)
- Grafana (port 3001)

But the mock Slack UI (port 8085) does **not** display the crash alert.

Since Alertmanager shows the alert firing, the issue is likely downstream of Alertmanager — either:
1. Alertmanager webhook routing config not sending crash-related alerts to the mock Slack receiver
2. Mock Slack UI webhook endpoint not receiving or parsing the payload correctly
3. Alert rule may fire but resolve too quickly for the mock Slack UI to capture (crash = instant down, InstanceDown has a `for` duration)
4. Mock Slack UI's in-memory FIFO may have a rendering bug for certain alert payloads

## Solution

TBD — Start by checking:
- Alertmanager webhook receiver routes (`alerting/alertmanager.yml`) to confirm mock-slack-ui is a receiver target
- Mock Slack UI logs (`docker logs mock-slack-ui`) during a crash event to see if webhooks arrive
- Compare the webhook payload structure for crash alerts vs other alert types
