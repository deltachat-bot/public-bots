#!/bin/env bash

# build frontend
go generate ./...

echo "Checking code with gofmt..."
OUTPUT=`gofmt -d src`
if [ -n "$OUTPUT" ]
then
    echo "$OUTPUT"
    exit 1
fi

echo "Checking code with golangci-lint..."
if ! command -v golangci-lint &> /dev/null
then
    echo "golangci-lint not found, installing..."
    # binary will be $(go env GOPATH)/bin/golangci-lint
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.55.2
fi
if ! golangci-lint run
then
    exit 1
fi

# Install test dependencies
if ! command -v deltachat-rpc-server &> /dev/null
then
    echo "deltachat-rpc-server not found, installing..."
    curl -L https://github.com/deltachat/deltachat-core-rust/releases/latest/download/deltachat-rpc-server-x86_64-linux --output deltachat-rpc-server
    chmod +x deltachat-rpc-server
    export PATH=`pwd`:"$PATH"
fi
if ! command -v courtney &> /dev/null
then
    echo "courtney not found, installing..."
    go install github.com/dave/courtney@master
fi

# run the tests
courtney -v -t="./..." ${TEST_EXTRA_TAGS:--t="-parallel=1"}
go tool cover -func=coverage.out -o=coverage-percent.out
