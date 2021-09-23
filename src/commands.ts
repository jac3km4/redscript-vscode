// Extensions commands

import { execFile } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log, showError, showInfo, getScriptDeploymentFolder, getGameExePath, showWarning } from "./common";
import * as archiver from 'archiver';
import * as shell from "shelljs";

export {
  deployProjectCommand,
  undeployProjectCommand,
  createZipCommand,
  newModCommand,
  openScriptsDirCommand,
  launchGameCommand,
  deployAndLaunchGameCommand
};

// goes up to the active workspace folder containing the currently open file
// then down to the folder called "src"
function getSrcFolderSync(doc: vscode.TextDocument) {
  const wsDir = vscode.workspace.getWorkspaceFolder(doc.uri);
  const srcDir = wsDir && path.join(wsDir.uri.fsPath, "src");
  const doesDirExist = srcDir && fs.existsSync(srcDir);
  if (wsDir && !doesDirExist) {
    showWarning("This file is in a workspace without a 'src' directory - some commands may not work properly! Check the README for more information.");
  }

  return doesDirExist ? srcDir : undefined;
}

function getModDeploymentFolder(doc: vscode.TextDocument) {
  const wsDir = vscode.workspace.getWorkspaceFolder(doc.uri);
  const deployDir = getScriptDeploymentFolder();

  if (!deployDir) return;

  if (wsDir) {
    const modName = path.basename(wsDir.uri.fsPath);
    const target = path.join(deployDir, modName);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target);
    }
    return target;
  } else {
    return deployDir;
  }
}

// Copies the current project to the r6/scripts folder
function deployProjectCommand() {
  log("Deploying file(s) ... ");

  const document = vscode.window.activeTextEditor?.document;
  if (!document) {
    showError("No active document, nothing to deploy");
    return;
  }

  const deployDir = getModDeploymentFolder(document);
  if (!deployDir) {
    showError("Deployment directory not configured, consult the README");
    return;
  }

  const srcDir = getSrcFolderSync(document);
  const sources = srcDir ? path.join(srcDir, "*") : document.fileName;
  const output = shell.cp("-r", sources, deployDir);

  log(output.stdout);
  if (output.code == 0) {
    showInfo(`Source file(s) deployed to ${deployDir}`);
  } else {
    log(output.stderr);
    showError(`Copy failed with code ${output.code}`);
  }
}

// Deletes a file with the same name as the currently open file from the r6/scripts folder
function undeployProjectCommand() {
  log("Undeploying file(s) ... ");

  const document = vscode.window.activeTextEditor?.document;
  if (!document) {
    showError("No active document, nothing to undeploy");
    return;
  }

  const srcDir = getSrcFolderSync(document);
  const deployDir = getModDeploymentFolder(document);
  if (!deployDir) {
    showError("Deployment directory not configured, consult the README");
    return;
  }

  const undeployPath =
    srcDir
      ? deployDir
      : path.join(deployDir, path.basename(document.fileName))

  if (!fs.existsSync(undeployPath)) {
    showInfo("Nothing to undeploy");
    return;
  }
  const output = shell.rm("-rf", undeployPath)

  log(output.stdout);
  if (output.code == 0) {
    showInfo(`Source file(s) deleted from: ${undeployPath}`);
  } else {
    log(output.stderr);
    showError(`Undeploy failed with code ${output.code}`);
  }
}

// Creates a zip archive from the currently open file root 
function createZipCommand() {
  log("Creating mod zip file ... ");

  const document = vscode.window.activeTextEditor?.document;
  if (!document) {
    showError("No active document, nothing to zip");
    return;
  }

  const srcDir = getSrcFolderSync(document);

  const modName = srcDir ? path.basename(path.dirname(srcDir)) : path.basename(document.fileName, ".reds");
  const destDir = srcDir ? path.dirname(srcDir) : path.dirname(document.fileName);
  const destFile = path.join(destDir, `${modName}.zip`)

  const output = fs.createWriteStream(destFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    log(archive.pointer() + ' total bytes');
    log('archiver has been finalized and the output file descriptor has closed.');
  });
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      showError(err.message);
    } else {
      throw err;
    }
  });
  archive.on('error', (err) => { throw err; });

  archive.pipe(output);
  if (srcDir) {
    archive.directory(srcDir, `r6/scripts/${modName}`);
  } else {
    archive.file(document.fileName, { name: `r6/scripts/${path.basename(document.fileName)}` });
  }
  archive.finalize();
  showInfo("Zip file created at: " + destFile);
}

//Creates a new mod Folder in the current workspace 
async function newModCommand() {
  log("Creating new mod ... ");

  let modName = await vscode.window.showInputBox({ prompt: "Name of the mod" });
  if (!modName || modName.length == 0) {
    showError("Invalid name");
    return;
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    showError("Create a workspace to use this command");
    return;
  }

  const first = folders[0].uri.fsPath;
  if (first && fs.existsSync(first)) {
    let newDir = path.join(first, modName, "src");
    fs.mkdirSync(newDir, { recursive: true });

    // create empty file
    const newfile = path.join(newDir, "main.reds");
    fs.writeFileSync(newfile, "");
    showInfo("Mod created");
  }
}

// opens r6/scripts in Explorer
function openScriptsDirCommand() {
  const deployDir = getScriptDeploymentFolder();
  if (deployDir) {
    execFile("explorer", [deployDir], (err, stdout, stderr) => {
      if (err) throw err;
      log(stdout);
      log(stderr);
    });
  }
}

// launches bin/x64/Cyberpunk2077.exe
function launchGameCommand() {
  const exePath = getGameExePath();
  if (exePath) {
    showInfo("Starting the game ...");

    execFile(exePath, (err, stdout, stderr) => {
      if (err) throw err;
      log(stdout);
      log(stderr);
    });
  }
}


function deployAndLaunchGameCommand() {
  deployProjectCommand();
  launchGameCommand();
}
