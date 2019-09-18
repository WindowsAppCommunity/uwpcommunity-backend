import { Column, CreatedAt, Model, Table, UpdatedAt, HasMany, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';
import Project  from './Project';
import * as faker from 'faker'

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
    
    @HasMany(() => Project, 'userId')
    projects?: Project[];
    
    @CreatedAt
    @Column
    createdAt!: Date;
    
    @UpdatedAt
    @Column
    updatedAt!: Date;
}

export function GenerateMockUser(): User {
    return new User({
        name: faker.internet.userName(),
        email: faker.internet.email(),
        discordId: faker.random.alphaNumeric()
    })
}