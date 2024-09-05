package main

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"os"
	"sync"
	"time"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
)

var cfg *Config

type Config struct {
	StatusLastChecked time.Time
	OffLastChecked    time.Time
	BotsData          BotsData

	rpc   *deltachat.Rpc
	path  string
	mutex sync.Mutex
}

type RawData struct {
	Bots   []RawBot
	Admins map[string]RawAdmin
	Langs  map[string]string
}

type RawBot struct {
	Description string
	Lang        string
	Admin       string
	Url         string
}

type RawAdmin struct {
	Url string
}

func newConfig(rpc *deltachat.Rpc, path string) (*Config, error) {
	cfg := &Config{path: path, rpc: rpc}
	if _, err := os.Stat(cfg.path); err == nil { // file exists
		data, err := os.ReadFile(cfg.path)
		if err != nil {
			return cfg, err
		}
		if err = json.Unmarshal(data, &cfg); err != nil {
			return cfg, err
		}
	}
	return cfg, nil
}

func (self *Config) GetBotsData() BotsData {
	self.mutex.Lock()
	defer self.mutex.Unlock()
	botsData := BotsData{Hash: cfg.BotsData.Hash}
	if cfg.BotsData.Hash != "" {
		selfAddrs := getSelfAddrs(self.rpc)
		accId := getFirstAccount(self.rpc)
		for index := range cfg.BotsData.Bots {
			if accId == 0 {
				break
			}
			addr := cfg.BotsData.Bots[index].Addr()
			if _, ok := selfAddrs[addr]; ok {
				cfg.BotsData.Bots[index].LastSeen = time.Now()
				continue
			}
			contactId, err := self.rpc.CreateContact(accId, addr, "")
			if err != nil {
				cli.Logger.Error(err)
				continue
			}
			if err != nil {
				cli.Logger.Error(err)
				continue
			}
			contact, err := self.rpc.GetContact(accId, contactId)
			if err != nil {
				cli.Logger.Error(err)
				continue
			}
			cfg.BotsData.Bots[index].LastSeen = contact.LastSeen.Time
		}
		bots := make([]Bot, len(cfg.BotsData.Bots))
		copy(bots, cfg.BotsData.Bots)
		botsData.Bots = bots
	}
	return botsData
}

func (self *Config) SaveData(data []byte) (bool, error) {
	self.mutex.Lock()
	defer self.mutex.Unlock()
	self.BotsData.lastChecked = time.Now()

	hash := GetMD5Hash(data)
	changed := hash != cfg.BotsData.Hash
	if changed {
		var rawData RawData
		if err := json.Unmarshal(data, &rawData); err != nil {
			return false, err
		}
		self.BotsData.Bots = make([]Bot, len(rawData.Bots))
		for i, rawBot := range rawData.Bots {
			self.BotsData.Bots[i] = Bot{
				Url:         rawBot.Url,
				Description: rawBot.Description,
				Lang:        Lang{Code: rawBot.Lang, Label: rawData.Langs[rawBot.Lang]},
				Admin:       Admin{Name: rawBot.Admin, Url: rawData.Admins[rawBot.Admin].Url},
			}
		}
		self.BotsData.Hash = hash
	}

	output, err := json.Marshal(self)
	if err != nil {
		return false, err
	}
	return changed, os.WriteFile(self.path, output, 0666)
}

func (self *Config) SaveStatusLastChecked() error {
	self.mutex.Lock()
	defer self.mutex.Unlock()
	self.StatusLastChecked = time.Now()
	output, err := json.Marshal(self)
	if err != nil {
		return err
	}
	return os.WriteFile(self.path, output, 0666)
}

func (self *Config) SaveOffLastChecked() error {
	self.mutex.Lock()
	defer self.mutex.Unlock()
	self.OffLastChecked = time.Now()
	output, err := json.Marshal(self)
	if err != nil {
		return err
	}
	return os.WriteFile(self.path, output, 0666)
}

func GetMD5Hash(data []byte) string {
	hash := md5.Sum(data)
	return hex.EncodeToString(hash[:])
}
