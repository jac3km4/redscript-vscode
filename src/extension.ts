// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { execFile } from 'child_process';
import { Observable, fromEventPattern, from, merge, EMPTY, Observer, } from 'rxjs';
import { map, filter, groupBy, debounceTime, mergeAll, catchError, } from 'rxjs/operators';
import * as vscode from 'vscode';

interface LintMessage {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

export function activate(context: vscode.ExtensionContext) {
  startLinting(context);
}

// hacky regex to extract error messages
const REGEX =
  /Compilation error at ([\S]:?[^:]+):([0-9]+):([0-9]+):\n([\s\S]+?)(?=(Compilation error at |$))/g;

/**
 * Lint a document.
 *
 * @param document The document to lint
 * @return An observable with the result of linting
 */
const lintDocument = (document: vscode.TextDocument): Observable<LintMessage[]> => {
  const config = vscode.workspace.getConfiguration("redscript");
  const compilerPath: string | undefined = config.get("compilerPath");
  const scriptCachePath: string | undefined = config.get("scriptCachePath");
  if (compilerPath && scriptCachePath) {
    const sourcePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || document.fileName;

    return runInWorkspace([compilerPath, "lint", "-s", sourcePath, "-b", scriptCachePath])
      .pipe(map((stdout) => {
        let errors = [];
        for (const match of stdout.matchAll(REGEX)) {
          const [, file, line, column, message] = match;
          errors.push({ file, line: parseInt(line), column: parseInt(column), message });
        }
        return errors;
      }));
  } else {
    vscode.window.showErrorMessage("Redscript configuration missing, consult the README");
    return EMPTY;
  }
};

/**
 * Run a command in the current workspace.
 *
 * @param command The command to run.  The first element is the executable
 * @param stdin Optional text to write to standard input
 * @return An observable with standard output of the command
 */
const runInWorkspace =
  (command: ReadonlyArray<string>, stdin?: string): Observable<string> =>
    new Observable((observer: Observer<string>): void => {
      const cwd = vscode.workspace.rootPath || process.cwd();
      const child = execFile(command[0], command.slice(1), { cwd },
        (error, stdout) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(stdout);
            observer.complete();
          }
        });
      if (stdin) {
        child.stdin?.end(stdin);
      }
    });


/**
* Observe a vscode event.
*
* @param event The event to observe
* @return An observable which pushes every event
*/
const observeEvent = <T>(event: vscode.Event<T>): Observable<T> =>
  fromEventPattern(
    (handler) => event((d) => handler(d)),
    (_: any, subscription: vscode.Disposable) => subscription.dispose(),
    (d) => d as T,
  );

const startLinting = (context: vscode.ExtensionContext): void => {
  const diagnostics = vscode.languages.createDiagnosticCollection("redscript");
  context.subscriptions.push(diagnostics);

  const linting = merge(
    from(vscode.workspace.textDocuments),
    observeEvent(vscode.workspace.onDidOpenTextDocument),
    observeEvent(vscode.workspace.onDidSaveTextDocument),
    // observeEvent(vscode.workspace.onDidChangeTextDocument).pipe(map(({ document }) => document))
  ).pipe(filter((document) => document.uri.path.endsWith(".reds")))
    .pipe(groupBy((document) => document.uri))
    .pipe(debounceTime(200))
    .pipe(mergeAll())
    .pipe(map((document) => lintDocument(document)
      .pipe(catchError((err) => {
        // If an error occurs while linting show the error message,
        // delete past diagnostics for the document and continue with an
        // empty promise.
        vscode.window.showErrorMessage(err.toString());
        diagnostics.delete(document.uri);
        return EMPTY;
      })))
    ).pipe(mergeAll())
    .subscribe((messages) => {
      diagnostics.clear();

      let byFile: { [file: string]: vscode.Diagnostic[] } = {};
      for (const message of messages) {
        if (byFile[message.file]) {
          byFile[message.file].push(toDiagnostic(message));
        } else {
          byFile[message.file] = [toDiagnostic(message)];
        }
      }
      for (const [file, messages] of Object.entries(byFile)) {
        diagnostics.set(vscode.Uri.file(file), messages);
      }
    });

  context.subscriptions.push({ dispose: linting.unsubscribe });
  const cleanup = observeEvent(vscode.workspace.onDidCloseTextDocument)
    .subscribe((document) => diagnostics.delete(document.uri));

  context.subscriptions.push({ dispose: cleanup.unsubscribe });
}

const toDiagnostic = (lintMessage: LintMessage): vscode.Diagnostic => {
  // VSCode has zero-based positions, whereas hlint outputs 1-based line and
  // column numbers.  Hence adjust accordingly.
  const range = new vscode.Range(
    lintMessage.line - 1,
    lintMessage.column - 1,
    lintMessage.line - 1,
    lintMessage.column + 100);
  const message = lintMessage.message;
  const severity = vscode.DiagnosticSeverity.Error;
  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = "redscript";
  return diagnostic;
};
