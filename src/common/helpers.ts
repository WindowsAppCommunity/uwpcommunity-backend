import Project from "../models/Project";

/**
 * @summary Get the first matching regex group, instead of an array with the full string and all matches
 * @param {string} toMatch  
 * @param {regex} regex 
 * @returns {string} First matching regex group
 */
function match(toMatch: string, regex: RegExp) {
    let m = regex.exec(toMatch);
    return (m && m[1]) ? m[1] : undefined;
}

function replaceAll(text: string, target: string, replacement: string) {
    return text.split(target).join(replacement);
};

function remove(text: string, target: string) {
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


export interface ISimilarProjectMatch {
    distance: number;
    appName: string;
}

/**
 * @summary Looks through a list of projects to find the closest matching app name
 * @param projects Array of projects to look through 
 * @param appName App name to match against
 * @returns Closest suitable match if found, otherwise undefined
 */
export function findSimilarProjectName(projects: Project[], appName: string): string | undefined {
    let matches: ISimilarProjectMatch[] = [];

    // Calculate and store the distances of each possible match
    for (let project of projects) {
        matches.push({ distance: levenshteinDistance(project.appName, appName), appName: project.appName });
    }

    // Sort by closest match 
    matches = matches.sort((first, second) => second.distance - first.distance);

    // If the difference is less than X characters, return a possible match.
    if (matches[0].distance <= 7) return matches[0].appName; // 7 characters is just enough for a " (Beta)" label

    // If the difference is greater than 1/3 of the entire string, don't return as a similar app name
    if ((appName.length / 3) < matches[0].distance) return;

    return matches[0].appName;
}

module.exports = {
    match, replaceAll, remove, levenshteinDistance, findSimilarProjectName
};