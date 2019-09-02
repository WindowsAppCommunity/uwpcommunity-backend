import { Column, CreatedAt, Model, Table, UpdatedAt, HasMany, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';
import Project  from './Project';

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
