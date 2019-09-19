import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import User from './User';
import Launch from './Launch';
import UserProject from './UserProject';

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


    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}

