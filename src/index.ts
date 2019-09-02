import { Request, Response, NextFunction } from "express";
import { sequelize } from './common/sequalize';
import { Project } from "./models/project";
import { DataTypes, Sequelize } from "sequelize";
import { User } from "./models/user";
import { Launch } from "./models/launch";

/**
 * This file sets up API endpoints based on the current folder tree in Heroku.
 * 
 * Here's how it works:
 * Consumable JS files named with an HTTP method (all lowercase) are handed the Request and Response parameters from ExpressJS
 * The path of the file is set up as the endpoint on the server, and is set up with the HTTP method indicated by the filename 
 * 
 * Example: 
 * The file `./myapp/bugreport/post.js` is set up at `POST https://example.com/myapp/bugreport/`
 * 
 * For local development, run `npm start dev`
 */

const express = require('express'), app = express();
const expressWs = require('express-ws')(app);

const bodyParser = require('body-parser');
const glob = require('glob');
const helpers = require('./helpers');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Pass to next layer of middleware
    next();
});

const PORT = process.env.PORT || 5000;
const DEBUG = process.argv.filter(val => val == 'dev').length > 0;

let RegexMethods = /((?:post|get|put|patch|delete|ws)+)(?:.js)/;

glob(__dirname + '/**/*.js', function (err: Error, result: string[]) {

    for (let filePath of result) {

        if (!filePath.includes("node_modules") && helpers.match(filePath, RegexMethods)) {
            let serverPath = filePath.replace(RegexMethods, "").replace("/app", "").replace("/build", "");

            if (DEBUG) serverPath = serverPath.replace(__dirname.replace(/\\/g, `/`).replace("/build", ""), "");

            const method = helpers.match(filePath, RegexMethods);
            console.log(`Setting up ${filePath} as ${method.toUpperCase()} ${serverPath}`);

            switch (method) {
                case "post":
                    app.post(serverPath, require(filePath));
                    break;
                case "get":
                    app.get(serverPath, require(filePath));
                    break;
                case "put":
                    app.put(serverPath, require(filePath));
                    break;
                case "patch":
                    app.patch(serverPath, require(filePath));
                    break;
                case "delete":
                    app.delete(serverPath, require(filePath));
                    break;
                case "ws":
                    app.ws(serverPath, require(filePath)(expressWs, serverPath));
                    break;
            }
        }
    }
});

(async () => {

    app.listen(PORT, (err: string) => {
        if (err) {
            console.error(`Error while setting up port ${PORT}:`, err);
            return;
        }
        console.log(`Ready, listening on port ${PORT}`);

        sequelize
            .authenticate()
            .then(async () => {
                console.log('Connection has been established successfully.');

                await InitDb();
            })
            .catch(err => {
                console.error('Unable to connect to the database:', err);
            });
    });

})();

async function InitDb() {

    Launch.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        year: {
            type: new DataTypes.STRING(128),
            allowNull: false,
        }
    }, {
            tableName: 'launches',
            sequelize: sequelize, // this bit is important
        });

    Project.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED, // you can omit the `new` but this is discouraged
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: new DataTypes.STRING(128),
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        launchId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        }
    }, {
            sequelize,
            tableName: 'projects',
        });

    User.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: new DataTypes.STRING(128),
            allowNull: false,
        }
    }, {
            tableName: 'users',
            sequelize: sequelize, // this bit is important
        });

    // Here we associate which actually populates out pre-declared `association` static and other methods.
    Launch.hasMany(Project, {
        sourceKey: 'id',
        foreignKey: 'launchId',
        as: 'projects' // this determines the name in `associations`!
    });

    User.hasMany(Project, {
        sourceKey: 'id',
        foreignKey: 'userId',
        as: 'projects' // this determines the name in `associations`!
    });

    await sequelize.sync();

    // await addStuff();

    await readStuff();
}

async function addStuff() {
    // Please note that when using async/await you lose the `bluebird` promise context
    // and you fall back to native
    // const newUser = await User.create({
    //     name: 'Johnny',
    // });
    // console.log(newUser);

    // const newLaunch = await Launch.create({
    //     year: '2019'
    // });
    // const newLaunch2 = await Launch.create({
    //     year: '2020'
    // });
    // console.log(newLaunch);

    // const project = await newUser.createProject({
    //     name: 'first!',
    //     launchId: 3
    // });
    // const project2 = await newUser.createProject({
    //     name: 'first!',
    //     launchId: 4
    // });
    // console.log(project);


    // newLaunch.addProject(project);
}

async function readStuff() {
    // const ourUser = await User.findByPk(1, {
    //     include: [User.associations.projects],
    //     rejectOnEmpty: true, // Specifying true here removes `null` from the return type!
    // });
    // console.log(ourUser); // Note the `!` null assertion since TS can't know if we included
    // console.log(ourUser.projects![0].name); // Note the `!` null assertion since TS can't know if we included
    // the model or not


    const myLaunch = await Launch.findAll({
        where: { year : "2020"},
        include: [{
            model: Project,
            as: 'projects'
        }]
    });

    if (myLaunch && myLaunch[0].projects) {
        console.log(myLaunch[0].projects.length); // Note the `!` null assertion since TS can't know if we included
    }
}