const pathsToClean = ["./build"];
const fs = require('fs-extra')

for (let path of pathsToClean) {
    console.log(`Cleaning up "${path}"`);
    if (!fs.pathExistsSync(path)) throw new Error("Path does not exist");

    fs.removeSync(path);
}

if (pathsToClean.length > 0) console.log(`Done`);
