import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';
import User from './User';
import Launch from './Launch';

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

    @ForeignKey(() => User)
    userId!: number;

    @BelongsTo(() => User, 'userId')
    user!: User

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
