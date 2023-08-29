// RPC API definitions
package main

import (
	"encoding/json"
	"time"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat/xdcrpc"
)

type Metadata struct {
	LastUpdated time.Time       `json:"lastUpdated"`
	Data        json.RawMessage `json:"data"`
}

type API struct{}

// Sync app state.
func (api *API) Sync(lastUpdated *time.Time) (*Metadata, *xdcrpc.Error) {
	data := cfg.GetMetadata()
	if lastUpdated == nil || *lastUpdated != data.LastUpdated {
		return data, nil
	}
	return nil, nil
}
