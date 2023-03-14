import { Column, CreatedAt, Model, Table, UpdatedAt, HasMany, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';
import role from '../bot/commands/role';
import UserProject from './UserProject';

@Table
export default class Role extends Model<Role> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column
    name!: "Developer" | "Translator" | "Beta Tester" | "Support" | "Lead" | "Patreon" | "Advocate" | "Other";

    @CreatedAt
    @Column
    declare createdAt: Date;

    @UpdatedAt
    @Column
    declare updatedAt: Date;
}

export async function GetRoleByName(roleName: string): Promise<Role | null> {
    return Role.findOne({ where: { name: InputtedUserTypeToDBRoleType(roleName) ?? roleName } }).catch(Promise.reject);
}

export function InputtedUserTypeToDBRoleType(inputtedRole: string): string | undefined {
    switch (inputtedRole) {
        case "tester":
            return "Beta Tester";
        case "translator":
            return "Translator";
        case "dev":
            return "Developer";
        case "advocate":
            return "Advocate";
        case "support":
            return "Support";
        case "lead":
            return "Lead";
        case "patreon":
            return "Patreon";
        case "other":
            return "Other";
        default:
            return undefined;
    }
}
