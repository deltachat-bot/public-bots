//go:generate sh -c "cd ../frontend; npm install -g pnpm; pnpm i; pnpm build"
package main

import _ "embed"

//go:embed embed/app.xdc
var xdcContent []byte

//go:embed embed/version
var xdcVersion string
