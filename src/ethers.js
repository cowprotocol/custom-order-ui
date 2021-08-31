import { arrayify } from "@ethersproject/bytes";
import { Contract } from "@ethersproject/contracts";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { Web3Provider } from "@ethersproject/providers";
import { pack as solidityPack } from "@ethersproject/solidity";

export const ethers = {
  Contract,
  providers: { Web3Provider },
  utils: {
    _TypedDataEncoder,
    arrayify,
    solidityPack,
  },
};
