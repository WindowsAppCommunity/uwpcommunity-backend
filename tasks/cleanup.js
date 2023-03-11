const pathsToClean = ["./build"];
const fs = require('fs-extra')

for (let path of pathsToClean) {
    if (fs.pathExistsSync(path)) {
        console.log(`Cleaning up "${path}"`);
        fs.removeSync(path);
    }
}

if (pathsToClean.length > 0) console.log(`Done`);
