import { Column, CreatedAt, Model, Table, UpdatedAt, HasMany, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';
import Project from './Project';

@Table
export default class Launch extends Model<Launch> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;


    @Column
    year!: number;


    @HasMany(() => Project, 'launchId')
    projects?: Project[];


    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}

export async function GetLaunchIdFromYear(year: number): Promise<number | undefined> {
    const catDb = await Launch.findOne({ where: { year: year } });
    if (!catDb) return;
    return catDb.id;
}

export async function GetLaunchYearFromId(id: number): Promise<number | undefined> {
    const catDb = await Launch.findOne({ where: { id: id } });
    if (!catDb) return;
    return catDb.year;
}

