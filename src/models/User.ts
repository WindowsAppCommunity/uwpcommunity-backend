import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import Project  from './Project';
import UserProject from "./UserProject";
  
@Table
export default class User extends Model<User> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;


    @Column
    name!: string;

    @Column
    email?: string;

    @Column
    discordId!: string;

    
    @BelongsToMany(() => Project, () => UserProject)
    projects?: Project[];
    
    
    @CreatedAt
    @Column
    createdAt!: Date;
    
    @UpdatedAt
    @Column
    updatedAt!: Date;
}
