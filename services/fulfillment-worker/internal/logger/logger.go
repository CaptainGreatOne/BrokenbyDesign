package logger

import (
	"encoding/json"
	"fmt"
	"time"
)

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp     string                 `json:"timestamp"`
	Level         string                 `json:"level"`
	Service       string                 `json:"service"`
	Message       string                 `json:"message"`
	CorrelationID string                 `json:"correlation_id,omitempty"`
	Error         string                 `json:"error,omitempty"`
	Fields        map[string]interface{} `json:"fields,omitempty"`
}

const serviceName = "fulfillment-worker"

// Info logs an informational message with optional fields
func Info(message, correlationID string, fields ...map[string]interface{}) {
	log("INFO", message, correlationID, "", fields...)
}

// Error logs an error message with optional fields
func Error(message, correlationID string, err error, fields ...map[string]interface{}) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	}
	log("ERROR", message, correlationID, errMsg, fields...)
}

// Warn logs a warning message with optional fields
func Warn(message, correlationID string, fields ...map[string]interface{}) {
	log("WARN", message, correlationID, "", fields...)
}

// log is the internal logging function
func log(level, message, correlationID, errMsg string, fields ...map[string]interface{}) {
	entry := LogEntry{
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
		Level:         level,
		Service:       serviceName,
		Message:       message,
		CorrelationID: correlationID,
		Error:         errMsg,
	}

	// Merge all provided fields into a single map
	if len(fields) > 0 {
		merged := make(map[string]interface{})
		for _, fieldMap := range fields {
			for k, v := range fieldMap {
				merged[k] = v
			}
		}
		if len(merged) > 0 {
			entry.Fields = merged
		}
	}

	// Marshal to JSON and print to stdout
	jsonBytes, err := json.Marshal(entry)
	if err != nil {
		// Fallback to plain text if JSON marshaling fails
		fmt.Printf("{\"timestamp\":\"%s\",\"level\":\"ERROR\",\"service\":\"%s\",\"message\":\"Failed to marshal log entry\",\"error\":\"%s\"}\n",
			time.Now().UTC().Format(time.RFC3339), serviceName, err.Error())
		return
	}

	fmt.Println(string(jsonBytes))
}
