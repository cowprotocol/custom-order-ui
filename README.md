# Gnosis Protocol V2 Custom Orders

A tiny static HTML page for placing custom GPv2 orders with MetaMask.

## Building

Building the static page requires:
- POSIX environment, specifically `make` and `sed`
- [Deno](https://deno.land) for bundling JavaScript
- _Optionally_ [cURL](https://curl.se) for uploading to IPFS

```sh
make # builds dist/index.html static page
make ipfs # builds the static HTML page and uploads it to IPFS
make clean # cleans up the dist/ directory
```