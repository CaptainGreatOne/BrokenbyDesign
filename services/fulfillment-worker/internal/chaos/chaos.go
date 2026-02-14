package chaos

import (
	"encoding/json"
	"fmt"
	"fulfillment-worker/internal/logger"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"
)

// ScenarioConfig holds configuration for a single chaos scenario
type ScenarioConfig struct {
	Enabled  bool   `json:"enabled"`
	Severity string `json:"severity,omitempty"`
	// Scenario-specific fields
	DelayMs   int     `json:"delay_ms,omitempty"`
	ErrorRate float64 `json:"error_rate,omitempty"`
	Countdown *int    `json:"countdown,omitempty"`
	SizeMB    int     `json:"size_mb,omitempty"`
}

// State holds in-memory chaos state for all scenarios
type State struct {
	mu          sync.RWMutex
	Latency     ScenarioConfig `json:"latency"`
	Errors      ScenarioConfig `json:"errors"`
	Crash       ScenarioConfig `json:"crash"`
	Memory      ScenarioConfig `json:"memory"`
	Disk        ScenarioConfig `json:"disk"`
	allocations [][]byte       // memory pressure storage
	files       []string       // disk pressure file paths
	timers      map[string]*time.Timer // duration-based auto-disable timers
}

var state = &State{
	timers: make(map[string]*time.Timer),
}

// Severity presets for each scenario
var presets = map[string]map[string]ScenarioConfig{
	"latency": {
		"mild":   {DelayMs: 500},
		"severe": {DelayMs: 5000},
	},
	"errors": {
		"mild":   {ErrorRate: 0.10},
		"severe": {ErrorRate: 0.50},
	},
	"crash": {
		"mild":   {Countdown: intPtr(10)},
		"severe": {Countdown: intPtr(3)},
	},
	"memory": {
		"mild":   {SizeMB: 50},
		"severe": {SizeMB: 200},
	},
	"disk": {
		"mild":   {SizeMB: 10},
		"severe": {SizeMB: 50},
	},
}

func intPtr(i int) *int {
	return &i
}

// ShouldInjectLatency returns true and delay duration if latency chaos is active
func ShouldInjectLatency() (bool, time.Duration) {
	state.mu.RLock()
	defer state.mu.RUnlock()
	if !state.Latency.Enabled {
		return false, 0
	}
	return true, time.Duration(state.Latency.DelayMs) * time.Millisecond
}

// ShouldInjectError returns true if error chaos triggers (probabilistic)
func ShouldInjectError() bool {
	state.mu.RLock()
	defer state.mu.RUnlock()
	if !state.Errors.Enabled {
		return false
	}
	return rand.Float64() < state.Errors.ErrorRate
}

// ShouldCrash decrements crash countdown and returns true when it hits zero
func ShouldCrash() bool {
	state.mu.Lock()
	defer state.mu.Unlock()
	if !state.Crash.Enabled || state.Crash.Countdown == nil {
		return false
	}
	*state.Crash.Countdown--
	return *state.Crash.Countdown <= 0
}

// enableRequest is the JSON body for POST /chaos/enable
type enableRequest struct {
	Scenario        string                 `json:"scenario"`
	Severity        string                 `json:"severity"`
	Params          map[string]interface{} `json:"params"`
	DurationSeconds float64                `json:"duration_seconds"`
}

// disableRequest is the JSON body for POST /chaos/disable
type disableRequest struct {
	Scenario string `json:"scenario"`
}

// getScenarioConfig returns a pointer to the scenario config by name
// Must be called with state.mu held
func getScenarioConfig(scenario string) *ScenarioConfig {
	switch scenario {
	case "latency":
		return &state.Latency
	case "errors":
		return &state.Errors
	case "crash":
		return &state.Crash
	case "memory":
		return &state.Memory
	case "disk":
		return &state.Disk
	}
	return nil
}

// resetScenario resets a scenario to its zero state and cleans up resources
// Must be called with state.mu held
func resetScenario(scenario string) {
	switch scenario {
	case "latency":
		state.Latency = ScenarioConfig{}
	case "errors":
		state.Errors = ScenarioConfig{}
	case "crash":
		state.Crash = ScenarioConfig{}
	case "memory":
		state.Memory = ScenarioConfig{}
		state.allocations = nil
	case "disk":
		state.Disk = ScenarioConfig{}
		for _, f := range state.files {
			os.Remove(f)
		}
		state.files = nil
	}
}

// stopTimer stops and removes a timer for a scenario (must be called with lock held)
func stopTimer(scenario string) {
	if t, ok := state.timers[scenario]; ok {
		t.Stop()
		delete(state.timers, scenario)
	}
}

// RegisterHandlers registers all chaos HTTP endpoints on the given mux
func RegisterHandlers(mux *http.ServeMux) {
	mux.HandleFunc("/chaos/enable", handleEnable)
	mux.HandleFunc("/chaos/disable", handleDisable)
	mux.HandleFunc("/chaos/reset", handleReset)
	mux.HandleFunc("/chaos/status", handleStatus)
}

