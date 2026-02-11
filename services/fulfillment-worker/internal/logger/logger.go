package logger

import (
	"fmt"
	"time"
)

const serviceName = "fulfillment-worker"

// Info logs an informational message with handler, id, and optional fields
func Info(message, handler, id string, fields map[string]interface{}) {
	log("INFO", message, handler, id, "", fields)
}

// Error logs an error message with handler, id, error, and optional fields
func Error(message, handler, id string, err error, fields map[string]interface{}) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	}
	log("ERROR", message, handler, id, errMsg, fields)
}

// Warn logs a warning message with handler, id, and optional fields
func Warn(message, handler, id string, fields map[string]interface{}) {
	log("WARN", message, handler, id, "", fields)
}

// log is the internal logging function that outputs plain text
func log(level, message, handler, id, errMsg string, fields map[string]interface{}) {
	// Timestamp in RFC3339 format
	timestamp := time.Now().UTC().Format(time.RFC3339)

	// Level padded to 5 characters
	levelPadded := fmt.Sprintf("%-5s", level)

	// Start building the log line
	logLine := fmt.Sprintf("%s %s %s %s", timestamp, levelPadded, serviceName, handler)

	// Add ID if present (format as item=id for this service)
	if id != "" {
		logLine += fmt.Sprintf(" item=%s", id)
	}

	// Add error field if present
	if errMsg != "" {
		logLine += fmt.Sprintf(" error=%s", errMsg)
	}

	// Add additional fields
	if fields != nil {
		for k, v := range fields {
			logLine += fmt.Sprintf(" %s=%v", k, v)
		}
	}

	// Append message at the end
	logLine += fmt.Sprintf(" %s", message)

	// Print to stdout
	fmt.Printf("%s\n", logLine)
}
