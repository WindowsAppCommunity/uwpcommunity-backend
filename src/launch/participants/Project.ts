import { Model } from 'sequelize';

export class Project extends Model {
    public id!: number;
    public ownerId!: number;
    public name!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}
