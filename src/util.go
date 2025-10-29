package main

import (
	"github.com/chatmail/rpc-client-go/deltachat"
)

func getFirstAccount(rpc *deltachat.Rpc) deltachat.AccountId {
	var accId deltachat.AccountId
	accounts, _ := rpc.GetAllAccountIds()
	if len(accounts) > 0 {
		accId = accounts[0]
	}
	return accId
}

func getSelfAddrs(rpc *deltachat.Rpc) map[string]deltachat.AccountId {
	selfAddrs := make(map[string]deltachat.AccountId)
	accounts, _ := rpc.GetAllAccountIds()
	for _, accId := range accounts {
		addr, _ := cli.GetAddress(rpc, accId)
		selfAddrs[addr] = accId
	}
	return selfAddrs
}
