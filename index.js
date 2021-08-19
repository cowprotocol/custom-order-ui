const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

function handleError(inner) {
  return () =>
    Promise.resolve(inner()).catch((err) => {
      console.error(err);
      alert(err.message);
    });
}

document.querySelector("#connect").addEventListener(
  "click",
  handleError(async () => {
    await ethereum.request({ method: "eth_requestAccounts" });
  }),
);

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

const NETWORKS = {
  1: "mainnet",
  4: "rinkeby",
  100: "xdai",
};

document.querySelector("#sign").addEventListener(
  "click",
  handleError(async () => {
    const { chainId } = await provider.getNetwork();
    const network = NETWORKS[chainId];
    if (network === undefined) {
      throw new Error(`unsupported network ${chainId}`);
    }

    const order = {
      sellToken: document.querySelector("#sellToken").value,
      buyToken: document.querySelector("#buyToken").value,
      receiver: document.querySelector("#receiver").value,
      sellAmount: document.querySelector("#sellAmount").value,
      buyAmount: document.querySelector("#buyAmount").value,
      validTo: parseInt(document.querySelector("#validTo").value),
      appData: document.querySelector("#appData").value,
      feeAmount: document.querySelector("#feeAmount").value,
      kind: document.querySelector("#kind").value,
      partiallyFillable: document.querySelector("#partiallyFillable").checked,
      sellTokenBalance: document.querySelector("#sellTokenBalance").value,
      buyTokenBalance: document.querySelector("#buyTokenBalance").value,
    };
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

    const response = await fetch(
      `https://protocol-${network}.dev.gnosisdev.com/api/v1/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...order,
          signature,
          signingScheme: "eip712",
          from: await signer.getAddress(),
        }),
      },
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.description);
    }

    alert(`https://protocol-explorer.dev.gnosisdev.com/orders/${body}`);
  }),
);
