import * as ipns from "ipns";
import * as IPFS from "ipfs-core";
import crypto from "crypto";

async function ipnsExperiment() {
  await peerIdExperiment();
  return;

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

// The built-in functions, it would appear, generate keypairs non-deterministcally.
// This function tests whether secp256k1 keypairs can be generated deterministically.
// Success is achieved by the effects of ./dangerously-customize-node_modules.sh
async function peerIdExperiment() {
  const secret =
    "This represents a secret, perhaps a shared secret that will allow two different users to update the same IPNS content.";
  const privateKeyData = crypto
    .createHash("sha256")
    .update(secret)
    .digest("hex")
    .slice(0, 64); // for the size criterion on line 746 of node_modules/@noble/secp256k1/lib/index.js

  const peerId1 = await IPFS.PeerId.create({
    keyType: "secp256k1",
    bits: privateKeyData,
  });
  const peerId2 = await IPFS.PeerId.create({
    keyType: "secp256k1",
    bits: privateKeyData,
  });

  if (JSON.stringify(peerId1) == JSON.stringify(peerId2)) {
    console.log("Success! The two generated peer IDs are the same.");
  } else {
    console.log(JSON.stringify(peerId1));
    console.log(JSON.stringify(peerId2));
  }
}

export default ipnsExperiment;
