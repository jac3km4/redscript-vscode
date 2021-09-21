// Extensions commands

import { exec } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync, copyFile, unlink, mkdirSync, writeFileSync } from 'fs';

import { log, showError, showInfo, getScriptDeploymentFolder, GetActiveTextDocument } from "./common";

export { 
  deployFileCommand, 
  undeployFileCommand,
  createZipCommand,
  newModCommand
 };

// Copies the currently open file to the r6/scripts folder
function deployFileCommand() {
  log("Deploying file... ");

  const scriptsFolder = getScriptDeploymentFolder();
  if (scriptsFolder){
    const document = GetActiveTextDocument();
    if (document){
      const destpath = path.join(scriptsFolder, path.basename(document));
      copyFile(document, destpath, (err) => {
        if (err) throw err;
        showInfo("File succesfully deployed to: " + destpath);
      });
    }
  }
  else{
    showError("Scripts path missing, consult the README");
  }
  
}
  
// Deletes a file with the same name as the currently open file from the r6/scripts folder
function undeployFileCommand() {
  log("Undeploying file... ");

  const scriptsFolder = getScriptDeploymentFolder();
  if (scriptsFolder){
    const document = GetActiveTextDocument();
    if (document){
      const destpath = path.join(scriptsFolder, path.basename(document));
      if (destpath && existsSync(destpath)){
        unlink(destpath, (err) => {
          if (err) throw err;
          showInfo("File succesfully deleted from: " + destpath);
        });
      }
      else{
        log("No file to delete");
      }
    }
  }
  else {
    showError("Scripts path missing, consult the README");
  }
}

// Creates a zip archive from the currently open file root 
function createZipCommand() {
  log("Creating mod zip file... ");

  const document = GetActiveTextDocument();
  if (document) {
    // check if parents are r6/scripts
    let parentDir = path.dirname(document);
    let basename = path.basename(parentDir);
    if (basename == "scripts")
    {
      parentDir = path.dirname(parentDir);
      basename = path.basename(parentDir);
      const r6dir = parentDir;
      if (basename == "r6")
      {
        parentDir = path.dirname(parentDir);
        const modname = path.basename(parentDir);
        const destPath = path.join(parentDir, modname + '.zip');

        const args = 'Compress-Archive -Path ' + r6dir + ' -DestinationPath ' + destPath + ' -Update';
        exec(args, {'shell':'powershell.exe'}, (err, stdout, stderr) => {
          if (err) throw err;
          log(stdout);
          log(stderr);

          showInfo("Zip file created at: " + destPath);
        });
        
      }
      else{
        showError("redscript files need to be nested like so: modname/r6/scripts/file.reds");
      }
    }
    else{
      showError("redscript files need to be nested like so: modname/r6/scripts/file.reds");
    }
  }
  else{
    showError("No such file exists: " + document);
  }
}

// Creates a new mod Folder in the current workspace 
function newModCommand() {
  log("Creating new mod... ");

  const folders = vscode.workspace.workspaceFolders;
  if (folders) {
    const first = folders[0].uri.fsPath;
    if (first && existsSync(first)) {
      let newDir = path.join(first, "myMod", "r6", "scripts");

      if (existsSync(newDir))
      {
        for (let step = 0; step < 10; step++) {
          newDir = path.join(first, "myMod_"+ step.toString(), "r6", "scripts");
          if (!existsSync(newDir)){
            break;
          }
          if (step > 9){
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
  else{
    showError("Create a workspace to use this command");
  }
}