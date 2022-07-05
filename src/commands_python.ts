/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';

import { window, TextEditor } from "vscode";
import { camelCase, parsePythonSignature, snakeCase } from './python_tools';
import { editFileToAppend, executeCommand, expandAllSelectionsToWords, findSisterPath, getClassName, getFilePath, logInfo, runSnippet, waitFor } from './vs_tools';
import path = require('path');



/**
    A multi-select friendly command to toggle between CamelCase and snake_case.
    If any particular selection is empty (just a cursor), this will automatically expand it to the whole word first.
    (Kudos to https://stackoverflow.com/users/398630/brainslugs83 for some pointers)
*/
export function transformSnakeCamel(context: vscode.ExtensionContext) {
    const command = 'gruntwurk-python.transformSnakeCamel';

    const commandHandler = () => {
        const editor = window.activeTextEditor;
        if (!editor) { return; }
        let doc = editor.document;
        expandAllSelectionsToWords();
        doTransform(0);
        function doTransform(selectionIndex: number) {
            let sels = editor?.selections;
            if (selectionIndex < 0 || selectionIndex >= (sels ? sels?.length : 0)) { return; }
            if (sels) {
                let sel = sels[selectionIndex];
                let originalText = doc?.getText(sel);
                let modifiedText = originalText;
                if (originalText.toLowerCase() === originalText) {
                    modifiedText = camelCase(originalText);
                } else {
                    modifiedText = snakeCase(originalText);
                }
                editor?.edit(eb => { eb.replace(sel, modifiedText) }).then(x => {
                    doTransform(selectionIndex + 1);
                });
            }
        }
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}


/**
    Given a Python function signature, creates a corresponding unit test (pytest flavor).
    Assumes that the line under the cursor is the signature in question.
    (e.g. "def solve_puzzle(name: str, puzzle_type: str = 'suduko') -> str:")
*/
export async function pytestForFunction(context: vscode.ExtensionContext) {
    const command = 'gruntwurk-python.pytestForFunction';
    let snip: string[];
    let fullUnitTestFilename: string;
    const editor = window.activeTextEditor;
    if (typeof editor === "undefined") { return false; }

    async function commandHandler()
    {
        executeCommand("cursorHome")
        var className = await getClassName();
        // Even the waitfor inside getClassName() might not be enough if you only just opened the workspace moments ago.
        logInfo(`className = ${className}`);
        if (!className) { className = "UnknownClassName"; }
        let pathParts = path.parse(getFilePath());
        let codeFilename = pathParts.base;
        let codeModuleName = pathParts.name;
        let instanceName = snakeCase(className);
        let sigLine = editor?.document.lineAt(editor.selection.start.line).text;
        if (!sigLine) {return }
        let sigParts = parsePythonSignature(sigLine);
        let argNameList = sigParts.argumentNames.join(', ');
        let argTypes = sigParts.argumentTypes;
        let argDefaults = sigParts.argumentDefaults;
        let placeNumber = 0;
        for (let i = 0; i < argTypes.length; i++) {
            if (argDefaults[i] === "") {
                placeNumber++;
                argDefaults[i] = (argTypes[i] === "int") ? `\${${placeNumber}:arg${placeNumber}}` : `"\${${placeNumber}:arg${placeNumber}}"`;
            }
        }
        let argValList = argDefaults.join(', ');
        let sisPath = findSisterPath('tests'); // .replace(/^[A-Z]:/i, "");
        logInfo("sisPath = "+sisPath);
        fullUnitTestFilename = `${sisPath}\\test_${codeFilename}`;
        logInfo("Attempting to open: "+fullUnitTestFilename);
        editFileToAppend(fullUnitTestFilename);

        let imports = "from .." + codeModuleName + " import " + sigParts.functionName;
        let fixtureDeclaration = "";
        let testDeclaration = "def test_" + sigParts.functionName + "():";
        let initialization = "\t( " + argNameList + " ) = ( " + argValList + " )";
        let assertion = "\tassert " + sigParts.functionName + "(" + argNameList + ") === \"\${9:expectation}\"";

        if (sigParts.isClassMember) {
            imports = "import pytest\nfrom .." + codeModuleName + " import " + className;
            fixtureDeclaration = "\n@pytest.fixture\ndef " + instanceName + "():\n\treturn " + className + "()\n";
            testDeclaration = "def test_" + sigParts.functionName + "(" + instanceName + "):";
            assertion = "\tassert " + instanceName + "." + sigParts.functionName + "(" + argNameList + ") == \"\${9:expectation}\"";
        }

        snip = ["",
            imports,
            "",
            fixtureDeclaration,
            testDeclaration,
            initialization,
            assertion,
            ""];

        waitFor(testScriptIsOpen, doSnippet, doNothing);
    }
    function testScriptIsOpen(): boolean
    {
        let newEditor = window.activeTextEditor;
        let currentFilename = (newEditor?.document.fileName ?? "(no filename)");
        logInfo(currentFilename + " vs. " + fullUnitTestFilename);
        return (currentFilename === fullUnitTestFilename);
    }
    const doSnippet = () => {
        runSnippet(snip);
    }
    const doNothing = () => {
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}


/**
    Given a Python function signature, creates a corresponding call.
    Assumes that the line under the cursor is the signature in question.
    (e.g. "def solve_puzzle(name: str, puzzle_type: str = 'suduko') -> str:")
*/
export function callForFunction(context: vscode.ExtensionContext) {
    const command = 'gruntwurk-python.callForFunction';

    const commandHandler = () => {
        const editor = window.activeTextEditor;
        if (!editor) { return; }
        const doc = editor.document;
        let sigLine = doc.lineAt(editor.selection.start).text;
        let sigParts = parsePythonSignature(sigLine);
        executeCommand('cursorHome'); // FIXME this isn't happening
        let function_name = (sigParts.isClassMember ? 'self.' : '') + sigParts.functionName;
        let arg_name_list = sigParts.argumentNames.join(', ');
        // FIXME instead of running this as a snippet, maybe we just copy it to the clipboard?
        runSnippet([function_name + "(" + arg_name_list + ")"]);
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}
