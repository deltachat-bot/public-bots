package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/deltachat-bot/deltabot-cli-go/botcli"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
	"github.com/spf13/cobra"
)

var cli = botcli.New("public-bots")
var cfg *Config

type Config struct {
	LastChecked time.Time
	LastUpdated time.Time
	Data        []byte
	Path        string `json:"-"`
	mutex       sync.Mutex
}

func newConfig(path string) (*Config, error) {
	cfg := &Config{Path: path}
	if _, err := os.Stat(cfg.Path); err == nil { // file exists
		data, err := os.ReadFile(cfg.Path)
		if err != nil {
			return cfg, err
		}
		if err = json.Unmarshal(data, &cfg); err != nil {
			return cfg, err
		}
	}
	return cfg, nil
}

func (self *Config) GetMetadata() *Metadata {
	self.mutex.Lock()
	defer self.mutex.Unlock()
	return &Metadata{LastUpdated: self.LastUpdated, Data: self.Data}
}

func (self *Config) Save(data []byte) (bool, error) {
	self.mutex.Lock()
	defer self.mutex.Unlock()
	self.LastChecked = time.Now()
	changed := !bytes.Equal(data, cfg.Data)
	if changed {
		self.Data = data
		self.LastUpdated = self.LastChecked
	}
	output, err := json.Marshal(self)
	if err != nil {
		return false, err
	}
	return changed, os.WriteFile(self.Path, output, 0666)
}

func onBotInit(cli *botcli.BotCli, bot *deltachat.Bot, cmd *cobra.Command, args []string) {
	bot.OnUnhandledEvent(onEvent)
	bot.OnNewMsg(onNewMsg)
}

func onBotStart(cli *botcli.BotCli, bot *deltachat.Bot, cmd *cobra.Command, args []string) {
	var err error
	cfg, err = newConfig(filepath.Join(cli.AppDir, "metadata.json"))
	if err != nil {
		cli.Logger.Error(err)
	}
	go updateMetadataLoop()
}

func updateMetadataLoop() {
	url := "https://github.com/deltachat-bot/public-bots/raw/main/data.json"
	logger := cli.Logger.With("origin", "metadata-loop")
	for {
		toSleep := 3 * time.Hour - time.Since(cfg.LastChecked)
		if toSleep>0 {
			logger.Debugf("Sleeping for %v", toSleep)
			time.Sleep(toSleep)
		}
		changed, err := getMetadata(url)
		if err != nil {
			logger.Error(err)
		} else if changed {
			logger.Debug("Metadata changed")
		} else {
			logger.Debug("Metadata have not changed")
		}
	}
}

func getMetadata(url string) (bool, error) {
	resp, err := http.Get(url)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}
	return cfg.Save(body)
}

func main() {
	cli.OnBotInit(onBotInit)
	cli.OnBotStart(onBotStart)
	if err := cli.Start(); err != nil {
		cli.Logger.Error(err)
	}
}
