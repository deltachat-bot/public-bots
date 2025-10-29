package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/chatmail/rpc-client-go/deltachat"
	"github.com/chatmail/rpc-client-go/deltachat/xdcrpc"
	"github.com/deltachat-bot/deltabot-cli-go/botcli"
)

type TestCallback func(bot *deltachat.Bot, botAcc deltachat.AccountId, userRpc *deltachat.Rpc, userAcc deltachat.AccountId)
type WebxdcCallback func(bot *deltachat.Bot, botAcc deltachat.AccountId, userRpc *deltachat.Rpc, userAcc deltachat.AccountId, msg *deltachat.MsgSnapshot)

var acfactory *deltachat.AcFactory

func TestMain(m *testing.M) {
	acfactory = &deltachat.AcFactory{Debug: os.Getenv("TEST_DEBUG") == "1"}
	acfactory.TearUp()
	defer acfactory.TearDown()
	m.Run()
}

func withBotAndUser(callback TestCallback) {
	acfactory.WithOnlineBot(func(bot *deltachat.Bot, botAcc deltachat.AccountId) {
		acfactory.WithOnlineAccount(func(userRpc *deltachat.Rpc, userAcc deltachat.AccountId) {
			cli := &botcli.BotCli{AppDir: acfactory.MkdirTemp()}
			onBotInit(cli, bot, nil, nil)
			var err error
			cfg, err = newConfig(bot.Rpc, filepath.Join(cli.AppDir, "metadata.json"))
			if err != nil {
				panic(err)
			}
			go bot.Run() //nolint:errcheck
			callback(bot, botAcc, userRpc, userAcc)
		})
	})
}

// msg is the webxdc message received in the user side
func withWebxdc(callback WebxdcCallback) {
	withBotAndUser(func(bot *deltachat.Bot, botAcc deltachat.AccountId, userRpc *deltachat.Rpc, userAcc deltachat.AccountId) {
		chatWithBot := acfactory.CreateChat(userRpc, userAcc, bot.Rpc, botAcc)

		_, err := userRpc.MiscSendTextMessage(userAcc, chatWithBot, "hi")
		if err != nil {
			panic(err)
		}

		msg := acfactory.NextMsg(userRpc, userAcc)
		if msg.ViewType != deltachat.MsgWebxdc {
			panic("unexpected file: " + msg.File)
		}

		callback(bot, botAcc, userRpc, userAcc, msg)
	})
}

// Get the Payload contained in the status update with the given serial
func getTestPayload[T any](rpc *deltachat.Rpc, accId deltachat.AccountId, msgId deltachat.MsgId, serial uint) T {
	rawUpdate, err := xdcrpc.GetUpdate(rpc, accId, msgId, serial)
	if err != nil {
		panic(err)
	}
	var update xdcrpc.StatusUpdate[T]
	err = json.Unmarshal(rawUpdate, &update)
	if err != nil {
		panic(err)
	}
	return update.Payload
}

// Get bot response
func getTestResponse[T any](rpc *deltachat.Rpc, accId deltachat.AccountId) T {
	ev := acfactory.WaitForEvent(rpc, accId, deltachat.EventWebxdcStatusUpdate{}).(deltachat.EventWebxdcStatusUpdate)
	return getTestPayload[T](rpc, accId, ev.MsgId, ev.StatusUpdateSerial)
}

// Send a status update with the given request.
// Automatically ignore the next EventWebxdcStatusUpdate from self
func sendTestRequest(rpc *deltachat.Rpc, accId deltachat.AccountId, msgId deltachat.MsgId, req xdcrpc.Request) {
	if err := xdcrpc.SendPayload(rpc, accId, msgId, req); err != nil {
		panic(err)
	}

	// ignore self-update
	ev := acfactory.WaitForEvent(rpc, accId, deltachat.EventWebxdcStatusUpdate{}).(deltachat.EventWebxdcStatusUpdate)
	resp := getTestPayload[xdcrpc.Request](rpc, accId, ev.MsgId, ev.StatusUpdateSerial)
	if resp.Id != req.Id {
		panic("Unexpected request Id: " + resp.Id)
	}
}
