package main

import (
	"io"
	"math"
	"net/http"
	"path/filepath"
	"strings"
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
}

func updateStatusLoop(rpc *deltachat.Rpc) {
	logger := cli.Logger.With("origin", "status-loop")
	delay := 10 * time.Minute
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
			delay = 10 * time.Minute
		}
		selfAddrs := getSelfAddrs(rpc)
		accId := getFirstAccount(rpc)
		for _, bot := range botsData.Bots {
			if accId == 0 {
				break
			}
			if _, ok := selfAddrs[bot.Addr]; ok {
				continue
			}
			logger := logger.With("acc", accId, "bot", bot.Addr)
			contactId, err := rpc.CreateContact(accId, bot.Addr, "")
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
				lastSeen := int(math.Round(time.Since(contact.LastSeen.Time).Hours()))
				if lastSeen >= 1 && lastSeen%2 != 0 {
					logger.Debug("skipping status check for offline bot")
					continue
				}
			}
			logger.Debug("checking bot status")
			if strings.HasPrefix(strings.ToLower(bot.Url), "openpgp4fpr:") {
				_, err := rpc.SecureJoin(accId, bot.Url)
				if err != nil {
					logger.Error(err)
				}
			} else {
				chatId, err := rpc.CreateChatByContactId(accId, contactId)
				if err != nil {
					logger.Error(err)
					continue
				}
				_, err = rpc.MiscSendTextMessage(accId, chatId, "/help")
				if err != nil {
					logger.Error(err)
				}
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
