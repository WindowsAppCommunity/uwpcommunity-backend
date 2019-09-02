import {Sequelize} from 'sequelize-typescript';
import Launch from "./models/Launch";
import User from "./models/User";
import Project from "./models/Project";

export const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: true
    },
    models: [__dirname + '/models']
});