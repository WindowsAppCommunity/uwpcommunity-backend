import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import Project, { DbToStdModal_Project, StdToDbModal_Project } from './Project';
import * as faker from 'faker'

import UserProject from "./UserProject";
import { IUser, IProject } from './types';

@Table
export default class User extends Model<User> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;


    @Column
    name!: string;

    @Column
    email?: string;

    @Column
    discordId!: string;


    @BelongsToMany(() => Project, () => UserProject)
    projects?: Project[];


    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}

export async function DbToStdModal_User(user: User): Promise<IUser | undefined> {
    let projects: IProject[] = [];

    // Convert db user projects to standard API models 
    if (user.projects) {
        for (let project of user.projects) {
            let projectStd = await DbToStdModal_Project(project);
            if (projectStd) projects.push(projectStd);
        }
    }

    const stdUser: IUser = {
        discordId: user.discordId,
        name: user.name,
        id: user.id,
        email: user.email,
        projects: projects
    };
    return stdUser;
}

/** @summary This converts the data model ONLY, and does not represent the actual data in the database */
export async function StdToDbModal_User(user: IUser): Promise<User> {
    let projects: Project[] = [];

    // Convert db user projects to standard API models 
    if (user.projects) {
        for (let project of user.projects) {
            let projectDb = await StdToDbModal_Project(project);
            if (projectDb) projects.push(projectDb);
        }
    }

    const dbUser: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        discordId: user.discordId,
        projects: projects
    };
    return dbUser as User;
}


export function getUserByDiscordId(discordId: string): Promise<User | null> {
    return new Promise<User>((resolve, reject) => {
        User.findAll({
            where: { discordId: discordId }
        }).then(users => {
            if (!users || (users[0] && users[0].discordId !== discordId)) { resolve(); return; }
            if (users.length > 1) { reject("More than one user with that id found. Contact a system administrator to fix the data duplication"); return; }
            resolve(users[0]);
        }).catch(reject);
    });
}

export function GenerateMockUser(): User {
    return new User({
        name: faker.internet.userName(),
        email: faker.internet.email(),
        discordId: faker.random.alphaNumeric()
    })
}