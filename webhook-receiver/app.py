from flask import Flask, request, jsonify
import threading
from datetime import datetime

app = Flask(__name__)

# In-memory alert storage (max 100 entries, FIFO)
alerts = []
alerts_lock = threading.Lock()
MAX_ALERTS = 100


@app.route('/alerts', methods=['POST'])
def receive_alert():
    """
    Receives Alertmanager webhook payloads.
    Alertmanager format: {version, status, alerts: [{status, labels, annotations, startsAt, endsAt, ...}]}
    """
    try:
        payload = request.get_json()

        if not payload or 'alerts' not in payload:
            return jsonify({"status": "success", "message": "No alerts in payload"}), 200

        with alerts_lock:
            for alert_data in payload.get('alerts', []):
                # Extract alert fields
                labels = alert_data.get('labels', {})
                annotations = alert_data.get('annotations', {})

                alert = {
                    'alertname': labels.get('alertname', 'unknown'),
                    'severity': labels.get('severity', 'info'),
                    'service': labels.get('service', 'unknown'),
                    'summary': annotations.get('summary', 'No summary provided'),
                    'status': alert_data.get('status', 'unknown'),
                    'startsAt': alert_data.get('startsAt', ''),
                    'endsAt': alert_data.get('endsAt', ''),
                    'fingerprint': alert_data.get('fingerprint', ''),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }

                # Log to stdout
                print(f"ALERT [{alert['status']}] severity={alert['severity']} "
                      f"service={alert['service']} alertname={alert['alertname']} "
                      f"summary={alert['summary']}")

                # Store alert (FIFO, max 100)
                alerts.append(alert)
                if len(alerts) > MAX_ALERTS:
                    alerts.pop(0)

        return jsonify({"status": "success"}), 200

    except Exception as e:
        print(f"ERROR processing webhook: {str(e)}")
        return jsonify({"status": "success"}), 200


@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """
    Returns stored alerts as JSON array (newest first).
    """
    with alerts_lock:
        return jsonify(list(reversed(alerts))), 200


@app.route('/health', methods=['GET'])
def health():
    """
    Health check endpoint.
    """
    return jsonify({"status": "healthy"}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
