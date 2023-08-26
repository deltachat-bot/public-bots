package main

import (
	"strings"
	"testing"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat/xdcrpc"
	"github.com/stretchr/testify/assert"
)

func TestOnNewMsg(t *testing.T) {
	withBotAndUser(func(bot *deltachat.Bot, botAcc deltachat.AccountId, userRpc *deltachat.Rpc, userAcc deltachat.AccountId) {
		chatWithBot := acfactory.CreateChat(userRpc, userAcc, bot.Rpc, botAcc)

		_, err := userRpc.MiscSendTextMessage(userAcc, chatWithBot, "hi")
		assert.Nil(t, err)

		msg := acfactory.NextMsg(userRpc, userAcc)
		assert.True(t, strings.HasSuffix(msg.File, ".xdc"))
	})
}

func TestWebxdcInvalidRequest(t *testing.T) {
	withWebxdc(func(bot *deltachat.Bot, botAcc deltachat.AccountId, userRpc *deltachat.Rpc, userAcc deltachat.AccountId, msg *deltachat.MsgSnapshot) {
		req := xdcrpc.Request{Id: "req1", Method: "invalidMethod"}
		sendTestRequest(userRpc, userAcc, msg.Id, req)
		resp := getTestResponse[xdcrpc.Response](userRpc, userAcc)
		assert.Equal(t, req.Id, resp.Id)
		assert.Equal(t, xdcrpc.MethodNotFoud, resp.Error.Code)
	})
}
