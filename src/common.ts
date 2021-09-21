// Common helper functions

import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';

export {
  log,
  showInfo,
  showError,
  getActiveTextDocument as GetActiveTextDocument,
  getScriptBlobPath,
  getScriptDeploymentFolder
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

// logs and displays an error message
function showError(msg: string) {
  vscode.window.showErrorMessage(msg);
  output.appendLine("[ERROR] " + msg);
}

// returns the active text document
function getActiveTextDocument() {
  const d = vscode.window.activeTextEditor?.document;
  if (d) {

    // some dumb error handling because output channels are part of the activeTextEditors
    if (d.languageId == "Log") {
      showError("Run this command from a redscript file");
      return;
    }

    const document = d.fileName;
    if (existsSync(document)) {
      return document;
    }
    else {
      showError("No such file exists: " + document);
    }
  }
}

// returns the script cache path from either the user config or the default path from the base game directory
function getScriptBlobPath() {
  const config = vscode.workspace.getConfiguration("redscript");
  const scriptCachePath: string | undefined = config.get("scriptCachePath");
  const gameBaseDir: string | undefined = config.get("gameDir");
  const inferredCachePath = scriptCachePath || `${gameBaseDir}/r6/cache/final.redscripts.bak`;
  return inferredCachePath;
}

// returns the r6/scripts folder from the base game directory
function getScriptDeploymentFolder() {
  const config = vscode.workspace.getConfiguration("redscript");
  const gameBaseDir: string | undefined = config.get("gameDir");

  if (gameBaseDir) {
    const scriptsDir = path.join(gameBaseDir, "r6", "scripts");
    if (existsSync(scriptsDir)) {
      return scriptsDir;
    }
  }
}