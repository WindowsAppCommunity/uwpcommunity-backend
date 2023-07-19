import { Helia, Ipns, Dag, ImportLibp2pKey } from '../helia.js';
import { peerIdFromString } from "@libp2p/peer-id";
import type { CID } from "multiformats/cid";
import { ICommunityEventEntry } from "../interface/ICommunityEventEntry.js";
import { exit } from "process";;
import { type PeerId } from "@libp2p/interface-peer-id";

interface ICommunityEventEntryMap {
    ipnsCid: CID; // This CIDv1 should always be an IPNS CID.
    communityEventEntry: ICommunityEventEntry;
}

// While each user could theoretically publish their own IPNS record for each communityEventEntry,
// we still need a way to keep track all registered communityEventEntries that aren't doing that. This is how we do that.
let communityEventEntries: ICommunityEventEntryMap[] = [];
let communityEventEntriesIpnsKey: PeerId | undefined;

export default communityEventEntries;

export async function GetFirstCommunityEventEntryBy(callback: (CommunityEventEntry: ICommunityEventEntryMap) => boolean): Promise<ICommunityEventEntry | undefined> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    for (var item of communityEventEntries) {
        if (callback(item)) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            return await Dag.get<ICommunityEventEntry>(cid);
        }
    }
}

export async function SaveAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    for (var communityEventEntryMapItem of communityEventEntries) {
        try {
            await SaveCommunityEventEntryAsync(communityEventEntryMapItem.ipnsCid, communityEventEntryMapItem.communityEventEntry);
        }
        catch {
            // Any communityEventEntries without a corresponding key cannot be edited.
            // ignored
        }
    }

    communityEventEntriesIpnsKey ??= await ImportLibp2pKey("communityEventEntries.key");

    var cid = await Dag.add(communityEventEntries);
    await Ipns.publish(communityEventEntriesIpnsKey, cid);
}

export async function LoadAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    communityEventEntriesIpnsKey ??= await ImportLibp2pKey("communityEventEntries.key");

    var cid = await Ipns.resolve(communityEventEntriesIpnsKey, { offline: true });

    var communityEventEntryRes = await Dag.get<ICommunityEventEntryMap[] | null>(cid);
    if (communityEventEntryRes != null)
        communityEventEntries = communityEventEntryRes;

    // In order to publish changes to this communityEventEntry, we must have the proper libp2p key.
    for (var communityEventEntryMapItem of communityEventEntries) {
        try {
            ImportLibp2pKey(communityEventEntryMapItem.ipnsCid.toString());
        }
        catch {
            // Any communityEventEntries without a corresponding cannot be edited.
            // ignored
        }

        var communityEventEntry = await LoadCommunityEventEntryAsync(communityEventEntryMapItem.ipnsCid);

        // Update our snapshot with latest data.
        communityEventEntryMapItem.communityEventEntry = communityEventEntry;
    }
}

export async function SaveCommunityEventEntryAsync(ipnsCid: CID, communityEventEntry: ICommunityEventEntry) : Promise<CID> {
    if (!communityEventEntries.find(x => x.ipnsCid.equals(ipnsCid))) {
        communityEventEntries.push({ ipnsCid, communityEventEntry: communityEventEntry });
    }

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    var peerId = await ImportLibp2pKey(ipnsCid.toString());
    var cid = await Dag.add(communityEventEntry);

    await Ipns.publish(peerId, cid);

    return cid;
}

export async function LoadCommunityEventEntryAsync(ipnsCid: CID) {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    var ipnsKey = peerIdFromString(ipnsCid.toString());
    var cid = await Ipns.resolve(ipnsKey);
    var communityEventEntry = await Dag.get<ICommunityEventEntry>(cid);

    return communityEventEntry;
}

