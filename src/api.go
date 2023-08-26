// RPC API definitions
package main

import (
	"encoding/json"
	"time"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat/xdcrpc"
)

type Metadata struct {
	AppVersion  string
	LastUpdated time.Time
	Data        json.RawMessage
}

type API struct{}

// Sync app state.
func (api *API) Sync(appVersion string, lastUpdated time.Time) (*Metadata, *xdcrpc.Error) {
	if appVersion != xdcVersion {
		// TODO: andle app upgrades
		return nil, nil
	}
	if lastUpdated != cfg.LastUpdated {
		return cfg.GetMetadata(), nil
	}
	return nil, nil
}
