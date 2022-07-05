/**
 * Utility functions for working with VS Code
 */

import * as vscode from 'vscode';
import * as fs from 'fs';

import { window } from "vscode";
import path = require("path");
import { matchAll, enquote } from './utils';
import { createInflate } from 'zlib';

//Create output channel
let logger_channel = vscode.window.createOutputChannel("gruntwurk");
logger_channel.show();
var verbose: boolean = true;


export function logInfo(msg: string) {
    if (verbose) {
        logger_channel.appendLine("INFO: " + msg);
        // console.log(msg);
    }
}

export function logError(msg: string) {
    logger_channel.appendLine("ERROR: " + msg);
}

/**
 * This tool will check each selection (if multi-select, or just the one if not).
 * If a selection is empty (just a cursor, i.e. start == end),
 * then that selection is expanded to the word under the cursor.
 */
export function expandAllSelectionsToWords() {
    const editor = window.activeTextEditor;
    if (!editor) { return }
    let sels = editor.selections;
    if (editor && sels) {
        for (let i = sels.length - 1; i >= 0; i--) {
            let sel = sels[i];
            if (sel.isEmpty) {
                let r = editor.document.getWordRangeAtPosition(sel.start);
                if (r) {
                    sels[i] = new vscode.Selection(r.start, r.end);
                }
            }
        }
    }
    editor.selections = sels;
}

function filterSymbols(symbols: vscode.DocumentSymbol[], symbolKind = vscode.SymbolKind.Variable): vscode.DocumentSymbol[] {
    var vars = symbols.filter(symbol => symbol.kind === symbolKind);
    return vars.concat(symbols.map(symbol => filterSymbols(symbol.children, symbolKind))
        .reduce((a, b) => a.concat(b), []));
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns the name of the first class symbol found in the document.
 * IMPORTANT: loadClassName() must have been called first with sufficient time to act.
 * TODO get it to check the range for the current position, and not settle on the first one.
 */
export async function getClassName(): Promise<string> {
    logInfo(`getClassName called.`);
    let className = "";
    var editor = vscode.window.activeTextEditor;
    if (!editor) { return ""; }
    let filepath = editor.document.uri;
    logInfo(`filepath = ${filepath}`);
    let result: boolean;
    let docSymbols: vscode.DocumentSymbol[] | undefined;
    let maxTries = 49;


    await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider', filepath)
        .then(symbols => { docSymbols = symbols; });
    let len = docSymbols?.length ?? 0;
    logInfo(`docSymbols.length = ${len}`);
    //     result = (len > 0);
    //     if (result) {
    //         logInfo(`docSymbols is populated.`);
    //     }
    //     return result;
    // };
    // let carryOn: () => void = function () {
    if (docSymbols) {
        let classes: vscode.DocumentSymbol[] = filterSymbols(docSymbols, vscode.SymbolKind.Class);
        logInfo(`classes.length = ${classes.length}.`);
        for (const variable of classes) {
            logInfo(`getClassName inner found: ${variable.name}`);
            className = variable.name;
            break;
        }

    }
    // }
    // let gaveUp: () => void = function () {
    // className = "Unknown Class";
    // logError(`getClassName() failed. Symbols not acquired after ${maxTries} tries.`);
    // };
    // waitFor(condition, carryOn, gaveUp, maxTries);
    // await while (!className) {
    //     sleep(200);
    // }
    return className;
}

/**
 * Just a shortcut for: window.activeTextEditor.document.uri.fsPath
 *
 * TIP: use path.parse to break it up:
 *     let fp = getFilePath();
 *     path.parse(fp).root
 *     path.parse(fp).dir (includes root)
 *     path.parse(fp).name
 *     path.parse(fp).ext (includes dot)
 *     path.parse(fp).base (name + .ext)
 *
 */
export function getFilePath(): string {
    const editor = window.activeTextEditor
    return editor?.document?.uri?.fsPath ?? "";
}

export function pathExists(filepath: string): boolean {
    return fs.existsSync(filepath);
}

export function findSisterPath(subFolder: string) {
    let fp = getFilePath();
    while (true) {
        let testPath = path.join(fp, subFolder);
        if (pathExists(testPath)) {
            return testPath;
        }
        fp = path.parse(fp).dir;
        if (path.parse(fp).root >= fp) {
            break;
        }
    }
    return "";
}

// /**
//  * Opens the named file (for append) and then immediately closes it.
//  * This creates the file if it doesn't exist, or touches the modified date if it does.
//  */
// touchFile(filepath: string) {
//     logInfo(`Touching: ${filepath}`);
//     fs.closeSync(fs.openSync(filepath, "a"));
// }


/**
 * Opens the named file in a new editor window and positions the cursor at the bottom.
 * For example, open a corresponding unit-test script in order to add a new test case at the end.
 * If the file does not already exist, it will be created.
 */
export function editFileToAppend(filepath: string) {
    let uri = vscode.Uri.file(filepath);
    let wse = new vscode.WorkspaceEdit();
    wse.createFile(uri, { ignoreIfExists: true });
    vscode.workspace.applyEdit(wse);
    // from({ authority: "", fragment: "", path: filepath, query: "", scheme: "untitled" });
    logInfo(`Opening editor for: ${uri}`);
    vscode.workspace.openTextDocument(uri)
        .then(doc => vscode.window.showTextDocument(doc))
        .then(ed => ed.revealRange(ed.visibleRanges[0]))
        .then(x => vscode.commands.executeCommand("cursorBottom"));
}


/*
    Returns the corresponding value for one of the "standard" editor values
    (e.g. as used by SublimeText snippets)
*/
export function standardVariable(varName: string) {
    const editor = window.activeTextEditor;
    if (!editor) {
        return ""
    }
    const doc = editor.document;

    switch (varName) {
        case "CLIPBOARD": {
            return vscode.env.clipboard.readText();
        }
        case "CURRENT_FILE_DIR": {
            return path.dirname(editor.document.uri.fsPath);
        }
        case "CURSOR_CHAR_NUMBER": {
            return editor.selection.start.character;
        }
        case "DOC_CURRENT_LINE": {
            return doc.lineAt(editor.selection.start).text;
        }
        case "DOC_ENTIRE_TEXT": {
            return doc.getText();
        }
        case "EOL_STYLE": {
            return (doc.eol == 1 ? 'LF' : 'CRLF');
        }
        case "LINE_COUNT": {
            return editor.document.lineCount;
        }
        case "MACHINE_ID": {
            return vscode.env.machineId; // The name of computer you are running on
        }
        case "MULTI_SELECT_COUNT": {
            return editor.selections.length;
        }
        case "PREFERED_LANGUAGE": {
            return vscode.env.language; // e.g. 'en-US'
        }
        case "SESSION_ID": {
            return vscode.env.sessionId; // A unique string that changes when VS Code restarts
        }
        case "SHELL_NAME": {
            return vscode.env.shell; // The name of the default terminal shell
        }
        case "TM_CURRENT_LINE": {
            return editor.document.lineAt(editor.selection.start);
        }
        case "TM_CURRENT_WORD": {
            return editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.start));
        }
        case "TM_DIRECTORY": {
            return vscode.workspace.rootPath;
        }
        case "TM_FILENAME": {
            return path.parse(editor.document.uri.fsPath).base;
        }
        case "TM_FILENAME_BASE": {
            return path.parse(editor.document.uri.fsPath).name;
        }
        case "TM_FILEPATH": {
            return editor.document.uri.fsPath;
        }
        case "TM_LINE_INDEX": {
            return editor.selection.start.line;
        }
        case "TM_LINE_NUMBER": {
            return editor.selection.start.line + 1;
        }
        case "TM_SELECTED_TEXT": {
            return editor.document.getText(editor.selection);
        }
        case "TODAY": {
            return new Date().toDateString();
        }
        case "WORKSPACE_NAME": {
            return vscode.workspace.name;
        }
    }
}

