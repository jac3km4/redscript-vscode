// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { exec } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync, copyFile, unlink, mkdirSync, writeFileSync } from 'fs';

export { 
  DeployFileCommand, 
  UndeployFileCommand,
  CreateZipCommand,
  NewModCommand
 };

// helper functions
let output = vscode.window.createOutputChannel("redscript");

function ShowInfo(msg : string){
  vscode.window.showInformationMessage(msg);
  output.appendLine(msg);
}

function ShowError(msg : string){
  vscode.window.showErrorMessage(msg);
  output.appendLine("[ERROR] " + msg);
}

function GetScriptsFolder() {
  const config = vscode.workspace.getConfiguration("redscript");
  const gameBaseDir: string | undefined = config.get("gameDir");

  if (gameBaseDir)  {
      let scriptsDir = path.join(gameBaseDir, "r6", "scripts");
      if (existsSync(scriptsDir)) {
      return scriptsDir;
      }
  }

  ShowError("Redscript game path missing, consult the README");
  return "";
}

function GetActiveTextDocument() {
  let d = vscode.window.activeTextEditor?.document;
  if (d){

    // some dumb error handling because output channels are part of the activeTextEditors
    if (d.languageId == "Log")
    {
      ShowError("Run this command from a redscript file");
      return;
    }

    let document = d.fileName;
    if (existsSync(document)) {
      return document;
    }
    else{
      ShowError("No such file exists: " + document);
    }
  }
}

// commands

// Copies the currently open file to the r6/scripts folder
function DeployFileCommand() {
  output.appendLine("Deploying file... ");

  let scriptsFolder = GetScriptsFolder();
  if (!scriptsFolder){
    ShowError("Scripts path missing, consult the README");
  }
  
  let document = GetActiveTextDocument();
  if (document){
    let destpath = path.join(scriptsFolder, path.basename(document));
    copyFile(document, destpath, (err) => {
      if (err) throw err;
      ShowInfo("File succesfully deployed to: " + destpath);
    });
  }
}
  
// Deletes a file with the same name as the currently open file from the r6/scripts folder
function UndeployFileCommand() {
  output.appendLine("Undeploying file... ");

  let scriptsFolder = GetScriptsFolder();
  if (!scriptsFolder){
    ShowError("Scripts path missing, consult the README");
  }
  
  let document = GetActiveTextDocument();
  if (document){
    let destpath = path.join(scriptsFolder, path.basename(document));
    if (destpath && existsSync(destpath)){
      unlink(destpath, (err) => {
        if (err) throw err;
        ShowInfo("File succesfully deleted from: " + destpath)
      });
    }
    else{
      output.appendLine("No file to delete");
    }
  }
}

// Creates a zip archive from the currently open file root 
function CreateZipCommand() {
  output.appendLine("Creating mod zip file... ");

  let document = GetActiveTextDocument();
  if (document) {
    // check if parents are r6/scripts
    let parentDir = path.dirname(document);
    let basename = path.basename(parentDir);
    if (basename == "scripts")
    {
      parentDir = path.dirname(parentDir);
      basename = path.basename(parentDir);
      let r6dir = parentDir;
      if (basename == "r6")
      {
        parentDir = path.dirname(parentDir);
        let modname = path.basename(parentDir);
        let destPath = path.join(parentDir, modname + '.zip');

        let args = 'Compress-Archive -Path ' + r6dir + ' -DestinationPath ' + destPath + ' -Update';
        exec(args, {'shell':'powershell.exe'}, (err, stdout, stderr) => {
          if (err) throw err;
          output.appendLine(stdout);
          output.appendLine(stderr);

          ShowInfo("Zip file succesfully created at: " + destPath);
        })
        
      }
      else{
        ShowError("redscript files need to be under nested like so: modname/r6/scripts/file.reds");
      }
    }
    else{
      ShowError("redscript files need to be under nested like so: modname/r6/scripts/file.reds");
    }
  }
  else{
    ShowError("No such file exists: " + document);
  }
}

// Creates a new mod Folder in the current workspace 
function NewModCommand() {
  output.appendLine("Creating new mod... ");

  let folders = vscode.workspace.workspaceFolders;
  if (folders) {
    let first = folders[0].uri.fsPath;
    if (first && existsSync(first)) {
      let newDir = path.join(first, "myMod/r6/scripts");
      if (existsSync(newDir))
      {
        
      }
      else
      {
        let result = mkdirSync(newDir, { recursive: true });
        // create file
        //if (result)
        {
          let newfile = path.join(newDir, "main.reds");
          writeFileSync(newfile, "");
        }
      }
      
    }
  }

  ShowInfo("Mod created");
}