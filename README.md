# redscript-vscode
VS Code extension for [redscript](https://github.com/jac3km4/redscript). It provides basic error hints for compiler errors in your source code.

## usage
This extension requires two settings in user preferences:
```json
"redscript": {
    "compilerPath": "D:\\win\\bin\\redscript-cli.exe",
    "scriptCachePath": "D:\\path\\to\\r6\\cache\\final.redscripts.bk"
}
```
`compilerPath` should point to a compiler CLI executable.

`scriptCachePath` should point to a redscripts bundle.

You'll also need to configure VS Code to use `Swift` language mode when dealing with `reds` files. Language mode can be configured in the bottom-right corner of VS Code window (when a `reds` file is open).
