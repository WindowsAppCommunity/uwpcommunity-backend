import { Sequelize, } from 'sequelize';
import { Project } from "./Project";
import { User } from "./User";

export const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: true
    }
});