# redscript-vscode
VS Code extension for [redscript](https://github.com/jac3km4/redscript). It provides basic error hints for compiler errors in your source code.

<img src="https://i.imgur.com/3mR6BjS.png"/>

## usage
This extension relies on some configuration options:
```json
"redscript.compilerPath": "D:\\win\\bin\\redscript-cli.exe",
"redscript.gameDir": "D:\\path\\to\\base\\game\\Cyberpunk 2077",
"redscript.scriptCachePath": "D:\\path\\to\\r6\\cache\\final.redscripts.bk"
```
- `compilerPath` should point to a compiler CLI executable. **(required)**
- `gameDir` should point to the base game folder (called Cyberpunk 2077). **(required)**
- `scriptCachePath` should point to an existing redscripts bundle, and will default to `$gameDir/r6/chache/final.redscripts.bk`

You also need to configure VS Code to use `Swift` language mode when dealing with `reds` files. Language mode can be configured in the bottom-right corner of VS Code window (when a `reds` file is open).

![settings](./_assets/settings.jpg)

## commands
This extension comes with commands that make development easier. Commands start with `redscript:` and can be exectuded from the [command palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) (default: `Ctrl+Shift+P`). 

It is recommended to work inside a [workspace](https://code.visualstudio.com/docs/editor/workspaces) for projects consisting of more than one file to fully make use of the extension.

When in a workspace, this extension expects to find redscript files with in a `src` folder:
```
ModName (workspace folder)
├── src
│   ├── file1.reds
│   ├── file2.reds
│   ├── someFolder
│   │   ├── file3.reds
│   │   ├── file4.reds
```


### command list

- **Deploy Mod**
  - in a workspace: copies all files from the `src` folder to `$gameDir/r6/scripts/$workspaceFolderName`
  - in individual file: copies your file to `$gameDir/r6/scripts/$fileName`
- **Undeploy Mod**
  - in a workspace: deletes the deployed mod from `$gameDir/r6/scripts/$workspaceFolderName`
  - in individual file: deletes the file at `$gameDir/r6/scripts/$fileName`
- **Zip current mod** (in a format compatible with Nexus)
  - in a workspace: creates a zip archive by adding files from the `src` directory under `r6/scripts/$workspaceFolderName` in the archive
  - in individual file: creates a zip archive with your file added under `r6/scripts`
- **Open game scripts folder**
  - opens the `$gameDir/r6/scripts` folder in Explorer
- **Launch Game**
  - launches the game
- **New redscript mod**
  - prompts for a mod name and creates a new folder with an empty redscript file in the current workspace

![settings](./_assets/commands.jpg)
