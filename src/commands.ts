// Extensions commands

import { exec } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync, createWriteStream, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { log, showError, showInfo, getScriptDeploymentFolder, getGameExePath } from "./common";
import * as archiver from 'archiver';

export {
  deployFileCommand,
  undeployFileCommand,
  createZipCommand,
  newModCommand,
  openScriptsDirCommand,
  launchGameCommand
};

// esapes a string in quotes
function escape(str: string) {
  return "\"" + str + "\"";
}

// goes up to the active workspace folder containing the currently open file
// then down to the folder called "src"
function getSrcFolderSync(doc : vscode.TextDocument | undefined) {
  if (!doc) {
    return;
  }
  const uri = doc.uri;
  const wsfolder = vscode.workspace.getWorkspaceFolder(uri);
  if (wsfolder){
    const rootdir = wsfolder.uri.fsPath;
    const src = readdirSync(rootdir, { 'withFileTypes': true })
      .filter(file => file.isDirectory())
      .find(x => x.name == "src");
    if (src) {
      return path.join(rootdir, src.name);
    }
  }
}

// Copies the currently open file to the r6/scripts folder
function deployFileCommand() {
  log("Deploying file(s) ... ");

  const document = vscode.window.activeTextEditor?.document;
  const scriptsFolder = getScriptDeploymentFolder();
  const src = getSrcFolderSync(document);

  if (scriptsFolder) {
    if (src) {
      // copy everything in /src to r6/scripts 
      const args = "Copy-Item " + escape(src + path.sep + "*") + " -Destination " + escape(scriptsFolder) + " -Recurse -Force -Verbose";
      exec(args, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
        if (err) throw err;
        log(stdout);
        log(stderr);

        showInfo("Source file(s) deployed to: " + scriptsFolder);
      });
    }
    else {
      // deploy single file
      if (document) {
        const args = "Copy-Item " + escape(document.fileName) + " -Destination " + escape(scriptsFolder) + " -Force -Verbose";
        exec(args, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
          if (err) throw err;
          log(stdout);
          log(stderr);

          showInfo("File deployed to: " + scriptsFolder);
        });
      }
    }
  }
  else {
    showError("r6/scripts folder missing, consult the README");
  }
}

// Deletes a file with the same name as the currently open file from the r6/scripts folder
function undeployFileCommand() {
  log("Undeploying file(s) ... ");

  const document = vscode.window.activeTextEditor?.document;
  const scriptsFolder = getScriptDeploymentFolder();
  const src = getSrcFolderSync(document);

  if (scriptsFolder) {
    if (src) {
      // list all files in src
      const cwd = src || process.cwd();
      exec("dir -n -s -af", { 'shell': 'powershell.exe', 'cwd': cwd }, (err, stdout, stderr) => {
        if (err) throw err;
        log(stdout);
        log(stderr);
        const srcfiles = stdout
          .split("\r\n")
          .filter(x => { if (x) return x; });
        const fileList = srcfiles
          .map(x => escape(path.join(scriptsFolder, x)))
          .join(',');

        // delete all files from r6/scripts
        const cwd = scriptsFolder || process.cwd();
        const args = "Remove-Item " + fileList + " -Force -Verbose";
        log(args);
        exec(args, { 'shell': 'powershell.exe', 'cwd': cwd }, (err, stdout, stderr) => {
          if (err) throw err;
          log(stdout);
          log(stderr);

          showInfo("Source file(s) deleted from: " + scriptsFolder);
        });
      });
    }
    else {
      // undeploy single file
      if (document) {
        const destpath = path.join(scriptsFolder, path.basename(document.fileName));
        if (destpath && existsSync(destpath)) {
          const args = "Remove-Item " + escape(destpath) + " -Force -Verbose";
          exec(args, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
            if (err) throw err;
            log(stdout);
            log(stderr);

            showInfo("File deleted from: " + scriptsFolder);
          });
        }
      }
    }
  }
  else {
    showError("r6/scripts folder missing, consult the README");
  }
}

// Creates a zip archive from the currently open file root 
function createZipCommand() {
  log("Creating mod zip file ... ");

  const document = vscode.window.activeTextEditor?.document;
  const src = getSrcFolderSync(document);

  if (src) {
    const parentDir = path.dirname(src);
    const modname = path.basename(parentDir);
    const destPath = path.join(parentDir, modname + '.zip');

    const output = createWriteStream(destPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    output.on('close', function () {
      log(archive.pointer() + ' total bytes');
      log('archiver has been finalized and the output file descriptor has closed.');
    });
    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        showError(err.message);
      } else {
        throw err;
      }
    });
    archive.on('error', function (err) {
      throw err;
    });

    archive.pipe(output);
    const sourcedir = src + path.sep;
    archive.directory(sourcedir, 'r6/scripts');
    archive.finalize();
    showInfo("Zip file created at: " + destPath);
  }
  else {
    showError("No source files to zip");
  }
}

//Creates a new mod Folder in the current workspace 
function newModCommand() {
  log("Creating new mod ... ");

  const folders = vscode.workspace.workspaceFolders;
  if (folders) {
    const first = folders[0].uri.fsPath;
    if (first && existsSync(first)) {
      let newDir = path.join(first, "myMod", "src");

      if (existsSync(newDir)) {
        for (let step = 0; step < 10; step++) {
          newDir = path.join(first, "myMod_" + step.toString(), "src");
          if (!existsSync(newDir)) {
            break;
          }
          if (step > 9) {
            showError("Mod already exists");
            return;
          }
        }
      }

      mkdirSync(newDir, { recursive: true });

      // create empty file
      const newfile = path.join(newDir, "main.reds");
      writeFileSync(newfile, "");
      showInfo("Mod created");
    }
  }
  else {
    showError("Create a workspace to use this command");
  }
}

// opens r6/scripts in Explorer
function openScriptsDirCommand() {
  const scriptsFolder = getScriptDeploymentFolder();
  if (scriptsFolder) {
    const args = "ii " + escape(scriptsFolder);
    exec(args, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
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
    const args = "Start-Process -FilePath " + escape(exePath);
    exec(args, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
      log(stdout);
      log(stderr);

      showInfo("Starting the game ...");
    });
  }
}