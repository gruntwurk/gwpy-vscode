import { matchAll } from "./utils";
import { logInfo } from "./vs_tools";

/**
 * Utility code that is related to Python (but nothing to do with VS Code).

/**
 * Converts CamelCase or javaCase to snake_case (all lower with underscores).
 */
export function snakeCase(identifier: string) {
    let words = matchAll(identifier, "([a-z]+|[A-Z][a-z]*|[^A-Za-z]+)");
    let lowerWords = [];
    for (const word of words) {
        lowerWords.push(word.toLowerCase());
    };
    return lowerWords.join("_");
};

/**
 * Converts snake_case to CamelCase.
 */
export function camelCase(identifier: string) {
    let words = identifier.split('_');
    let camelWords = words.map(function (w) {
        return w[0].toUpperCase() + w.slice(1,).toLowerCase();
    });
    return camelWords.join('');
};

/**
 * Converts snake_case to javaCase (same as CamelCase but with a leading lowercase).
 */
export function javaCase(identifier: string) {
    let words = identifier.split('_');
    let camelWords = words.map(function (w) {
        return w[0].toUpperCase() + w.slice(1,).toLowerCase();
    });
    camelWords[0] = camelWords[0].toLowerCase();
    return camelWords.join('');
};

/**
 * Parses the Python class or function signature that's under the cursor (anywhere on the line).
 * Returns an object with the following attributes:
 *     isClass: true if the line in question is a class signature
 *     className: the class name (if a class signature, otherwise...)
 *     functionName: the function name,
 *     argumentCount: the number of argument definitions
 *     argumentNames: a list of the argument names, in order
 *     argumentTypes: a list of the argument types (hints), in order
 *     argumentDefaults: a list of the argument defaults, in order
 *     isClassMember: if the first argument is "self", then this flag is set and that argument is skipped.
 * If an argument has no type hint, then it will be an empty string.
 * Likewise, if no default value.
 */
export function parsePythonSignature(pythonCodeLine: string): any {
    const classSignaturePattern = /^\s*(class\s+)(\w+)(\(\w+\))?:/g;
    const functionSignaturePattern = /^\s*(def\s+)(\w+)\(([^)]*)\)([^:]*):/g;
    const argumentPattern = /([^:=,]+)(:([^=,]+))?(=([^,]+))?(,|$)/g;
    logInfo(`Parsing: ${pythonCodeLine}`);
    const cMatches = pythonCodeLine.matchAll(classSignaturePattern);
    const fMatches = pythonCodeLine.matchAll(functionSignaturePattern);
    let result = {};
    for (const cMatch of cMatches) {
        let className = cMatch[2].trim();
        result = {
            className: className,
            isClass: true
        };
    }
    for (const fMatch of fMatches) {
        let functionName = fMatch[2].trim();
        let argNames = [];
        let argTypes = [];
        let argDefaults = [];
        let isClassMember = false;
        const aMatches = fMatch[3].matchAll(argumentPattern);
        for (const aMatch of aMatches) {
            let argName = aMatch[1].trim();
            let argType = "";
            if (aMatch[3]) {
                argType = aMatch[3].trim();
            }
            let argDefault = "";
            if (aMatch[5]) {
                argDefault = aMatch[5].trim();
            }
            // FIXME For some strange reason, if the val is enclosed in single-quotes, then it comes back undefined, but if it's in double-quotes, it's fine.
            if (argName === "self") {
                isClassMember = true;
            } else {
                argNames.push(argName);
                argTypes.push(argType);
                argDefaults.push(argDefault);
            }
        }
        result = {
            functionName: functionName,
            argumentCount: argNames.length,
            argumentNames: argNames,
            argumentTypes: argTypes,
            argumentDefaults: argDefaults,
            isClassMember: isClassMember,
            isClass: false
        };
    }
    logInfo(`${result}`);
    return result;
}
