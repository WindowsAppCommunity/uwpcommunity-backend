import { Response, Request } from "express";
import { Status, BuildResponse } from "./responseHelper";

/**
 * @summary Get the first matching regex group, instead of an array with the full string and all matches
 * @param {string} toMatch  
 * @param {regex} regex 
 * @returns {string} First matching regex group
 */
export function match(toMatch: string, regex: RegExp) {
    let m = regex.exec(toMatch);
    return (m && m[1]) ? m[1] : undefined;
}

export function replaceAll(text: string, target: string, replacement: string) {
    return text.split(target).join(replacement);
};

export function remove(text: string, target: string) {
    return text.split(target).join("");
};

/***
 * @summary Compute the edit distance between two given strings
 * @see https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#JavaScript
 */
export function levenshteinDistance(a: string, b: string) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    var matrix = [];
    var i;
    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    var j;
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1)); // deletion
            }
        }
    }

    return matrix[b.length][a.length];
};

export function genericServerError(err: any, res: Response) {
    console.error(err);
    BuildResponse(res, Status.InternalServerError, `Internal server error: ${err}`);
}

/** @summary Checks that the authentication header contains a valid auth token */
export function validateAuthenticationHeader(req: Request, res: Response): string | undefined {
    if (!req.headers.authorization) {
        BuildResponse(res, Status.MalformedRequest, "Missing authorization header", "Malformed request"); 
        return;
    }
    return req.headers.authorization.replace("Bearer ", "");
}

export const DEVENV: boolean = process.argv.filter(val => val == 'dev').length > 0;
