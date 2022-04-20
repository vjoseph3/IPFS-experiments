import * as ipns from "ipns";
import * as IPFS from "ipfs-core";

async function ipnsExperiment() {
  const ipfs = await IPFS.create({ offline: true, start: true });
  const { cid } = await ipfs.add("Hello, RISE!");
  await ipfs.stop();
  const value = cid.bytes;

  const peerId = await IPFS.PeerId.create({
    keyType: "rsa",
    bits: 4096,
  });

  console.log(peerId);

  // I don't know what to use for the first argument here. I can't find a method
  // in the ipns object for creating a Peer ID, and ipns.create doesn't like
  // the Peer ID from IPFS.PeerId.create.
  const entryData = await ipns.create(peerId, value, 0, 1000);

  console.log(entryData);
}

export default ipnsExperiment;
