// RPC API definitions
package main

import (
	"time"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat/xdcrpc"
)

type StatusData map[string]time.Time

type BotsData struct {
	Hash string `json:"hash"`
	Bots []Bot  `json:"bots"`

	lastChecked time.Time
}

type Bot struct {
	Addr        string    `json:"addr"`
	Url         string    `json:"url"`
	Description string    `json:"description"`
	Lang        Lang      `json:"lang"`
	Admin       Admin     `json:"admin"`
	LastSeen    time.Time `json:"lastSeen"`
}

type Admin struct {
	Name string `json:"name"`
	Url  string `json:"url"`
}

type Lang struct {
	Label string `json:"label"`
	Code  string `json:"code"`
}

type API struct{}

// Sync bot list and online status.
func (api *API) Sync(hash string) (time.Time, *BotsData, StatusData, *xdcrpc.Error) {
	syncTime := time.Now()
	data := cfg.GetBotsData()
	if data.Hash == "" {
		return syncTime, nil, nil, nil
	}
	if hash != data.Hash {
		return syncTime, &data, nil, nil
	}
	statuses := make(StatusData)
	for _, bot := range data.Bots {
		statuses[bot.Addr] = bot.LastSeen
	}
	return syncTime, nil, statuses, nil
}
