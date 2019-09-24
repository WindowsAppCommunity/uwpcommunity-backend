import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import User from './User';
import Launch from './Launch';
import * as faker from 'faker'
import UserProject from './UserProject';
import Category from './Category';
import { IProject } from './types';

@Table
export default class Project extends Model<Project> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;


    @Column
    appName!: string;

    @Column
    description!: string;

    @Column
    isPrivate!: boolean;

    @Column
    downloadLink!: string;

    @Column
    githubLink!: string;

    @Column
    externalLink!: string;


    @BelongsToMany(() => User, () => UserProject)
    users?: User[];


    @ForeignKey(() => Launch)
    launchId!: number;

    @BelongsTo(() => Launch, 'launchId')
    launch!: Launch


    @ForeignKey(() => Category)
    categoryId!: number;

    @BelongsTo(() => Category, 'categoryId')
    category!: Category


    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}

export function GenerateMockProject(launch: Launch, user: User): Project {
    const mockProject: IProject = {
        discordId: faker.random.number(),
        categoryId: 0, // TODO: Update this when we get more than one category
        appName: faker.commerce.product(),
        description: faker.lorem.paragraph(),
        isPrivate: false,
        launchId: launch.id,
        downloadLink: faker.internet.url(),
        githubLink: faker.internet.url(),
        externalLink: faker.internet.url()
    };
    return new Project(mockProject);
}