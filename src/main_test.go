package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/chatmail/rpc-client-go/v2/deltachat"
	"github.com/deltachat-bot/deltabot-cli-go/v2/botcli"
	"github.com/deltachat-bot/deltabot-cli-go/v2/xdcrpc"
)

type TestCallback func(bot *deltachat.Bot, botAcc uint32, userRpc *deltachat.Rpc, userAcc uint32)
type WebxdcCallback func(bot *deltachat.Bot, botAcc uint32, userRpc *deltachat.Rpc, userAcc uint32, msg *deltachat.Message)

var acfactory *deltachat.AcFactory

func TestMain(m *testing.M) {
	acfactory = &deltachat.AcFactory{Debug: os.Getenv("TEST_DEBUG") == "1"}
	acfactory.TearUp()
	defer acfactory.TearDown()
	m.Run()
}

func waitForDownload(rpc *deltachat.Rpc, accId uint32, msg deltachat.Message) deltachat.Message {
	var err error
	for msg.DownloadState != deltachat.DownloadStateDone {
		select {
		case <-time.After(20 * time.Second):
			panic("timeout waiting for message download")
		default:
			time.Sleep(50 * time.Millisecond)
		}
		msg, err = rpc.GetMessage(accId, msg.Id)
		if err != nil {
			panic(err)
		}
	}
	return msg
}

func withBotAndUser(callback TestCallback) {
	acfactory.WithOnlineBot(func(bot *deltachat.Bot, botAcc uint32) {
		acfactory.WithOnlineAccount(func(userRpc *deltachat.Rpc, userAcc uint32) {
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
	withBotAndUser(func(bot *deltachat.Bot, botAcc uint32, userRpc *deltachat.Rpc, userAcc uint32) {
		chatWithBot := acfactory.CreateChat(userRpc, userAcc, bot.Rpc, botAcc)

		_, err := userRpc.MiscSendTextMessage(userAcc, chatWithBot, "hi")
		if err != nil {
			panic(err)
		}

		msg := waitForDownload(userRpc, userAcc, acfactory.NextMsg(userRpc, userAcc))
		if msg.ViewType != deltachat.ViewtypeWebxdc {
			panic("unexpected view-type: " + msg.DownloadState)
		}

		callback(bot, botAcc, userRpc, userAcc, &msg)
	})
}

// Get the Payload contained in the status update with the given serial
func getTestPayload[T any](rpc *deltachat.Rpc, accId uint32, msgId uint32, serial uint32) T {
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
func getTestResponse[T any](rpc *deltachat.Rpc, accId uint32) T {
	ev := acfactory.WaitForEvent(rpc, accId, &deltachat.EventTypeWebxdcStatusUpdate{}).(*deltachat.EventTypeWebxdcStatusUpdate)
	return getTestPayload[T](rpc, accId, ev.MsgId, ev.StatusUpdateSerial)
}

// Send a status update with the given request.
// Automatically ignore the next EventWebxdcStatusUpdate from self
func sendTestRequest(rpc *deltachat.Rpc, accId uint32, msgId uint32, req xdcrpc.Request) {
	if err := xdcrpc.SendPayload(rpc, accId, msgId, req); err != nil {
		panic(err)
	}

	// ignore self-update
	ev := acfactory.WaitForEvent(rpc, accId, &deltachat.EventTypeWebxdcStatusUpdate{}).(*deltachat.EventTypeWebxdcStatusUpdate)
	resp := getTestPayload[xdcrpc.Request](rpc, accId, ev.MsgId, ev.StatusUpdateSerial)
	if resp.Id != req.Id {
		panic("Unexpected request Id: " + resp.Id)
	}
}
