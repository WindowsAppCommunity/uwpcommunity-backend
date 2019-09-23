import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import User from './User';
import Launch from './Launch';
import * as faker from 'faker'
import UserProject from './UserProject';
import Category from './Category';

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
    return new Project({
        appName: faker.commerce.product(),
        description: faker.lorem.paragraph(),
        isPrivate: false,
        userId: user.id,
        launchId: launch.id,
        downloadLink: faker.internet.url(),
        githubLink: faker.internet.url(),
        externalLink: faker.internet.url()
    })
}