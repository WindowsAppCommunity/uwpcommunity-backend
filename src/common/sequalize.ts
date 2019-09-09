import { Sequelize } from 'sequelize-typescript';
import Launch from '../models/Launch';
import Projects from '../models/Project';
import User from '../models/User';

const db_url = process.env.DATABASE_URL;

if (!db_url) throw new Error(`The environment variable "DATABASE_URL" is missing. Unable to initialize Sequelize database`);

export const sequelize = new Sequelize(db_url, {
    dialect: 'postgres',
    logging: false,
    protocol: 'postgres',
    dialectOptions: {
        ssl: true
    },
    models: [ Launch, Projects, User ]
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
}