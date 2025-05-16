# CoW Protocol Custom Orders

A tiny static HTML page for placing custom CoW Protocol orders with MetaMask.

## Building

Building the static page requires:
- POSIX environment, specifically `make` and `sed`
- [Deno](https://deno.land) for bundling JavaScript
- _Optionally_ [cURL](https://curl.se) for uploading to IPFS

```sh
make # builds dist/index.html static page
make host # builds the static HTML page hosts it locally on port 8000
make ipfs # builds the static HTML page and uploads it to IPFS
make clean # cleans up the dist/ directory
```

## Signing an order

Currently, the script doesn't check for allowance, and signing an order might end up with the `insufficient allowance` error. In that case, set the allowance manually:

```sh
cast send $TOKEN_ADDRESS "approve(address,uint256)" 0xC92E8bdf79f0507f65a392b0ab4667716BFE0110 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff \
  --private-key $PK \
  --rpc-url $RPC_URL
```
, where `0xC92E8bdf79f0507f65a392b0ab4667716BFE0110` is a [VaultRelayer address](https://docs.cow.fi/cow-protocol/reference/contracts/core)
