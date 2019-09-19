export interface IProject {
    id?: number;

    appName: string;
    description: string;
    isPrivate: boolean;

    launchId: number;
    userId: number;

    users?: IUser[];

    // downloadLink?: string;
    // githubLink?: string;
    // externalLink?: string;
};

export interface IUser {
    name: string;
    discordId: string;
    email?: string; // This is a contact email supplied by the user, and is safe to be public 
    id?: number;
    projects?: IProject[];
}

/**
 * @summary Discord API user object
 */
export interface IDiscordUser {
    "username": string;
    "locale": string;
    "premium_type": number;
    "mfa_enabled": boolean;
    "flags": number;
    "avatar": string;
    "discriminator": string;
    "id": string;
}

export interface IDiscordAuthResponse {
    "access_token": string;
    "token_type": "Bearer"
    "expires_in": number,
    "refresh_token": string,
    "scope": string;
}
