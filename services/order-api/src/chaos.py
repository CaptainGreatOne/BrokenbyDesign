"""Chaos engineering module for order-api service.

Provides in-memory chaos state management, a gRPC server interceptor that
injects latency/errors/crashes, and HTTP endpoints via Flask to control
chaos behavior at runtime.

All chaos state is in-memory and resets on service restart.
"""

import os
import time
import random
import threading
import uuid

import grpc
from flask import Flask, request, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from logger import json_log


# ---------------------------------------------------------------------------
# In-memory chaos state
# ---------------------------------------------------------------------------

chaos_state = {
    "latency": {"enabled": False, "severity": None, "delay_ms": 0, "timer": None},
    "errors":  {"enabled": False, "severity": None, "error_rate": 0.0, "timer": None},
    "crash":   {"enabled": False, "severity": None, "countdown": None, "timer": None},
    "memory":  {"enabled": False, "severity": None, "allocations": [], "timer": None},
    "disk":    {"enabled": False, "severity": None, "files": [], "timer": None},
}

# Severity presets — order-api uses higher latency values to simulate slow DB queries
PRESETS = {
    "latency": {
        "mild":   {"delay_ms": 500},
        "severe": {"delay_ms": 5000},
    },
    "errors": {
        "mild":   {"error_rate": 0.10},
        "severe": {"error_rate": 0.50},
    },
    "crash": {
        "mild":   {"countdown": 10},
        "severe": {"countdown": 3},
    },
    "memory": {
        "mild":   {"size_mb": 50},
        "severe": {"size_mb": 200},
    },
    "disk": {
        "mild":   {"size_mb": 10},
        "severe": {"size_mb": 50},
    },
}

VALID_SCENARIOS = set(PRESETS.keys())
VALID_SEVERITIES = {"mild", "severe"}

_state_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Resource cleanup helpers
# ---------------------------------------------------------------------------

def _cleanup_scenario(scenario: str) -> None:
    """Release any resources held by the named scenario (memory buffers, disk files)."""
    state = chaos_state[scenario]
    if scenario == "memory":
        state["allocations"].clear()
    elif scenario == "disk":
        for path in list(state["files"]):
            try:
                os.remove(path)
            except OSError:
                pass
        state["files"].clear()


def _reset_scenario(scenario: str) -> None:
    """Reset a single scenario to its default (disabled) state."""
    with _state_lock:
        # Cancel any pending auto-disable timer
        timer = chaos_state[scenario].get("timer")
        if timer is not None:
            timer.cancel()
        _cleanup_scenario(scenario)

        if scenario in ("latency",):
            chaos_state[scenario] = {"enabled": False, "severity": None, "delay_ms": 0, "timer": None}
        elif scenario == "errors":
            chaos_state[scenario] = {"enabled": False, "severity": None, "error_rate": 0.0, "timer": None}
        elif scenario == "crash":
            chaos_state[scenario] = {"enabled": False, "severity": None, "countdown": None, "timer": None}
        elif scenario == "memory":
            chaos_state[scenario] = {"enabled": False, "severity": None, "allocations": [], "timer": None}
        elif scenario == "disk":
            chaos_state[scenario] = {"enabled": False, "severity": None, "files": [], "timer": None}


# ---------------------------------------------------------------------------
# gRPC Server Interceptor
# ---------------------------------------------------------------------------

class ChaosInterceptor(grpc.ServerInterceptor):
    """gRPC server interceptor that injects chaos into every RPC call."""

    def intercept_service(self, continuation, handler_call_details):
        handler = continuation(handler_call_details)
        if handler is None:
            return handler

        original_unary_unary = handler.unary_unary
        if original_unary_unary is None:
            return handler

        def chaos_unary_unary(request, context):
            # --- Crash check ---
            with _state_lock:
                crash_enabled = chaos_state["crash"]["enabled"]
                if crash_enabled:
                    countdown = chaos_state["crash"]["countdown"]
                    if countdown is not None:
                        countdown -= 1
                        chaos_state["crash"]["countdown"] = countdown
                    else:
                        countdown = 0

            if crash_enabled and countdown <= 0:
                json_log("ERROR", "Chaos: service crash triggered",
                         handler="ChaosInterceptor")
                def _do_exit():
                    time.sleep(0.1)
                    os._exit(1)
                t = threading.Thread(target=_do_exit, daemon=True)
                t.start()

            # --- Latency injection ---
            with _state_lock:
                latency_enabled = chaos_state["latency"]["enabled"]
                delay_ms = chaos_state["latency"]["delay_ms"]

            if latency_enabled and delay_ms > 0:
                json_log("WARN", "Chaos: injecting latency",
                         handler="ChaosInterceptor",
                         delay_ms=delay_ms)
                time.sleep(delay_ms / 1000.0)

            # --- Error injection ---
            with _state_lock:
                errors_enabled = chaos_state["errors"]["enabled"]
                error_rate = chaos_state["errors"]["error_rate"]

            if errors_enabled and random.random() < error_rate:
                json_log("WARN", "Chaos: injecting gRPC error",
                         handler="ChaosInterceptor",
                         error_rate=error_rate)
                context.set_code(grpc.StatusCode.INTERNAL)
                context.set_details("Chaos: injected error")
                # Return an empty response of the appropriate type
                # We call the original handler to get the response type,
                # but abort after setting the error code
                return original_unary_unary(request, context)

            return original_unary_unary(request, context)

        return handler._replace(unary_unary=chaos_unary_unary)


# ---------------------------------------------------------------------------
# Flask HTTP server for chaos control + metrics
# ---------------------------------------------------------------------------

