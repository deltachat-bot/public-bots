package main

import (
	"testing"

	"github.com/deltachat/deltachat-rpc-client-go/deltachat"
	"github.com/deltachat/deltachat-rpc-client-go/deltachat/xdcrpc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOnNewMsg(t *testing.T) {
	withBotAndUser(func(bot *deltachat.Bot, botAcc deltachat.AccountId, userRpc *deltachat.Rpc, userAcc deltachat.AccountId) {
		chatWithBot := acfactory.CreateChat(userRpc, userAcc, bot.Rpc, botAcc)

		_, err := userRpc.MiscSendTextMessage(userAcc, chatWithBot, "hi")
		require.Nil(t, err)

		msg := acfactory.NextMsg(userRpc, userAcc)
		require.Equal(t, deltachat.MsgWebxdc, msg.ViewType)
	})
}

func TestWebxdc(t *testing.T) {
	withWebxdc(func(bot *deltachat.Bot, botAcc deltachat.AccountId, userRpc *deltachat.Rpc, userAcc deltachat.AccountId, msg *deltachat.MsgSnapshot) {
		req := xdcrpc.Request{Id: "req1", Method: "Sync", Params: []any{nil}}
		sendTestRequest(userRpc, userAcc, msg.Id, req)
		resp := getTestResponse[xdcrpc.Response](userRpc, userAcc)
		assert.Equal(t, req.Id, resp.Id)
		assert.Nil(t, resp.Error)
		assert.NotNil(t, resp.Result)
		res := resp.Result.([]any)
		assert.NotNil(t, res[0]) // sync time
		assert.Nil(t, res[1])    // BotsData is nil because there is no bot data yet
		assert.Nil(t, res[2])    // StatusData, also nil without BotsData
	})
}
