// RPC API definitions
package main

import (
	"net/url"
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
	Url         string    `json:"url"`
	Description string    `json:"description"`
	Lang        Lang      `json:"lang"`
	Admin       Admin     `json:"admin"`
	LastSeen    time.Time `json:"lastSeen"`
}

func (bot *Bot) Addr() string {
	parsedUrl, err := url.Parse(bot.Url)
	if err != nil {
		panic(err)
	}
	query, err := url.ParseQuery(parsedUrl.RawFragment)
	if err != nil {
		panic(err)
	}
	return query["a"][0]
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

// Sync bots list and online status.
func (api *API) Sync(hash string) (time.Time, *BotsData, StatusData, *xdcrpc.Error) {
	syncTime := time.Now()
	data := cfg.GetBotsData()

	if data.Hash == "" { // bots list is not available yet, client must retry later
		return syncTime, nil, nil, nil
	}

	if hash != data.Hash { // bots list changed, send new list to client
		return syncTime, &data, nil, nil
	}

	// bots list is up-to-date, send online statuses
	statuses := make(StatusData)
	for _, bot := range data.Bots {
		statuses[bot.Addr()] = bot.LastSeen
	}
	return syncTime, nil, statuses, nil
}