chaos_app = Flask(__name__)
chaos_app.config["JSON_SORT_KEYS"] = False


@chaos_app.route("/metrics")
def metrics():
    """Prometheus metrics endpoint (proxied from prometheus_client)."""
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}


@chaos_app.route("/chaos/enable", methods=["POST"])
def chaos_enable():
    """Enable a chaos scenario.

    Body (JSON):
        scenario: latency | errors | crash | memory | disk
        severity: mild | severe
        params: optional overrides (e.g. {"delay_ms": 1000})
        duration_seconds: optional — auto-disable after this many seconds
    """
    body = request.get_json(silent=True) or {}
    scenario = body.get("scenario")
    severity = body.get("severity", "mild")
    params = body.get("params") or {}
    duration_seconds = body.get("duration_seconds")

    if scenario not in VALID_SCENARIOS:
        return jsonify({"error": f"Unknown scenario. Valid: {sorted(VALID_SCENARIOS)}"}), 400
    if severity not in VALID_SEVERITIES:
        return jsonify({"error": f"Unknown severity. Valid: {sorted(VALID_SEVERITIES)}"}), 400

    preset = dict(PRESETS[scenario][severity])
    preset.update(params)  # caller overrides take precedence

    with _state_lock:
        state = chaos_state[scenario]

        # Cancel any existing auto-disable timer before re-enabling
        old_timer = state.get("timer")
        if old_timer is not None:
            old_timer.cancel()

        state["enabled"] = True
        state["severity"] = severity
        state["timer"] = None

        # Apply scenario-specific config
        if scenario == "latency":
            state["delay_ms"] = preset.get("delay_ms", 500)

        elif scenario == "errors":
            state["error_rate"] = preset.get("error_rate", 0.10)

        elif scenario == "crash":
            state["countdown"] = preset.get("countdown", 10)

        elif scenario == "memory":
            size_mb = preset.get("size_mb", 50)
            buf = bytearray(size_mb * 1024 * 1024)
            state["allocations"].append(buf)

        elif scenario == "disk":
            size_mb = preset.get("size_mb", 10)
            path = f"/tmp/chaos-{uuid.uuid4()}.dat"
            with open(path, "wb") as f:
                f.write(os.urandom(size_mb * 1024 * 1024))
            state["files"].append(path)

        # Optional auto-disable timer
        new_timer = None
        if duration_seconds is not None:
            try:
                dur = float(duration_seconds)
                if dur > 0:
                    def _auto_disable(s=scenario):
                        _reset_scenario(s)
                        json_log("INFO", "Chaos: scenario auto-disabled after duration",
                                 handler="ChaosInterceptor",
                                 scenario=s)

                    new_timer = threading.Timer(dur, _auto_disable)
                    new_timer.daemon = True
                    new_timer.start()
            except (TypeError, ValueError):
                pass

        state["timer"] = new_timer

    json_log("INFO", "Chaos: scenario enabled",
             handler="ChaosInterceptor",
             scenario=scenario,
             severity=severity,
             duration_seconds=duration_seconds)

    return jsonify({
        "status": "enabled",
        "scenario": scenario,
        "severity": severity,
        "params": preset,
        "duration_seconds": duration_seconds,
    }), 200


@chaos_app.route("/chaos/disable", methods=["POST"])
def chaos_disable():
    """Disable a specific chaos scenario.

    Body (JSON):
        scenario: latency | errors | crash | memory | disk
    """
    body = request.get_json(silent=True) or {}
    scenario = body.get("scenario")

    if scenario not in VALID_SCENARIOS:
        return jsonify({"error": f"Unknown scenario. Valid: {sorted(VALID_SCENARIOS)}"}), 400

    _reset_scenario(scenario)

    json_log("INFO", "Chaos: scenario disabled",
             handler="ChaosInterceptor",
             scenario=scenario)

    return jsonify({"status": "disabled", "scenario": scenario}), 200


@chaos_app.route("/chaos/reset", methods=["POST"])
def chaos_reset():
    """Reset ALL chaos scenarios."""
    for scenario in list(VALID_SCENARIOS):
        _reset_scenario(scenario)

    json_log("INFO", "Chaos: all scenarios reset",
             handler="ChaosInterceptor")

    return jsonify({"status": "reset", "scenarios": sorted(VALID_SCENARIOS)}), 200


@chaos_app.route("/chaos/status", methods=["GET"])
def chaos_status():
    """Return sanitized current chaos state (no raw buffers/file handles)."""
    with _state_lock:
        sanitized = {}
        for scenario, state in chaos_state.items():
            entry = {k: v for k, v in state.items() if k not in ("allocations", "files", "timer")}
            if scenario == "memory":
                entry["allocation_count"] = len(state["allocations"])
            elif scenario == "disk":
                entry["file_count"] = len(state["files"])
            sanitized[scenario] = entry

    return jsonify({"chaos": sanitized}), 200


# ---------------------------------------------------------------------------
# Server startup
# ---------------------------------------------------------------------------

def start_chaos_server(port: int = 8000) -> None:
    """Start the Flask server (chaos + metrics) in a daemon thread.

    Args:
        port: TCP port to listen on (default: 8000)
    """
    def _run():
        # Suppress Flask startup banner and access logs for cleaner container output
        import logging
        log = logging.getLogger("werkzeug")
        log.setLevel(logging.ERROR)
        chaos_app.run(host="0.0.0.0", port=port, threaded=True)

    t = threading.Thread(target=_run, daemon=True, name="chaos-http-server")
    t.start()
