"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typechain_1 = require("typechain");
const lodash_1 = require("lodash");
function codegen(contracts) {
    const template = `
/// <reference types="truffle-typings" />
import BN from "bn.js";

${contracts.map(generateContractInterface).join("\n")}

${contracts.map(generateContractInstanceInterface).join("\n")}
  `;
    return template;
}
exports.codegen = codegen;
function generateArtifactHeaders(contracts) {
    return `
  /// <reference types="truffle-typings" />

  import * as TruffleContracts from ".";
  
  declare global {
    namespace Truffle {
      interface Artifacts {
        ${contracts
        .map(f => `require(name: "${f.name}"): TruffleContracts.${f.name}Contract;`)
        .join("\n")}
      }
    }
  }  
  `;
}
exports.generateArtifactHeaders = generateArtifactHeaders;
function generateContractInterface(c) {
    return `
export interface ${c.name}Contract extends Truffle.Contract<${c.name}Instance> {
  ${c.constructor && c.constructor[0]
        ? `"new"(${generateInputTypes(c.constructor[0].inputs)} meta?: Truffle.TransactionDetails): Promise<${c.name}Instance>;`
        : `"new"(meta?: Truffle.TransactionDetails): Promise<${c.name}Instance>;`}
}
`;
}
function generateContractInstanceInterface(c) {
    return `
export interface ${c.name}Instance extends Truffle.ContractInstance {
  ${lodash_1.values(c.functions)
        .map(v => v[0])
        .map(generateFunction)
        .join("\n")}
}
  `;
}
function generateFunction(fn) {
    if (typechain_1.isConstant(fn) || typechain_1.isConstantFn(fn)) {
        return generateConstantFunction(fn);
    }
    return `
  ${fn.name}: {
    (${generateInputTypes(fn.inputs)} txDetails?: Truffle.TransactionDetails): Promise<Truffle.TransactionResponse>;
  call(${generateInputTypes(fn.inputs)} txDetails?: Truffle.TransactionDetails): Promise<${generateOutputTypes(fn.outputs)}>;
  sendTransaction(${generateInputTypes(fn.inputs)} txDetails?: Truffle.TransactionDetails): Promise<string>;
  estimateGas(${generateInputTypes(fn.inputs)} txDetails?: Truffle.TransactionDetails): Promise<number>;
  }
`;
}
function generateConstantFunction(fn) {
    return `
  ${fn.name}(${generateInputTypes(fn.inputs)} txDetails?: Truffle.TransactionDetails): Promise<${generateOutputTypes(fn.outputs)}>;
`;
}
function generateInputTypes(input) {
    if (input.length === 0) {
        return "";
    }
    return (input
        .map((input, index) => `${input.name || `arg${index}`}: ${generateInputType(input.type)}`)
        .join(", ") + ", ");
}
function generateOutputTypes(outputs) {
    if (outputs.length === 1) {
        return generateOutputType(outputs[0].type);
    }
    else {
        return `[${outputs.map(param => generateOutputType(param.type)).join(", ")}]`;
    }
}
function generateInputType(evmType) {
    switch (evmType.type) {
        case "integer":
            return "number | BN | string";
        case "uinteger":
            return "number | BN | string";
        case "address":
            return "string | BN";
        case "bytes":
            return "string | BN";
        case "dynamic-bytes":
            return "string";
        case "array":
            return `(${generateInputType(evmType.itemType)})[]`;
        case "boolean":
            return "boolean";
        case "string":
            return "string";
        case "tuple":
            return generateTupleType(evmType, generateInputType);
    }
}
function generateOutputType(evmType) {
    switch (evmType.type) {
        case "integer":
            return "BN";
        case "uinteger":
            return "BN";
        case "address":
            return "string";
        case "void":
            return "void";
        case "bytes":
        case "dynamic-bytes":
            return "string";
        case "array":
            return `(${generateOutputType(evmType.itemType)})[]`;
        case "boolean":
            return "boolean";
        case "string":
            return "string";
        case "tuple":
            return generateTupleType(evmType, generateOutputType);
    }
}
function generateTupleType(tuple, generator) {
    return ("{" +
        tuple.components
            .map(component => `${component.name}: ${generator(component.type)}`)
            .join(", ") +
        "}");
}
