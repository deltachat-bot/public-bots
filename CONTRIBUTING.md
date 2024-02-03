## Contributing

### Requirements

You need to have installed:
- [go](https://go.dev/doc/install)
- [nodeJS](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)
- [deltachat-rpc-server](https://github.com/deltachat/deltachat-core-rust/tree/master/deltachat-rpc-server)
- [docker](https://docs.docker.com/get-docker/) (for the local fake email server for testing)
- [GoReleaser](https://goreleaser.com/install/) (optional, for local releases)

### Building the frontend

To generate the frontend (WebXDC app) that is shipped/embedded inside the bot:

```
go generate ./...
```

For development instructions of the frontend check [frontend/README.md](./frontend/README.md)

### Automated testing

You need to have a local fake email server running. The easiest way to do that is with Docker:

```
$ docker pull ghcr.io/deltachat/mail-server-tester:release
$ docker run -it --rm -p 3025:25 -p 3110:110 -p 3143:143 -p 3465:465 -p 3993:993 ghcr.io/deltachat/mail-server-tester
```

To run the automated tests run the script `./scripts/run_tests.sh`

### Manual testing

After building the frontend, to build and run the bot, execute in the project root folder:

```
go run ./...
```

### Building from source

Execute in the project root folder:

```
goreleaser build --snapshot --clean --single-target
```

The output binary will be in the `dist/` folder

### Releasing

To automatically build and create a new GitHub release:

```
git tag v1.0.1
git push origin v1.0.1
```

To create releases locally:

```
goreleaser release --snapshot --clean
```
