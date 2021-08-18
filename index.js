const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const ORDER_TYPE = [
  { name: "sellToken", type: "address" },
  { name: "buyToken", type: "address" },
  { name: "receiver", type: "address" },
  { name: "sellAmount", type: "uint256" },
  { name: "buyAmount", type: "uint256" },
  { name: "validTo", type: "uint32" },
  { name: "appData", type: "bytes32" },
  { name: "feeAmount", type: "uint256" },
  { name: "kind", type: "string" },
  { name: "partiallyFillable", type: "bool" },
  { name: "sellTokenBalance", type: "string" },
  { name: "buyTokenBalance", type: "string" },
];

document.querySelector("#connect").addEventListener("click", async () => {
  await ethereum.request({ method: "eth_requestAccounts" });
});

document.querySelector("#sign").addEventListener("click", async () => {
  const { chainId } = await provider.getNetwork();
  const order = {
    sellToken: document.querySelector("#sellToken").value,
    buyToken: document.querySelector("#buyToken").value,
    receiver: document.querySelector("#receiver").value,
    sellAmount: document.querySelector("#sellAmount").value,
    buyAmount: document.querySelector("#buyAmount").value,
    validTo: document.querySelector("#validTo").value,
    appData: document.querySelector("#appData").value,
    feeAmount: document.querySelector("#feeAmount").value,
    kind: document.querySelector("#kind").value,
    partiallyFillable: document.querySelector("#partiallyFillable").value,
    sellTokenBalance: document.querySelector("#sellTokenBalance").value,
    buyTokenBalance: document.querySelector("#buyTokenBalance").value,
  };
  console.log(order);
  const signature = await signer._signTypedData(
    {
      name: "Gnosis Protocol",
      version: "v2",
      chainId,
      verifyingContract: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
    },
    { Order: ORDER_TYPE },
    order,
  );
  console.log("Asdfasdf");
  const { v, r, s } = ethers.utils.splitSignature(signature);
  console.log({ v: `0x${v.toString(16)}`, r, s });
});
