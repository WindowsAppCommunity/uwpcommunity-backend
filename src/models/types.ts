export interface IProject {
    id?: number;

    appName: string;
    description: string;
    isPrivate: boolean;
    downloadLink?: string;
    githubLink?: string;
    externalLink?: string;

    heroImage: string;

    awaitingLaunchApproval: boolean;
    needsManualReview: boolean;
    lookingForRoles?: string[];

    collaborators: IProjectCollaborator[];

    createdAt: Date;
    updatedAt: Date;
    launchYear?: number;
    category?: string;
};

export interface IProjectCollaborator extends IUser {
    isOwner: boolean;
    role: "Developer" | "Translator" | "Beta Tester" | "Other";
}

export interface IUser {
    id?: number;

    name: string;
    discordId: string;
    email?: string; // This is a contact email supplied by the user, and is safe to be public 
}

export const ResponseErrorReasons = {
    MissingAuth: "Missing authorization header",
    UserExists: "User already exists",
    UserNotExists: "User does not exist",
    ProjectExists: "Project already exists",
    ProjectNotExist: "Project does not exist",
    GenericError: "Internal server error"
}

/**
 * @summary Discord API user object
 */
export interface IDiscordUser {
    /** @summary the user's id */
    id: string;
    /** @summary the user's username, not unique across the platform */
    username: string;
    /** @summary the user's 4-digit discord-tag */
    discriminator: string;
    /** @summary the user's avatar hash */
    avatar: string;
    /** @summary whether the user belongs to an OAuth2 application */
    bot?: boolean;
    /** @summary the user's id */
    mfa_enabled?: boolean;
    /** @summary whether the user has two factor enabled on their account */
    locale?: string;
    /** @summary the user's chosen language option */
    verified?: string;
    /** @summary whether the email on this account has been verified */
    email?: string;
    /** @summary the flags on a user's account */
    flags?: number;
    /** @summary the type of Nitro subscription on a user's account	 */
    premium_type?: number;
}

export interface IDiscordAuthResponse {
    "access_token": string;
    "token_type": "Bearer"
    "expires_in": number,
    "refresh_token": string,
    "scope": string;
}
