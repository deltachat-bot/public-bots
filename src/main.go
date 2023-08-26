package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/deltachat-bot/deltabot-cli-go/botcli"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
	"github.com/spf13/cobra"
)

var cli = botcli.New("public-bots")
var cfg *Config

type Config struct {
	LastUpdated time.Time
	Data        []byte
	Path        string `json:"-"`
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
	return &Metadata{AppVersion: xdcVersion, LastUpdated: self.LastUpdated, Data: self.Data}
}

func (self *Config) Save(data []byte) error {
	self.Data = data
	self.LastUpdated = time.Now()
	output, err := json.Marshal(self)
	if err != nil {
		return err
	}
	return os.WriteFile(self.Path, output, 0666)
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
		changed, err := getMetadata(url)
		if err != nil {
			logger.Error(err)
		} else if changed {
			logger.Debug("Metadata changed")
		} else {
			logger.Debug("Metadata have not changed")
		}
		time.Sleep(3 * time.Hour)
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
	if bytes.Equal(body, cfg.Data) {
		return false, nil
	}
	if err := cfg.Save(body); err != nil {
		return false, err
	}
	return true, nil
}

func main() {
	cli.OnBotInit(onBotInit)
	cli.OnBotStart(onBotStart)
	if err := cli.Start(); err != nil {
		cli.Logger.Error(err)
	}
}
