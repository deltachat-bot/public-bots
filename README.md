# Delta Chat Public Bots

![Latest release](https://img.shields.io/github/v/tag/deltachat-bot/botfinder?label=release)
[![CI](https://github.com/deltachat-bot/botfinder/actions/workflows/ci.yml/badge.svg)](https://github.com/deltachat-bot/botfinder/actions/workflows/ci.yml)
![Coverage](https://img.shields.io/badge/Coverage-61.5%25-yellow)
[![Go Report Card](https://goreportcard.com/badge/github.com/deltachat-bot/botfinder)](https://goreportcard.com/report/github.com/deltachat-bot/botfinder)

Public bots discovery for Delta Chat via bot + WebXDC app.

To see the list of public Delta Chat bots on the web, visit:
https://deltachat-bot.github.io/public-bots/

If you are a bot administrator and want to add your bot instance to the list,
create an issue or clone this repo and edit [data.json](https://github.com/deltachat-bot/public-bots/blob/main/data.json)
file adding your bot metadata.


## Install

Binary releases can be found at: https://github.com/deltachat-bot/botfinder/releases

### Installing deltachat-rpc-server

This program depends on a standalone Delta Chat RPC server `deltachat-rpc-server` program that must be
available in your `PATH`. For installation instructions check:
https://github.com/deltachat/deltachat-core-rust/tree/master/deltachat-rpc-server

## Running the bot

Configure the bot:

```sh
botfinder init bot@example.com PASSWORD
```

Start listening to incoming messages:

```sh
botfinder serve
```

Run `botfinder --help` to see all available options.

## Contributing

Pull requests are welcome! check [CONTRIBUTING.md](https://github.com/deltachat-bot/botfinder/blob/master/CONTRIBUTING.md)
