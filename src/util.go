package main

import (
	"github.com/chatmail/rpc-client-go/v2/deltachat"
)

func getFirstAccount(rpc *deltachat.Rpc) uint32 {
	var accId uint32
	accounts, _ := rpc.GetAllAccountIds()
	if len(accounts) > 0 {
		accId = accounts[0]
	}
	return accId
}

func getSelfAddrs(rpc *deltachat.Rpc) map[string]uint32 {
	selfAddrs := make(map[string]uint32)
	accounts, _ := rpc.GetAllAccountIds()
	for _, accId := range accounts {
		relays, _ := rpc.ListTransports(accId)
		for _, relay := range relays {
			selfAddrs[relay.Addr] = accId
		}
	}
	return selfAddrs
}
