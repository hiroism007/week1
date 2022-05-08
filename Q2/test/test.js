const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = require("ethers");
const fs = require("fs");
const { groth16, plonk } = require("snarkjs");

function unstringifyBigInts(o) {
  if (typeof o == "string" && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
    if (o === null) return null;
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}

describe("HelloWorld", function () {
  let Verifier;
  let verifier;

  beforeEach(async function () {
    Verifier = await ethers.getContractFactory("HelloWorldVerifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();
  });

  it("Should return true for correct proof", async function () {
    //[assignment] Add comments to explain what each line is doing
    const { proof, publicSignals } = await groth16.fullProve(
      { a: "1", b: "2" },
      "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm",
      "contracts/circuits/HelloWorld/circuit_final.zkey"
    );

    console.log("1x2 =", publicSignals[0]);

    const editedPublicSignals = unstringifyBigInts(publicSignals);
    const editedProof = unstringifyBigInts(proof);
    const calldata = await groth16.exportSolidityCallData(
      editedProof,
      editedPublicSignals
    );

    const argv = calldata
      .replace(/["[\]\s]/g, "")
      .split(",")
      .map((x) => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [
      [argv[2], argv[3]],
      [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const Input = argv.slice(8);

    expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
  });
  it("Should return false for invalid proof", async function () {
    let a = [0, 0];
    let b = [
      [0, 0],
      [0, 0],
    ];
    let c = [0, 0];
    let d = [0];
    expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
  });
});

describe("Multiplier3 with Groth16", function () {
  let Verifier;
  let verifier;

  beforeEach(async function () {
    Verifier = await ethers.getContractFactory("Verifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();
  });

  it("Should return true for correct proof", async function () {
    // declare input signals
    const inputs = {
      a: "4",
      b: "2",
      c: "3",
    };

    // generate proof
    const { proof, publicSignals } = await groth16.fullProve(
      inputs,
      "contracts/circuits/Multiplier3Groth16/Multiplier3_js/Multiplier3.wasm",
      "contracts/circuits/Multiplier3Groth16/circuit_final.zkey"
    );
    // make sure that public signal is 24
    console.log("4x2x3 =", publicSignals[0]);

    // transform public signals to BigInt to call exportSolidityCallData
    const editedPublicSignals = unstringifyBigInts(publicSignals);

    // transform proof to BigInt to call exportSolidityCallData
    const editedProof = unstringifyBigInts(proof);

    // get calldata for verification on contract by passing public signals and proof
    const calldata = await groth16.exportSolidityCallData(
      editedProof,
      editedPublicSignals
    );

    // since calldata is not flattened, make them into flattened array to use each variables easily.
    const argv = calldata
      .replace(/["[\]\s]/g, "")
      .split(",")
      .map((x) => BigInt(x).toString());

    // prepare variables which match the contract verify method.
    const a = [argv[0], argv[1]];
    const b = [
      [argv[2], argv[3]],
      [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const Input = argv.slice(8);

    // make sure that verifyProof returns true because proof and public signals are valid.
    expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
  });
  it("Should return false for invalid proof", async function () {
    // pass invalid arguments to the verifyProof method.
    let a = [0, 0];
    let b = [
      [0, 0],
      [0, 0],
    ];
    let c = [0, 0];
    let d = [0];
    // make sure that verifyProof returns false because all arguments passed is dummy and invalid.
    expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
  });
});

describe("Multiplier3 with PLONK", function () {
  let Verifier;
  let verifier;

  beforeEach(async function () {
    Verifier = await ethers.getContractFactory("PlonkVerifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();
  });

  it("Should return true for correct proof", async function () {
    // declare input signals
    const inputs = {
      a: "4",
      b: "2",
      c: "3",
    };

    // generate proof
    const { proof, publicSignals } = await plonk.fullProve(
      inputs,
      "contracts/circuits/Multiplier3Plonk/Multiplier3_js/Multiplier3.wasm",
      "contracts/circuits/Multiplier3Plonk/circuit_final.zkey"
    );

    // make sure that public signal is 24
    console.log("4x2x3 =", publicSignals[0]);

    const editedPublicSignals = unstringifyBigInts(publicSignals);
    const editedProof = unstringifyBigInts(proof);

    const calldata = await plonk.exportSolidityCallData(
      editedProof,
      editedPublicSignals
    );

    const [proofForContract, publicSignalsForContract] = calldata.split(",");

    const result = await verifier.verifyProof(
      proofForContract,
      JSON.parse(publicSignalsForContract)
    );

    // make sure that verifyProof returns true because proof and public signals are valid.
    expect(result).to.be.true;
  });
  it("Should return false for invalid proof", async function () {
    const invalidProof = utils.id("a42");
    const invalidPublicSignals = [
      "0x0000000000000000000000000000000000000000000000000000000000000014",
    ];

    const result = await verifier.verifyProof(
      invalidProof,
      invalidPublicSignals
    );
    expect(result).to.be.false;
  });
});
