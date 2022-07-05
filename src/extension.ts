/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';

import { window } from "vscode";
import { camelCase, parsePythonSignature, snakeCase } from './python_tools';
import { logError, logInfo, waitFor, editFileToAppend, executeCommand, expandAllSelectionsToWords, findSisterPath, getClassName, getFilePath, runSnippet } from './vs_tools';
import path = require('path');
import { listCurrentCommands, unMultiSelectLast } from './commands_general';
import { callForFunction, pytestForFunction, transformSnakeCamel } from './commands_python';

let gruntwurkPythonConfig: vscode.WorkspaceConfiguration;
// let nonMacroAttributes = ["has", "get", "update", "inspect"];

export function activate(context: vscode.ExtensionContext) {
    listCurrentCommands(context);
    unMultiSelectLast(context);
    transformSnakeCamel(context);
    pytestForFunction(context);
    callForFunction(context);

    // vscode.workspace.onDidChangeConfiguration(() => {
    // });
}

// export function deactivate() { }



