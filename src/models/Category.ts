import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType, HasMany } from 'sequelize-typescript';
import Project from './Project';

@Table
export default class Category extends Model<Category> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
    

    @Column
    name!: string;


    @HasMany(() => Project, 'categoryId')
    projects?: Project[];


    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}