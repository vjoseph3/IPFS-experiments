import Ctl from "ipfsd-ctl";
import * as ipfsHttpModule from "ipfs-http-client";
import goIpfs from "go-ipfs";
import crypto from "crypto";
import fetch, { FormData } from "node-fetch3";
import protobuf from "protobufjs";

/**
 * The goal of this demonstration is to show how two different users could both
 * publish under the same IPNS name.
 *
 * See https://discuss.ipfs.io/t/ipns-publishing-after-generating-a-key/90/4
 */
async function ipfsdCtlExperiment() {
  /**
   * STEP 1: Get an IPFS daemon running
   */

  // Based on sample code from https://github.com/ipfs/js-ipfsd-ctl/tree/70dff97afc5a194afc106b817b98575f8b122723
  const port = 43134; // Just using the default port for simplicity
  const server = Ctl.createServer(
    port,
    {
      ipfsModule: goIpfs, // Using go-ipfs because ipfs (the JS version) introduced two high severity vulnerabilities
      ipfsHttpModule,
    },
    {
      go: {
        ipfsBin: goIpfs.path(),
      },
    }
  );
  const factory = Ctl.createFactory({
    type: "go",
    ipfsHttpModule: ipfsHttpModule,
    remote: true,
    endpoint: `http://localhost:${port}`,
    test: true,
    disposable: true,
  });

  await server.start();
  const ipfsd = await factory.spawn();

  // This is the URL at which the HTTP RPC API is available.
  // The URL is not predetermined; hence it is calculated here.
  // The API docs are at https://docs.ipfs.io/reference/http/api
  const apiUrl = `http://${ipfsd.api.apiHost}:${ipfsd.api.apiPort}`;

  /**
   * STEP 2: Import a private key shared between both users
   */

  // Assume a shared secret of some kind already exists.
  // This secret uniquely determines the key that will be imported into IPFS.
  const secret = "a very secure, probably lengthy string of confidential data";

  // Convert the secret to a fixed size by hashing
  const secretHash = crypto
    .createHash("sha256")
    .update(secret)
    .digest("base32");

  // Create an ED25519 private key from the hash. This is a supported format
  // for libp2p peer IDs, according to the specs:
  // https://github.com/libp2p/specs/blob/f433ad595224cf33d916c166d1738f11aadfa9f7/peer-ids/peer-ids.md
  const cryptoKey = await crypto.webcrypto.subtle.importKey(
    "raw",
    secretHash,
    {
      name: "NODE-ED25519",
      namedCurve: "NODE-ED25519",
      public: false,
    },
    true,
    []
  );

  // Export in PEM PKCS8 format as indicated here:
  // https://github.com/ipfs/go-ipfs/blob/master/core/commands/keystore.go#L310-L317
  const pem = crypto.KeyObject.from(cryptoKey).export({
    type: "pkcs8",
    format: "pem",
  });

  // Per experimentation, the PEM header and footer need to be removed
  const pemContents = pem.slice(
    "-----BEGIN PRIVATE KEY-----\n".length,
    pem.length - "\n-----END PRIVATE KEY-----\n".length
  );

  // Create a buffer from the ASCII data
  const pemContentsBuffer = Buffer.from(pemContents, "ascii");

  // IPNS keys are libp2p keys according to
  // https://github.com/ipfs/ipfs-docs/issues/746#issuecomment-824892582
  // Use the protobuf from the libp2p key specs at
  // https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#keys
  const protoRoot = await protobuf.load("./libp2p_crypto.proto");
  const PrivateKey = protoRoot.lookupType("crypto.pb.PrivateKey");
  const payload = {
    Type: 1, // ED25519
    Data: pemContentsBuffer,
  };
  const message = PrivateKey.create(payload);
  const buffer = PrivateKey.encode(message).finish();

  // The HTTP RPC API endpoint /api/v0/key/import requires files as multipart/form-data
  // https://docs.ipfs.io/reference/http/api/#api-v0-key-import
  const formData = new FormData();
  formData.set("", buffer);

  // The API endpoint takes an argument: a name for the key
  const keyName = "test";

  // Import the key
  await fetch(`${apiUrl}/api/v0/key/import?arg=${keyName}`, {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((res) => {
      console.log("Key imported into IPFS");
      console.log(res);
    });

  /**
   * STEP 3: Use the key to publish under a jointly-controlled IPNS name
   */

  // The API endpoint documentation is at
  // https://docs.ipfs.io/reference/http/api/#api-v0-name-publish

  const ipfsPath = "/ipfs/QmWGeRAEgtsHW3ec7U4qW2CyVy7eA2mFRVbk1nb24jFyks"; // "Hello, World!"
  const lifetime = "10s"; // short lifetime not to interfere with future experiments

  const namePublishOptions = {
    arg: ipfsPath,
    lifetime,
    key: keyName,
  };

  // Use object properties as URL query parameters
  const namePublishOptionsString = JSON.stringify(namePublishOptions)
    .replace(/:/g, "=")
    .replace(/,/g, "&")
    .replace(/[{}"]/g, "");

  // commented to avoid lengthy wait
  //
  // const namePublishResponse = await fetch(
  //   `${apiUrl}/api/v0/name/publish?${namePublishOptionsString}`,
  //   {
  //     method: "POST",
  //   }
  // );
  // console.log(namePublishResponse);

  /**
   * STEP 4: Clean up
   */

  await ipfsd.stop();
  await server.stop();
}

export default ipfsdCtlExperiment;
