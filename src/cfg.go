package main

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"os"
	"sync"
	"time"

	"github.com/chatmail/rpc-client-go/deltachat"
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

func (config *Config) GetBotsData() BotsData {
	config.mutex.Lock()
	defer config.mutex.Unlock()
	botsData := BotsData{Hash: cfg.BotsData.Hash}
	if cfg.BotsData.Hash != "" {
		selfAddrs := getSelfAddrs(config.rpc)
		accId := getFirstAccount(config.rpc)
		for index := range cfg.BotsData.Bots {
			if accId == 0 {
				break
			}
			addr := cfg.BotsData.Bots[index].Addr()
			if _, ok := selfAddrs[addr]; ok {
				cfg.BotsData.Bots[index].LastSeen = time.Now()
				continue
			}
			contactId, err := config.rpc.LookupContactIdByAddr(accId, addr)
			if err != nil {
				cli.Logger.Error(err)
				continue
			}
			contact, err := config.rpc.GetContact(accId, contactId.UnwrapOr(0))
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

func (config *Config) SaveData(data []byte) (bool, error) {
	config.mutex.Lock()
	defer config.mutex.Unlock()
	config.BotsData.lastChecked = time.Now()

	hash := GetMD5Hash(data)
	changed := hash != cfg.BotsData.Hash
	if changed {
		var rawData RawData
		if err := json.Unmarshal(data, &rawData); err != nil {
			return false, err
		}
		config.BotsData.Bots = make([]Bot, len(rawData.Bots))
		for i, rawBot := range rawData.Bots {
			config.BotsData.Bots[i] = Bot{
				Url:         rawBot.Url,
				Description: rawBot.Description,
				Lang:        Lang{Code: rawBot.Lang, Label: rawData.Langs[rawBot.Lang]},
				Admin:       Admin{Name: rawBot.Admin, Url: rawData.Admins[rawBot.Admin].Url},
			}
		}
		config.BotsData.Hash = hash
	}

	output, err := json.Marshal(config)
	if err != nil {
		return false, err
	}
	return changed, os.WriteFile(config.path, output, 0666)
}

func (config *Config) SaveStatusLastChecked() error {
	config.mutex.Lock()
	defer config.mutex.Unlock()
	config.StatusLastChecked = time.Now()
	output, err := json.Marshal(config)
	if err != nil {
		return err
	}
	return os.WriteFile(config.path, output, 0666)
}

func (config *Config) SaveOffLastChecked() error {
	config.mutex.Lock()
	defer config.mutex.Unlock()
	config.OffLastChecked = time.Now()
	output, err := json.Marshal(config)
	if err != nil {
		return err
	}
	return os.WriteFile(config.path, output, 0666)
}

func GetMD5Hash(data []byte) string {
	hash := md5.Sum(data)
	return hex.EncodeToString(hash[:])
}
