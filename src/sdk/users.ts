import { Helia, Ipns, Dag, ImportLibp2pKey } from './helia.js';
import { peerIdFromString } from "@libp2p/peer-id";
import type { CID } from "multiformats/cid";
import { IUser } from "./interface/IUser.js";
import { type PeerId } from "@libp2p/interface-peer-id";
import { IDiscordConnection, IUserConnection } from './interface/IUserConnection.js';
import projects, { LoadProjectAsync, SaveProjectAsync } from './projects.js';

export interface IUserMap {
    ipnsCid: CID; // This CIDv1 should always be an IPNS CID.
    user: IUser;
}

// While each user could theoretically publish their own IPNS record,
// we still need a way to keep track all registered users that aren't doing that. This is how we do that.
let users: IUserMap[] = [];
let usersIpnsKey: PeerId | undefined;

export default users;

export async function GetFirstUserBy(callback: (user: IUserMap) => boolean): Promise<IUser | undefined> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    for (var item of users) {
        if (callback(item)) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            return await Dag.get<IUser>(cid);
        }
    }
}

export async function GetUsersBy(callback: (user: IUserMap) => boolean): Promise<IUser[]> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    const results: IUser[] = [];

    for (var item of users) {
        if (callback(item)) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            const result = await Dag.get<IUser>(cid);
            results.push(result);
        }
    }

    return results
}

export async function SaveAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    for (var userMapItem of users) {
        try {
            await SaveUserAsync(userMapItem.ipnsCid, userMapItem.user);
        }
        catch {
            // Any Users without a corresponding key cannot be edited.
            // ignored
        }
    }

    usersIpnsKey ??= await ImportLibp2pKey("Users.key");

    var cid = await Dag.add(users);
    await Ipns.publish(usersIpnsKey, cid);
}

export async function LoadAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    usersIpnsKey ??= await ImportLibp2pKey("Users.key");

    var cid = await Ipns.resolve(usersIpnsKey, { offline: true });

    var userRes = await Dag.get<IUserMap[] | null>(cid);
    if (userRes != null)
        users = userRes;

    // In order to publish changes to this User, we must have the proper libp2p key.
    for (var userMapItem of users) {
        try {
            ImportLibp2pKey(userMapItem.ipnsCid.toString());
        }
        catch {
            // Any Users without a corresponding cannot be edited.
            // ignored
        }

        var user = await LoadUserAsync(userMapItem.ipnsCid);

        // Update our snapshot with latest data.
        userMapItem.user = user;
    }
}

export async function SaveUserAsync(ipnsCid: CID, user: IUser): Promise<CID> {
    // If user is marked for deletion.
    if (user.forgetMe) {
        // Remove user from our snapshot.
        users = users.filter(x => !x.ipnsCid.equals(ipnsCid));

    } else {
        // Check if user is already cached
        var cachedTarget = users.find(x => x.ipnsCid.equals(ipnsCid));

        if (cachedTarget) {
            // If user exists in our snapshot, update it.
            cachedTarget.user = user;
        }
        else {
            // Otherwise, add it to our snapshot.
            users.push({ ipnsCid, user: user });
        }
    }

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    var peerId = await ImportLibp2pKey(ipnsCid.toString());
    var cid = await Dag.add(user);

    await Ipns.publish(peerId, cid);

    return cid;
}

export async function LoadUserAsync(ipnsCid: CID) {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    var ipnsKey = peerIdFromString(ipnsCid.toString());
    var cid = await Ipns.resolve(ipnsKey);
    var user = await Dag.get<IUser>(cid);

    var existingUserIndex = users.findIndex(x => x.ipnsCid.equals(ipnsCid));
    if (existingUserIndex)
        users[existingUserIndex].user = user;

    return user;
}

/**
 * @returns True if successful, false if user not found
 * @param user User to delete
 */
export async function DeleteUserByDiscordId(discordId: string) {
    if (!Ipns || !Dag)
        throw new Error("Helia not initialized");

    // Find the user
    const userMap = await GetUserByDiscordId(discordId);
    if (!userMap)
        throw new Error("User not found");

    // Remove user from collaborator list on all known projects (both user listed and registered with us)
    for (const projectCid of new Set(projects.map(x => x.ipnsCid).concat(userMap.user.projects)) || []) {
        var project = await LoadProjectAsync(projectCid);

        if (project.collaborators.filter(x => x.user == userMap.ipnsCid)) {
            // Remove this person as a collaborator on this project.
            project.collaborators = project.collaborators.filter(x => x.user != userMap.ipnsCid);

            // If the user is an owner, delete the project
            var isOwner = !!project.collaborators.filter(x => x.role.name.toLowerCase() == "owner" && x.user == userMap.ipnsCid);
            await SaveProjectAsync(projectCid, { ...project, forgetMe: isOwner });
        }
    }

    // Delete the user
    await SaveUserAsync(userMap.ipnsCid, { ...userMap.user, forgetMe: true });
}

export async function GetUserByDiscordId(discordId: string) {
    var res = users.filter((u: IUserMap) => !u.user.forgetMe && u.user.connections.some((c: IUserConnection) => (c as IDiscordConnection)?.discordId == discordId));
    if (res.length > 1)
        throw new Error("Fatal: Multiple users with same discordId found.")

    if (res.length == 0)
        return undefined;

    res[0].user = await LoadUserAsync(res[0].ipnsCid);
    return res[0];
}