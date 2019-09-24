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

export async function GetCategoryIdFromName(name: string): Promise<number | undefined> {
    const catDb = await Category.findOne({ where: { name: name } });
    if (!catDb) return;
    return catDb.id;
}

export async function GetCategoryNameFromId(id: number): Promise<string | undefined> {
    const catDb = await Category.findOne({ where: { id: id } });
    if (!catDb) return;
    return catDb.name;
}