/**
 * shortcut for vscode.commands.executeCommand(command)
 */
export function executeCommand(commandName: string, commandArgs: string[] = []) {
    try {
        if (commandArgs) {
            vscode.commands.executeCommand(commandName, ...commandArgs);
        } else {
            vscode.commands.executeCommand(commandName);
        }
    } catch (e) {
        logError(`ERROR in command: ${commandName}: ${e}`);
    }
}

export function runSnippet(snip: string[]) {
    let ss = new vscode.SnippetString(snip.join("\n"));
    vscode.window.activeTextEditor?.insertSnippet(ss);
}


/*
    Invokes a pre-defined snippet by its prefix.
*/
export function invokeNamedSnippet(snippetName: string[]): void {
    executeCommand("type", snippetName);
    executeCommand("insertSnippet");
}

/**
 * waitFor -- waits for the expression contained in the given string to become
 * true, pausing 50ms between each test. Tries 50 times. (It logs an error on
 * timeout, but otherwise carries on.)
 */
/**
 * doWaitFor -- waits for a condition to become true, pausing 50ms between each test
 *      cond: either a callback function that returns a boolean or a string of
 *          JavaScript code that evaluates to a boolean
 *      carryOn: a callback function to call if/when the condition is met
 *      gaveUp: a callback function to call if maxTries is exceeded
 *      maxTries: the number of times to loop before giving up (default = 10)
 */
export function waitFor(cond: string | (() => boolean), carryOn: () => void, gaveUp: () => void, maxTries = 10) {
    var id: NodeJS.Timeout;
    var count = 0;
    let condition: () => boolean
    if (typeof cond === "string") {
        logInfo("Waiting for: " + cond);
        condition = (): boolean => eval(cond);
    } else {
        condition = cond;
    }
    const upon = () => {
        if (condition()) {
            logInfo(`Condition met after ${count} tries. Carrying on...`);
            clearInterval(id);
            carryOn();
        } else if (count++ > maxTries) {
            logInfo(`Condition failed after ${count} tries.`);
            clearInterval(id);
            gaveUp();
        }
    };
    id = setInterval(upon, 50);
}
