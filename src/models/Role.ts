import { Column, CreatedAt, Model, Table, UpdatedAt, HasMany, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';
import UserProject from './UserProject';

@Table
export default class Role extends Model<Role> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column
    name!: "Developer" | "Translator" | "Beta Tester" | "Other";

    @HasMany(() => UserProject, 'roleId')
    userProject?: UserProject[];

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}
