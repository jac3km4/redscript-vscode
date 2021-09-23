// Common helper functions

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export {
  log,
  showInfo,
  showWarning,
  showError,
  getCompilerPath,
  getScriptBlobPath,
  getScriptDeploymentFolder,
  getGameExePath
};

const output = vscode.window.createOutputChannel("redscript");

// logs to custom output channels
function log(msg: string) {
  output.appendLine(msg);
}

// logs and displays an info message
function showInfo(msg: string) {
  vscode.window.showInformationMessage(msg);
  output.appendLine(msg);
}

// logs and displays an info message
function showWarning(msg: string) {
  vscode.window.showWarningMessage(msg);
  output.appendLine(`[WARN] ${msg}`);
}

// logs and displays an error message
function showError(msg: string) {
  vscode.window.showErrorMessage(msg);
  output.appendLine(`[ERROR] ${msg}`);
}

function getCompilerPath(): string | undefined {
  const config = vscode.workspace.getConfiguration("redscript");
  return config.get("compilerPath");
}

// returns the script cache path from either the user config or the default path from the base game directory
function getScriptBlobPath() {
  const config = vscode.workspace.getConfiguration("redscript");
  const scriptCachePath: string | undefined = config.get("scriptCachePath");
  const gameBaseDir: string | undefined = config.get("gameDir");

  if (scriptCachePath) {
    return scriptCachePath;
  } else if (gameBaseDir) {
    return path.join(gameBaseDir, "r6", "cache", "final.redscripts.bk");
  }
}

// returns the r6/scripts folder from the base game directory
function getScriptDeploymentFolder() {
  const config = vscode.workspace.getConfiguration("redscript");
  const gameBaseDir: string | undefined = config.get("gameDir");

  if (gameBaseDir) {
    const scriptsDir = path.join(gameBaseDir, "r6", "scripts");
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir);
    }
    return scriptsDir;
  }
}

// get game executable Path
function getGameExePath() {
  const config = vscode.workspace.getConfiguration("redscript");
  const gameBaseDir: string | undefined = config.get("gameDir");

  if (gameBaseDir) {
    const gameExePath = path.join(gameBaseDir, "bin", "x64", "Cyberpunk2077.exe");
    if (fs.existsSync(gameExePath)) {
      return gameExePath;
    }
  }
}
