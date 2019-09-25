import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import Project, { DbToStdModal_Project } from './Project';
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

export function GenerateMockUser(): User {
    return new User({
        name: faker.internet.userName(),
        email: faker.internet.email(),
        discordId: faker.random.alphaNumeric()
    })
}