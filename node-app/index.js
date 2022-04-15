import * as IPFS from "ipfs-core";
import toBuffer from "it-to-buffer";

const ipfs = await IPFS.create({ offline: true, start: true });

const { cid } = await ipfs.add("Hello, RISE!");
console.log(cid);

const helloWorldCid = "QmWGeRAEgtsHW3ec7U4qW2CyVy7eA2mFRVbk1nb24jFyks";
const bufferedContents = await toBuffer(ipfs.cat(helloWorldCid));
const stringContents = Buffer.from(bufferedContents.buffer).toString();
console.log(stringContents);

await ipfs.stop();
