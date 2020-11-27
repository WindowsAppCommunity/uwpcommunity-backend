import { Sequelize } from 'sequelize-typescript';
import Project from '../models/Project';
import User, { GenerateMockUser } from '../models/User';
import UserProject from '../models/UserProject';
import Role from '../models/Role';
import * as helpers from './helpers/generic';
import ProjectImage from '../models/ProjectImage';

const db_url = process.env.DATABASE_URL;

if (!db_url) throw new Error(`The environment variable "DATABASE_URL" is missing. Unable to initialize Sequelize database`);

const dialect = db_url.includes('sqlite') ? 'sqlite' : 'postgres'

export const sequelize = new Sequelize(db_url, {
    dialect,
    logging: false,
    protocol: dialect,
    dialectOptions: {
        ssl: true
    },
    models: [ProjectImage, Project, User, Role, UserProject]
});

export async function InitDb() {
    await sequelize
        .authenticate()
        .catch((err: string) => {
            throw new Error('Unable to connect to the database: ' + err); // Throwing prevents the rest of the code below from running
        });

    if (helpers.DEVENV) {

        await sequelize.sync().catch(console.error);

        Role.count()
            .then((c) => {
                if (c < 1) {
                    Role.bulkCreate([
                        { name: "Developer" },
                        { name: "Beta tester" },
                        { name: "Translator" },
                        { name: "Other" }
                    ]);
                }
            })
            .catch(console.error);

    }
}

export async function CreateMocks() {
    /*     const fakeUser = await GenerateMockUser().save()
        const launches = await Launch.findAll()
    
        for (const launch of launches) {
            await Promise.all(Array(5).fill(undefined).map(
                async () => (await GenerateMockProject(launch, fakeUser)).save()
            ))
        } */
}