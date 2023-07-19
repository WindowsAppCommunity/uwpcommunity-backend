import { Helia, Ipns, Dag, ImportLibp2pKey } from './helia.js';
import { peerIdFromString } from "@libp2p/peer-id";
import type { CID } from "multiformats/cid";
import { IProject } from "./interface/IProject.js";
import { exit } from "process";;
import { type PeerId } from "@libp2p/interface-peer-id";
import { GetUserByDiscordId, LoadUserAsync, SaveUserAsync } from './users.js';
import { ICollaborator } from './interface/ICollaborator.js';

export interface IProjectMap {
    ipnsCid: CID; // This CIDv1 should always be an IPNS CID.
    project: IProject;
}

// While each user could theoretically publish their own IPNS record for each project,
// we still need a way to keep track all registered projects that aren't doing that. This is how we do that.
let projects: IProjectMap[] = [];
let projectsIpnsKey: PeerId | undefined;

export default projects;

export async function GetFirstProjectBy(callback: (Project: IProjectMap) => boolean): Promise<IProject | undefined> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    for (var item of projects) {
        if (callback(item)) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            return await Dag.get<IProject>(cid);
        }
    }
}

export async function GetProjectsBy(callback: (project: IProjectMap) => boolean): Promise<IProject[]> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    const results: IProject[] = [];

    for (var item of projects) {
        if (callback(item)) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            const result = await Dag.get<IProject>(cid);
            results.push(result);
        }
    }

    return results
}

export async function GetProjectByName(name: string): Promise<IProject | undefined> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    for (var item of projects) {
        if (item.project.name == name) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            return await Dag.get<IProject>(cid);
        }
    }
}

export async function SaveAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    for (var projectMapItem of projects) {
        try {
            await SaveProjectAsync(projectMapItem.ipnsCid, projectMapItem.project);
        }
        catch {
            // Any projects without a corresponding key in the keychain cannot be edited.
            // ignored
        }
    }

    projectsIpnsKey ??= await ImportLibp2pKey("projects.key");

    var cid = await Dag.add(projects);
    await Ipns.publish(projectsIpnsKey, cid);
}

export async function LoadAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    projectsIpnsKey ??= await ImportLibp2pKey("projects.key");

    var cid = await Ipns.resolve(projectsIpnsKey, { offline: true });

    var projectRes = await Dag.get<IProjectMap[] | null>(cid);
    if (projectRes != null)
        projects = projectRes;

    // In order to publish changes to this project, we must have the proper libp2p key.
    for (var projectMapItem of projects) {
        try {
            ImportLibp2pKey(projectMapItem.ipnsCid.toString());
        }
        catch {
            // Any projects without a corresponding key cannot be edited.
            // ignored
        }

        var project = await LoadProjectAsync(projectMapItem.ipnsCid);

        // Update our snapshot with latest data.
        projectMapItem.project = project;
    }
}

export async function SaveProjectAsync(ipnsCid: CID, project: IProject): Promise<CID> {
    // Only public projects supported for now.
    AssertPublic(project);

    // If project is marked for deletion.
    if (project.forgetMe) {
        // Remove project from our snapshot.
        projects = projects.filter(x => !x.ipnsCid.equals(ipnsCid));

    } else {
        // Check if project is already cached
        var cachedTarget = projects.find(x => x.ipnsCid.equals(ipnsCid));

        if (cachedTarget) {
            // If project exists in our snapshot, update it.
            cachedTarget.project = project;
        }
        else {
            // Otherwise, add it to our snapshot.
            projects.push({ ipnsCid, project: project });
        }
    }

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    var peerId = await ImportLibp2pKey(ipnsCid.toString());
    var cid = await Dag.add(project);

    await Ipns.publish(peerId, cid);

    return cid;
}

export async function LoadProjectAsync(ipnsCid: CID) {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    var ipnsKey = peerIdFromString(ipnsCid.toString());
    var cid = await Ipns.resolve(ipnsKey);
    var project = await Dag.get<IProject>(cid);

    // Only public projects supported for now.
    AssertPublic(project);

    return project;
}

export function AssertPublic(project: IProject) {
    if (project.isPrivate) {
        throw new Error("FATAL: Project is marked private, but was treated as a public project internally. Execution should not continue.");
        exit(-1);
    }
}

/**
 * Returns an array of projects that the user with the given Discord ID has access to.
 * Only returns private projects if the authenticated Discord ID matches a Discord ID of a collaborator on the project.
 * @param discordId The Discord ID of the user to get projects for.
 * @param authenticatedDiscordId The Discord ID of an authenticated user, if any.
 * @returns An array of projects that the user has access to.
 * @throws Error if the user is not found.
 */
export async function GetProjectsByDiscordId(discordId: string, authenticatedDiscordId: string | void) {
    var user = await GetUserByDiscordId(discordId);
    if (user == undefined)
        return [];

    return projects.map(x => x.project).filter(x => !x.forgetMe && x.collaborators.some(c => user?.ipnsCid == c.user && x.isPrivate == (discordId == authenticatedDiscordId)));
}

export function GetIpnsCidByProjectName(name: string): CID | undefined {
    for (var item of projects) {
        if (item.project.name == name)
            return item.ipnsCid;
    }
}

/**
 * @returns True if successful, false if project not found
 * @param project Project to delete
 */
export async function DeleteProject(ipnsCid: CID) {
    if (!Ipns || !Dag)
        throw new Error("Helia not initialized");

    // Find the project
    const project = await LoadProjectAsync(ipnsCid);

    // Remove project from all known user profiles
    for (const collaborator of project.collaborators) {
        var user = await LoadUserAsync(collaborator.user);

        if (user.projects.filter(x => x == ipnsCid)) {
            // Remove this project from this user profile
            user.projects = user.projects.filter(x => x != ipnsCid);

            await SaveUserAsync(collaborator.user, user);
        }
    }

    // Delete the project
    await SaveProjectAsync(ipnsCid, { ...project, forgetMe: true });
}