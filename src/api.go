// RPC API definitions
package main

import (
	"encoding/base64"
	"encoding/json"
	"time"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat/xdcrpc"
)

type Metadata struct {
	LastUpdated time.Time       `json:"lastUpdated"`
	Data        json.RawMessage `json:"data"`
}

type API struct {
	rpc    *deltachat.Rpc
	accId  deltachat.AccountId
	msgId  deltachat.MsgId
	chatId deltachat.ChatId
}

// Sync app state.
func (api *API) Sync(lastUpdated *time.Time) (*Metadata, *xdcrpc.Error) {
	logger := cli.GetLogger(api.accId)
	version, err := api.rpc.GetWebxdcBlob(api.accId, api.msgId, "version.txt")
	if err != nil {
		logger.Error(err)
	} else {
		data, err := base64.StdEncoding.DecodeString(version)
		if err != nil {
			logger.Error(err)
		}
		version = string(data)
	}
	if version != xdcVersion {
		sendApp(api.rpc, api.accId, api.chatId)
		return nil, nil
	}
	data := cfg.GetMetadata()
	if lastUpdated == nil || *lastUpdated != data.LastUpdated {
		return data, nil
	}
	return nil, nil
}
