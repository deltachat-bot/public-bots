package main

import (
	"testing"

	"github.com/chatmail/rpc-client-go/v2/deltachat"
	"github.com/deltachat-bot/deltabot-cli-go/v2/xdcrpc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOnNewMsg(t *testing.T) {
	withBotAndUser(func(bot *deltachat.Bot, botAcc uint32, userRpc *deltachat.Rpc, userAcc uint32) {
		chatWithBot := acfactory.CreateChat(userRpc, userAcc, bot.Rpc, botAcc)

		_, err := userRpc.MiscSendTextMessage(userAcc, chatWithBot, "hi")
		require.Nil(t, err)

		msg := waitForDownload(userRpc, userAcc, acfactory.NextMsg(userRpc, userAcc))
		require.Equal(t, deltachat.ViewtypeWebxdc, msg.ViewType)
	})
}

func TestWebxdc(t *testing.T) {
	withWebxdc(func(bot *deltachat.Bot, botAcc uint32, userRpc *deltachat.Rpc, userAcc uint32, msg *deltachat.Message) {
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
