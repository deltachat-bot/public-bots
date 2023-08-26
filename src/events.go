package main

import (
	"os"
	"path/filepath"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat/option"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat/xdcrpc"
)

func onEvent(bot *deltachat.Bot, accId deltachat.AccountId, event deltachat.Event) {
	switch ev := event.(type) {
	case deltachat.EventWebxdcStatusUpdate:
		onStatusUpdate(bot.Rpc, accId, ev.MsgId, ev.StatusUpdateSerial)
	case deltachat.EventSecurejoinInviterProgress:
		if ev.Progress == 1000 {
			cli.GetLogger(accId).Debugf("QR scanned by contact with id=%v", ev.ContactId)
			chatId, err := bot.Rpc.CreateChatByContactId(accId, ev.ContactId)
			if err != nil {
				cli.GetLogger(accId).Error(err)
				return
			}
			sendApp(bot, accId, chatId)
		}
	}
}

// handle a webxdc status update
func onStatusUpdate(rpc *deltachat.Rpc, accId deltachat.AccountId, msgId deltachat.MsgId, serial uint) {
	rawUpdate, err := xdcrpc.GetUpdate(rpc, accId, msgId, serial)
	if err != nil {
		cli.GetLogger(accId).Error(err)
		return
	}
	msg, err := rpc.GetMessage(accId, msgId)
	if err != nil {
		cli.GetLogger(accId).Error(err)
		return
	}
	chat, err := rpc.GetBasicChatInfo(accId, msg.ChatId)
	if err != nil {
		cli.GetLogger(accId).Error(err)
		return
	}
	if chat.ChatType != deltachat.ChatSingle {
		cli.GetLogger(accId).Debugf("[WebXDC] Ignoring request in multi-user chat #%v: %v", chat.Id, string(rawUpdate))
		return
	}

	if xdcrpc.IsFromSelf(rawUpdate) {
		cli.GetLogger(accId).Debugf("[WebXDC] Response: %v", string(rawUpdate))
		return
	}

	cli.GetLogger(accId).Debugf("[WebXDC] Request: %v", string(rawUpdate))
	api := &API{}
	if response := xdcrpc.GetResponse(api, rawUpdate); response != nil {
		err = xdcrpc.SendPayload(rpc, accId, msgId, response)
		if err != nil {
			cli.GetLogger(accId).Error(err)
		}
	}
}

func onNewMsg(bot *deltachat.Bot, accId deltachat.AccountId, msgId deltachat.MsgId) {
	msg, err := bot.Rpc.GetMessage(accId, msgId)
	if err != nil {
		cli.GetLogger(accId).Error(err)
		return
	}

	if !msg.IsBot && msg.FromId > deltachat.ContactLastSpecial && msg.Text != "" {
		chat, err := bot.Rpc.GetBasicChatInfo(accId, msg.ChatId)
		if err != nil {
			cli.GetLogger(accId).Error(err)
			return
		}
		if chat.ChatType == deltachat.ChatSingle {
			cli.GetLogger(accId).Debugf("Got new 1:1 message: %#v", msg)
			sendApp(bot, accId, msg.ChatId)
		}
	}

	if msg.FromId > deltachat.ContactLastSpecial {
		err = bot.Rpc.DeleteMessages(accId, []deltachat.MsgId{msg.Id})
		if err != nil {
			cli.GetLogger(accId).Error(err)
		}
	}
}

// send the app / UI interace
func sendApp(bot *deltachat.Bot, accId deltachat.AccountId, chatId deltachat.ChatId) {
	// try to resend existing instance
	none := option.None[deltachat.MsgType]()
	msgIds, err := bot.Rpc.GetChatMedia(accId, chatId, deltachat.MsgWebxdc, none, none)
	if err != nil {
		cli.GetLogger(accId).Error(err)
		return
	}
	for i := len(msgIds) - 1; i >= 0; i-- {
		msgId := msgIds[i]
		msg, err := bot.Rpc.GetMessage(accId, msgId)
		if err != nil {
			cli.GetLogger(accId).Error(err)
			continue
		}
		if msg.FromId == deltachat.ContactSelf {
			err = bot.Rpc.ResendMessages(accId, []deltachat.MsgId{msgId})
			if err != nil {
				cli.GetLogger(accId).Error(err)
				break
			}
			return
		} else {
			err = bot.Rpc.DeleteMessages(accId, []deltachat.MsgId{msgId})
			if err != nil {
				cli.GetLogger(accId).Error(err)
			}
		}
	}

	// no previous instance exists, send app

	dir, err := os.MkdirTemp("", "")
	if err != nil {
		cli.GetLogger(accId).Error(err)
		return
	}
	defer os.RemoveAll(dir)

	xdcPath := filepath.Join(dir, "app.xdc")
	if err = os.WriteFile(xdcPath, xdcContent, 0666); err != nil {
		cli.GetLogger(accId).Error(err)
		return
	}

	_, err = bot.Rpc.SendMsg(accId, chatId, deltachat.MsgData{File: xdcPath})
	if err != nil {
		cli.GetLogger(accId).Error(err)
	}
}
