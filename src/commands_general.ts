/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';

import { window } from "vscode";
import { camelCase, snakeCase } from './python_tools';
import { executeCommand, expandAllSelectionsToWords } from './vs_tools';
import path = require('path');


/**
    This fetches a list of all registered commands that do not take any arguments
    (which means they can be assigned keyboard shortcuts.)
    The list is inserted in to a new file that you can edit/save.
*/
export function listCurrentCommands(context: vscode.ExtensionContext) {
    const command = 'gruntwurk-python.listCurrentCommands';

    const commandHandler = () => {
        executeCommand("workbench.action.files.newUntitledFile")
        // Since getCommands() only returns a Promise for a string[], we have to use the then()
        // method to register a callback function which will be called once the promise is fullfilled.
        const SUPPRESS_INTERNAL = true;
        const editor = window.activeTextEditor;
        if (!editor) { return; }
        vscode.commands.getCommands(SUPPRESS_INTERNAL).then(resolvedvalue => {
            var fullText = resolvedvalue.join('\n');

            var cursorPos = editor.selection.start;
            editor.edit(eb => {
                eb.insert(cursorPos,
                    '= VS Code Commands\n\nThe following are all of the VS Code commands that do not take any\narguments (which means they can be assigned keyboard shortcuts.)\n\n' +
                    'NOTE: See also https://code.visualstudio.com/api/references/commands\nfor the commands that do take arguments.\n\n' +
                    fullText)
            });
        });
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}

/**
    For when you Ctrl-Click to multiselect 10 times and on the eleventh get it wrong.
    Just press Ctrl-0 (or whatever key you assign) to unselect the eleventh, then carry on.
    (See also, https://github.com/danseethaler/vscode-tab-through-selections, for more along this line.)
*/
export function unMultiSelectLast(context: vscode.ExtensionContext) {
    const command = 'gruntwurk-python.unMultiSelectLast';

    const commandHandler = () => {
        const editor = window.activeTextEditor;
        if (!editor) { return; }
        const newSelections = editor.selections.slice(0, editor.selections.length - 1);
        editor.selections = newSelections;
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}
