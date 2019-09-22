import { Sequelize } from 'sequelize-typescript';
import Launch from '../models/Launch';
import Projects, { GenerateMockProject } from '../models/Project';
import User, { GenerateMockUser } from '../models/User';
import UserProject from '../models/UserProject';
import Role from '../models/Role';
import Category from '../models/Category';

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
    models: [Launch, Projects, User, UserProject, Role, Category]
});

export async function InitDb() {
    await sequelize
        .authenticate()
        .catch(err => {
            throw new Error('Unable to connect to the database: ' + err); // Throwing prevents the rest of the code below from running
        });

    await sequelize.sync().catch(console.error);

    Launch.count() // There an error in the log related to this line
        .then(c => {
            if (c < 1) {
                Launch.bulkCreate([
                    { year: 2019 },
                    { year: 2020 }
                ]);
            }
        })
        .catch(console.error);

    Role.count() 
        .then(c => {
            if (c < 1) {
                Role.bulkCreate([
                    { name: "Developer" },
                    { name: "Designer" },
                    { name: "Tester" },
                    { name: "Translator" }
                ]);
            }
        })
        .catch(console.error);

    Category.count() 
        .then(c => {
            if (c < 1) {
                Category.bulkCreate([
                    { name: "Other" }
                ]);
            }
        })
        .catch(console.error);
}

export async function CreateMocks() {
    const fakeUser = await GenerateMockUser().save()
    const launches = await Launch.findAll()

    for (const launch of launches) {
        await Promise.all(Array(5).fill(undefined).map(
            () => GenerateMockProject(launch, fakeUser).save()
        ))
    }
}