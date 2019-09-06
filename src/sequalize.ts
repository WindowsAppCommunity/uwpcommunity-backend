import { Sequelize } from 'sequelize-typescript';

const db_url = process.env.DATABASE_URL;

if (!db_url) throw new Error(`The environment variable "DATABASE_URL" is missing. Unable to initialize Sequelize database`);

export const sequelize = new Sequelize(db_url, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: true
    },
    models: [__dirname + '/models']
});