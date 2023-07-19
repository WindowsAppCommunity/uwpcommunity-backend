export interface IUserConnection {
    connectionName: string;
}

export interface IDiscordConnection extends IUserConnection {
    connectionName: "discord";
    discordId: string;
}