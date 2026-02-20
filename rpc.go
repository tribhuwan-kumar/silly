package main

import (
	"fmt"
	"net/http"
	"encoding/json"
)

type GenericHandler func(json.RawMessage) (interface{}, error)

type RPCRequest struct {
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type RPCResponse struct {
	Result interface{} `json:"result,omitempty"`
	Error  string      `json:"error,omitempty"`
}

// Wrap is for functions taking an argument and returning data + error
func Wrap[T any, R any](f func(T) (R, error)) GenericHandler {
	return func(rawParams json.RawMessage) (interface{}, error) {
		var req T
		if len(rawParams) > 0 && string(rawParams) != "null" {
			if err := json.Unmarshal(rawParams, &req); err != nil {
				return nil, fmt.Errorf("invalid params format: %v", err)
			}
		}
		return f(req)
	}
}

// WrapVoid is for functions taking NO arguments, returning data + error
func WrapVoid[R any](f func() (R, error)) GenericHandler {
	return func(_ json.RawMessage) (interface{}, error) {
		return f()
	}
}

// WrapVoidNoErr is for functions taking NO arguments, returning only data (no error)
func WrapVoidNoErr[R any](f func() R) GenericHandler {
	return func(_ json.RawMessage) (interface{}, error) {
		return f(), nil
	}
}

func HandleRPC(registry map[string]GenericHandler, w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RPCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RPCResponse{Error: "Invalid JSON body"})
		return
	}

	handler, ok := registry[req.Method]
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RPCResponse{Error: fmt.Sprintf("Method '%s' not found", req.Method)})
		return
	}

	result, err := handler(req.Params)

	resp := RPCResponse{Result: result}
	if err != nil {
		resp.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
