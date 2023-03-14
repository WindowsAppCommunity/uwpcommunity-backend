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
    declare id: number;

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
    declare createdAt: Date;

    @UpdatedAt
    @Column
    declare updatedAt: Date;
}

export function DbToStdModal_User(user: User): IUser {
    const stdUser: IUser = {
        discordId: user.discordId,
        name: user.name,
        id: user.id,
        email: user.email
    };
    return (stdUser);
}

/** @summary This converts the data model ONLY, and does not represent the actual data in the database */
export async function StdToDbModal_User(user: IUser): Promise<User> {
    const dbUser: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        discordId: user.discordId,
    };
    return (dbUser as User);
}

export async function getUserByDiscordId(discordId: string): Promise<User | null> {
    return await User.findOne({
        where: { discordId: discordId }
    });
}

export function GenerateMockUser(): User {
    return new User({
        name: faker.internet.userName(),
        email: faker.internet.email(),
        discordId: faker.random.alphaNumeric()
    })
}