import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';

@Table
export default class Tag extends Model<Tag> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
    
    @Column
    name!: string;

    @Column
    icon!: string;

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}
