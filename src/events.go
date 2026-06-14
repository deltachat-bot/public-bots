package main

import (
	"encoding/base64"
	"os"
	"path/filepath"

	"github.com/chatmail/rpc-client-go/v2/deltachat"
	"github.com/deltachat-bot/deltabot-cli-go/v2/xdcrpc"
)

func onEvent(bot *deltachat.Bot, accId uint32, event deltachat.EventType) {
	switch ev := event.(type) {
	case *deltachat.EventTypeWebxdcStatusUpdate:
		onStatusUpdate(bot.Rpc, accId, ev.MsgId, ev.StatusUpdateSerial)
	case *deltachat.EventTypeSecurejoinInviterProgress:
		if ev.Progress == 1000 {
			logger := cli.GetLogger(accId)
			logger.Debugf("QR scanned by contact with id=%v", ev.ContactId)
			chatId, err := bot.Rpc.CreateChatByContactId(accId, ev.ContactId)
			if err != nil {
				logger.Error(err)
				return
			}
			sendApp(bot.Rpc, accId, chatId)
		}
	}
}

// handle a webxdc status update
func onStatusUpdate(rpc *deltachat.Rpc, accId uint32, msgId uint32, serial uint32) {
	logger := cli.GetLogger(accId).With("msg", msgId, "origin", "webxdc")
	rawUpdate, err := xdcrpc.GetUpdate(rpc, accId, msgId, serial)
	if err != nil {
		logger.Error(err)
		return
	}
	msg, err := rpc.GetMessage(accId, msgId)
	if err != nil {
		logger.Error(err)
		return
	}
	logger = logger.With("chat", msg.ChatId)
	if msg.FromId != deltachat.ContactSelf {
		logger.Debugf("Ignoring request from unofficial instance: %v", string(rawUpdate))
		return
	}
	version, err := rpc.GetWebxdcBlob(accId, msgId, "version.txt")
	if err != nil {
		logger.Error(err)
	} else {
		data, err := base64.StdEncoding.WithPadding(base64.NoPadding).DecodeString(version)
		if err != nil {
			logger.With("version", version).Error(err)
		}
		version = string(data)
	}
	if version != xdcVersion {
		sendApp(rpc, accId, msg.ChatId)
		return
	}

	if xdcrpc.IsFromSelf(rawUpdate) {
		logger.Debugf("Response: %v", string(rawUpdate))
		return
	}

	logger.Debugf("Request: %v", string(rawUpdate))
	if response := xdcrpc.GetResponse(&API{}, rawUpdate); response != nil {
		err = xdcrpc.SendPayload(rpc, accId, msgId, response)
		if err != nil {
			logger.Error(err)
		}
	}
}

func onNewMsg(bot *deltachat.Bot, accId uint32, msgId uint32) {
	logger := cli.GetLogger(accId).With("msg", msgId)
	msg, err := bot.Rpc.GetMessage(accId, msgId)
	if err != nil {
		logger.Error(err)
		return
	}

	if !msg.IsBot && msg.FromId > deltachat.ContactLastSpecial && msg.Text != "" {
		chat, err := bot.Rpc.GetBasicChatInfo(accId, msg.ChatId)
		if err != nil {
			logger.Error(err)
			return
		}
		if chat.ChatType == deltachat.ChatTypeSingle {
			logger.Debugf("Got new 1:1 message: %#v", msg)
			err = bot.Rpc.MarkseenMsgs(accId, []uint32{msg.Id})
			if err != nil {
				logger.Error(err)
			}
			sendApp(bot.Rpc, accId, msg.ChatId)
		}
	}

	if msg.FromId > deltachat.ContactLastSpecial {
		err = bot.Rpc.DeleteMessages(accId, []uint32{msg.Id})
		if err != nil {
			logger.Error(err)
		}
	}
}

// send the app / UI interace
func sendApp(rpc *deltachat.Rpc, accId uint32, chatId uint32) {
	logger := cli.GetLogger(accId).With("chat", chatId)
	msgIds, err := rpc.GetChatMedia(accId, &chatId, deltachat.ViewtypeWebxdc, nil, nil)
	if err != nil {
		logger.Error(err)
		return
	}
	for _, msgId := range msgIds {
		msg, err := rpc.GetMessage(accId, msgId)
		if err != nil {
			logger.Error(err)
			continue
		}
		if msg.FromId == deltachat.ContactSelf {
			err = rpc.Transport.Call(rpc.Context, "delete_messages_for_all", accId, []uint32{msgId})
			if err != nil {
				logger.Error(err)
			}
		} else {
			err = rpc.DeleteMessages(accId, []uint32{msgId})
			if err != nil {
				logger.Error(err)
			}
		}
	}

	// send new instance

	dir, err := os.MkdirTemp("", "")
	if err != nil {
		logger.Error(err)
		return
	}
	defer func() {
		if err := os.RemoveAll(dir); err != nil {
			logger.Error(err)
		}
	}()

	xdcPath := filepath.Join(dir, "app.xdc")
	if err = os.WriteFile(xdcPath, xdcContent, 0666); err != nil {
		logger.Error(err)
		return
	}

	err = rpc.MiscSetDraft(accId, chatId, nil, &xdcPath, nil, nil, nil)
	if err != nil {
		logger.Error(err)
	}
	draft, err := rpc.GetDraft(accId, chatId)
	if err != nil {
		logger.Error(err)
	}

	if cfg.BotsData.Hash != "" {
		syncTime, botsData, statusData, _ := (&API{}).Sync("")
		response := &xdcrpc.Response{Result: []any{syncTime, botsData, statusData}}
		update := xdcrpc.StatusUpdate[*xdcrpc.Response]{Payload: response, Summary: "v" + xdcVersion}
		if err := xdcrpc.SendUpdate(rpc, accId, draft.Id, update, ""); err != nil {
			logger.Error(err)
		}
	}

	_, err = rpc.MiscSendDraft(accId, chatId)
	if err != nil {
		logger.Error(err)
	}
}
