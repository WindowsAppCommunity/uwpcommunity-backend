import {Sequelize} from 'sequelize-typescript';

export const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: true
    },
    models: [__dirname + '/models']
});