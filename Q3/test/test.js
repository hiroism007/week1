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

describe("LessThan10 with PLONK", function () {
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
      in: "15",
    };

    // generate proof
    const { proof, publicSignals } = await plonk.fullProve(
      inputs,
      "contracts/circuits/LessThan10/LessThan10_js/LessThan10.wasm",
      "contracts/circuits/LessThan10/circuit_final.zkey"
    );

    console.log("output: ", publicSignals[0]);

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

    expect(result).to.be.true;
  });
});