func handleEnable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req enableRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: "+err.Error(), http.StatusBadRequest)
		return
	}

	validScenarios := map[string]bool{"latency": true, "errors": true, "crash": true, "memory": true, "disk": true}
	if !validScenarios[req.Scenario] {
		http.Error(w, fmt.Sprintf("Bad Request: unknown scenario %q", req.Scenario), http.StatusBadRequest)
		return
	}

	state.mu.Lock()

	// Stop any existing auto-disable timer
	stopTimer(req.Scenario)

	// Start with preset if severity provided
	cfg := ScenarioConfig{Enabled: true, Severity: req.Severity}
	if req.Severity != "" {
		if scenarioPresets, ok := presets[req.Scenario]; ok {
			if preset, ok := scenarioPresets[req.Severity]; ok {
				cfg.DelayMs = preset.DelayMs
				cfg.ErrorRate = preset.ErrorRate
				if preset.Countdown != nil {
					v := *preset.Countdown
					cfg.Countdown = &v
				}
				cfg.SizeMB = preset.SizeMB
			}
		}
	}

	// Override with explicit params
	if req.Params != nil {
		if v, ok := req.Params["delay_ms"]; ok {
			if f, ok := v.(float64); ok {
				cfg.DelayMs = int(f)
			}
		}
		if v, ok := req.Params["error_rate"]; ok {
			if f, ok := v.(float64); ok {
				cfg.ErrorRate = f
			}
		}
		if v, ok := req.Params["countdown"]; ok {
			if f, ok := v.(float64); ok {
				i := int(f)
				cfg.Countdown = &i
			}
		}
		if v, ok := req.Params["size_mb"]; ok {
			if f, ok := v.(float64); ok {
				cfg.SizeMB = int(f)
			}
		}
	}

	// Apply scenario-specific resource allocation
	switch req.Scenario {
	case "memory":
		if cfg.SizeMB > 0 {
			block := make([]byte, cfg.SizeMB*1024*1024)
			state.allocations = append(state.allocations, block)
		}
	case "disk":
		if cfg.SizeMB > 0 {
			path := fmt.Sprintf("/tmp/chaos-%d.dat", rand.Int63())
			f, err := os.Create(path)
			if err == nil {
				f.Write(make([]byte, cfg.SizeMB*1024*1024))
				f.Close()
				state.files = append(state.files, path)
			}
		}
	}

	// Assign config to the correct field
	switch req.Scenario {
	case "latency":
		state.Latency = cfg
	case "errors":
		state.Errors = cfg
	case "crash":
		state.Crash = cfg
	case "memory":
		state.Memory = cfg
	case "disk":
		state.Disk = cfg
	}

	// Set up auto-disable timer if duration_seconds provided
	if req.DurationSeconds > 0 {
		scenario := req.Scenario
		duration := time.Duration(req.DurationSeconds) * time.Second
		timer := time.AfterFunc(duration, func() {
			state.mu.Lock()
			resetScenario(scenario)
			delete(state.timers, scenario)
			state.mu.Unlock()
			logger.Info(fmt.Sprintf("Chaos: scenario %s auto-disabled after duration", scenario), "ChaosHandler", "", nil)
		})
		state.timers[req.Scenario] = timer
	}

	state.mu.Unlock()

	logMsg := fmt.Sprintf("Chaos: enabled scenario %s severity=%s", req.Scenario, req.Severity)
	if req.DurationSeconds > 0 {
		logMsg += fmt.Sprintf(" duration_seconds=%.0f", req.DurationSeconds)
	}
	logger.Warn(logMsg, "ChaosHandler", "", nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":           "enabled",
		"scenario":         req.Scenario,
		"severity":         req.Severity,
		"duration_seconds": req.DurationSeconds,
	})
}

func handleDisable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req disableRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: "+err.Error(), http.StatusBadRequest)
		return
	}

	validScenarios := map[string]bool{"latency": true, "errors": true, "crash": true, "memory": true, "disk": true}
	if !validScenarios[req.Scenario] {
		http.Error(w, fmt.Sprintf("Bad Request: unknown scenario %q", req.Scenario), http.StatusBadRequest)
		return
	}

	state.mu.Lock()
	stopTimer(req.Scenario)
	resetScenario(req.Scenario)
	state.mu.Unlock()

	logger.Warn(fmt.Sprintf("Chaos: disabled scenario %s", req.Scenario), "ChaosHandler", "", nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "disabled",
		"scenario": req.Scenario,
	})
}

func handleReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	state.mu.Lock()
	for scenario := range state.timers {
		stopTimer(scenario)
	}
	for _, scenario := range []string{"latency", "errors", "crash", "memory", "disk"} {
		resetScenario(scenario)
	}
	state.mu.Unlock()

	logger.Warn("Chaos: all scenarios reset", "ChaosHandler", "", nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "reset",
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	state.mu.RLock()
	snapshot := struct {
		Latency ScenarioConfig `json:"latency"`
		Errors  ScenarioConfig `json:"errors"`
		Crash   ScenarioConfig `json:"crash"`
		Memory  ScenarioConfig `json:"memory"`
		Disk    ScenarioConfig `json:"disk"`
	}{
		Latency: state.Latency,
		Errors:  state.Errors,
		Crash:   state.Crash,
		Memory:  state.Memory,
		Disk:    state.Disk,
	}
	state.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(snapshot)
}
