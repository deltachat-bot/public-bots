package main

import (
	"io"
	"net/http"
	"path/filepath"
	"time"

	"github.com/deltachat-bot/deltabot-cli-go/botcli"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat/option"
	"github.com/spf13/cobra"
)

var cli = botcli.New("public-bots")

func onBotInit(cli *botcli.BotCli, bot *deltachat.Bot, cmd *cobra.Command, args []string) {
	bot.OnUnhandledEvent(onEvent)
	bot.OnNewMsg(onNewMsg)

	accounts, err := bot.Rpc.GetAllAccountIds()
	if err != nil {
		cli.Logger.Error(err)
	}
	for _, accId := range accounts {
		name, err := bot.Rpc.GetConfig(accId, "displayname")
		if err != nil {
			cli.Logger.Error(err)
		}
		if name.UnwrapOr("") == "" {
			err = bot.Rpc.SetConfig(accId, "displayname", option.Some("Public Bots"))
			if err != nil {
				cli.Logger.Error(err)
			}
			err = bot.Rpc.SetConfig(accId, "delete_server_after", option.Some("1"))
			if err != nil {
				cli.Logger.Error(err)
			}
		}
	}
}

func onBotStart(cli *botcli.BotCli, bot *deltachat.Bot, cmd *cobra.Command, args []string) {
	var err error
	cfg, err = newConfig(bot.Rpc, filepath.Join(cli.AppDir, "metadata.json"))
	if err != nil {
		cli.Logger.Error(err)
	}
	go updateBotsLoop()
	go updateStatusLoop(bot.Rpc)
	go updateOfflineBotsStatusLoop(bot.Rpc)
}

func updateOfflineBotsStatusLoop(rpc *deltachat.Rpc) {
	logger := cli.Logger.With("origin", "off-bots-status-loop")
	delay := 120 * time.Minute
	for {
		toSleep := delay - time.Since(cfg.OffLastChecked)
		if toSleep > 0 {
			logger.Debugf("Sleeping for %v", toSleep)
			time.Sleep(toSleep)
		}
		if err := cfg.SaveOffLastChecked(); err != nil {
			cli.Logger.Error(err)
		}
		botsData := cfg.GetBotsData()
		selfAddrs := getSelfAddrs(rpc)
		accId := getFirstAccount(rpc)
		for _, bot := range botsData.Bots {
			if accId == 0 {
				break
			}
			botAddr := bot.Addr()
			if _, ok := selfAddrs[botAddr]; ok {
				continue
			}
			logger := logger.With("acc", accId, "bot", botAddr)
			contactId, err := rpc.CreateContact(accId, botAddr, "")
			if err != nil {
				logger.Error(err)
				continue
			}
			chatId, err := rpc.GetChatIdByContactId(accId, contactId)
			if err != nil {
				logger.Error(err)
				continue
			}
			if chatId == 0 {
				continue
			}
			contact, err := rpc.GetContact(accId, contactId)
			if err != nil {
				logger.Error(err)
				continue
			}
			if time.Since(contact.LastSeen.Time).Minutes() < 60 {
				// bot is not offline, it will be checked by the online-bots status loop
				continue
			}
			logger.Debug("checking bot status")
			if _, err := rpc.SecureJoin(accId, bot.Url); err != nil {
				logger.Error(err)
			}
		}
	}
}

func updateStatusLoop(rpc *deltachat.Rpc) {
	logger := cli.Logger.With("origin", "status-loop")
	delay := 30 * time.Minute
	for {
		toSleep := delay - time.Since(cfg.StatusLastChecked)
		if toSleep > 0 {
			logger.Debugf("Sleeping for %v", toSleep)
			time.Sleep(toSleep)
		}
		if err := cfg.SaveStatusLastChecked(); err != nil {
			cli.Logger.Error(err)
		}
		botsData := cfg.GetBotsData()
		if botsData.Hash == "" {
			delay = 10 * time.Second
		} else {
			delay = 30 * time.Minute
		}
		selfAddrs := getSelfAddrs(rpc)
		accId := getFirstAccount(rpc)
		for _, bot := range botsData.Bots {
			if accId == 0 {
				break
			}
			botAddr := bot.Addr()
			if _, ok := selfAddrs[botAddr]; ok {
				continue
			}
			logger := logger.With("acc", accId, "bot", botAddr)
			contactId, err := rpc.CreateContact(accId, botAddr, "")
			if err != nil {
				logger.Error(err)
				continue
			}
			chatId, err := rpc.GetChatIdByContactId(accId, contactId)
			if err != nil {
				logger.Error(err)
				continue
			}
			if chatId != 0 {
				contact, err := rpc.GetContact(accId, contactId)
				if err != nil {
					logger.Error(err)
					continue
				}
				if time.Since(contact.LastSeen.Time).Minutes() >= 60 {
					// offline bot, will be check by the offline-bots status loop
					continue
				}
			}
			logger.Debug("checking bot status")
			if _, err := rpc.SecureJoin(accId, bot.Url); err != nil {
				logger.Error(err)
			}
		}
	}
}

func updateBotsLoop() {
	url := "https://github.com/deltachat-bot/public-bots/raw/main/frontend/data.json"
	logger := cli.Logger.With("origin", "metadata-loop")
	for {
		toSleep := 3*time.Hour - time.Since(cfg.BotsData.lastChecked)
		if toSleep > 0 {
			logger.Debugf("Sleeping for %v", toSleep)
			time.Sleep(toSleep)
		}
		changed, err := getBotsData(url)
		if err != nil {
			logger.Error(err)
		} else if changed {
			logger.Debug("Metadata changed")
		} else {
			logger.Debug("Metadata have not changed")
		}
	}
}

func getBotsData(url string) (bool, error) {
	resp, err := http.Get(url)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}
	return cfg.SaveData(body)
}

func main() {
	cli.OnBotInit(onBotInit)
	cli.OnBotStart(onBotStart)
	if err := cli.Start(); err != nil {
		cli.Logger.Error(err)
	}
}
