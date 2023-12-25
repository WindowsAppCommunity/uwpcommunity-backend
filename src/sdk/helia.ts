import * as helia from 'helia'
import { extractPublicKey } from "ipns"
import type { Helia as HeliaInterface } from '@helia/interface'
import { dagJson, type DAGJSON } from '@helia/dag-json'
import { IPNS, ipns } from '@helia/ipns'
import { CID } from "multiformats/cid";
import { peerIdFromString } from "@libp2p/peer-id";

import * as Projects from './projects.js'

import fs from 'fs'
import extra from 'fs-extra'

let Helia: HeliaInterface | undefined;
let Ipns: IPNS | undefined;
let Dag: DAGJSON | undefined;

export { Helia, Ipns, Dag };

export async function InitAsync() {
    Helia ??= await helia.createHelia({ start: true });
    console.log(`Helia is ready with peer id ${Helia.libp2p.peerId}`);

    Ipns ??= await ipns(Helia);
    console.log("Ipns is ready")

    Dag = dagJson(Helia);
    console.log("Dag-Json is ready")

    Projects.LoadAllAsync();
}

export async function ImportLibp2pKey(keyName: string) {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    try {
        const key = await fs.promises.readFile(`../libp2p-keys/${keyName}`, 'utf-8');
        var peer = await peerIdFromString(key);
        
        let keyInfo;

        try {
            keyInfo = await Helia?.libp2p.keychain.findKeyByName(keyName);
        }
        catch {
            // ignored
        }

        if (!keyInfo)
            await Helia?.libp2p.keychain.importPeer(keyName, peer);

        await Ipns.publish(peer, await Dag.add(null));

        return peer;
    } catch {
        return CreateLibp2pKey(keyName);
    }
}

export async function CreateLibp2pKey(keyName: string | undefined | void) {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    // Use name "temp" if none is provided.
    var keyInfo = await Helia.libp2p.keychain.createKey(keyName ?? "temp", 'Ed25519');
    if (!keyInfo)
        throw new Error("Failed to create key");

    // Rename key name to the key id, if no name was provided.
    if (keyInfo.name == "temp")
        keyInfo = await Helia.libp2p.keychain.renameKey(keyInfo.name, keyInfo.id);

    const peerId = await Helia.libp2p.keychain.exportPeerId(keyInfo.name)
    await Ipns.publish(peerId, await Dag.add(null));

    // Create ../libp2p-keys/ folder if not exists
    await extra.ensureDir('../libp2p-keys/');
    await fs.promises.writeFile(`../libp2p-keys/${keyInfo.name}`, peerId.toString(), { encoding: 'utf-8' });

    return peerId;
}

export async function PublishToKey(keyName: string, cid: CID) {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    const keyInfo = await Helia.libp2p.keychain.exportPeerId(keyName);
    await Ipns.publish(keyInfo, cid);
}

// Backend:
// - Create a way to store and retrieve ipns of all known:
//    - [x] Projects
//    - [x] Users
//    - [x] Publishers
//    - [x] Community event data
//    - [ ] Decryption keys for private projects
// - [x] Implement the HTTP API using IPLD for storing data, removing any use of Postgres.
// - [ ] Add support for private projects.
// - [ ] Finish and test new system using no data.
// - [ ] Create a tool to import data from postgres to new system.
// - [ ] Create tool for Admins to mirror hosted data on their local machine.

// Frontend:
// - [ ] Update the website to use updated models and endpoints.
// - [ ] Add support for image uploads.
// - [ ] Delete it all. Nuke it.
