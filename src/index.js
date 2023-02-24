import { ethers } from "./lib/ethers.js";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const settlement = new ethers.Contract(
  "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
  [
    "function vaultRelayer() view returns (address)",
    "function setPreSignature(bytes orderUid, bool signed)",
  ],
  signer,
);

function erc20(address) {
  return new ethers.Contract(
    address,
    [
      "function allowance(address, address) view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function approve(address, uint256)",
    ],
    signer,
  );
}

function handleError(inner) {
  return () =>
    Promise.resolve(inner()).catch((err) => {
      console.error(err);
      alert(err.message);
    });
}

function parseQuery(q) {
  const pairs = (q[0] === "?" ? q.substr(1) : q).split("&");
  const query = {};
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    query[decodeURIComponent(key)] = decodeURIComponent(value || "");
  }
  return query;
}

function orderbookUrl(network, path) {
  const { orderbook } = parseQuery(window.location.search);
  let baseUrl;
  switch (orderbook || "barn") {
    case "prod":
    case "production":
      baseUrl = `https://api.cow.fi/${network}`;
      break;
    case "barn":
    case "dev":
    case "staging":
      baseUrl = `https://barn.api.cow.fi/${network}`;
      break;
    case "local":
    case "localhost":
      baseUrl = "http://localhost:8080";
      break;
    default:
      baseUrl = orderbook;
      break;
  }
  console.log(baseUrl);
  return `${baseUrl}/api/${path}`;
}

function readOrder() {
  return {
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
}

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
  5: "goerli",
  100: "xdai",
};

async function init() {
  await ethereum.request({ method: "eth_requestAccounts" });

  const { chainId } = await provider.getNetwork();
  const network = NETWORKS[chainId];
  if (network === undefined) {
    throw new Error(`unsupported network ${chainId}`);
  }

  return {
    chainId,
    network,
  };
}

document.querySelector("#approve").addEventListener(
  "click",
  handleError(async () => {
    await init();

    const vaultRelayer = await settlement.vaultRelayer();
    const from = await signer.getAddress();
    const { sellToken, sellAmount } = readOrder();

    const token = erc20(sellToken);
    const allowance = await token.allowance(from, vaultRelayer);
    if (allowance.gt(sellAmount)) {
      alert("allowance already set");
      return;
    }

    await token.approve(vaultRelayer, ethers.constants.MaxUint256);
  }),
);

document.querySelector("#nowish").addEventListener(
  "click",
  handleError(() => {
    const now = ~~(Date.now() / 1000);
    const nowish = now + 20 * 60; // 20 minutes expiry

    document.querySelector("#validTo").value = `${nowish}`;
  }),
);

document.querySelector("#randapp").addEventListener(
  "click",
  handleError(() => {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const hex = [...bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    document.querySelector("#appData").value = `0x${hex}`;
  }),
);

document.querySelector("#quote").addEventListener(
  "click",
  handleError(async () => {
    const { network } = await init();

    const { sellAmount, buyAmount, feeAmount, ...order } = readOrder();
    let swapAmount;
    switch (order.kind) {
      case "sell":
        swapAmount = {
          sellAmountBeforeFee: `${BigInt(sellAmount) + BigInt(feeAmount)}`,
        };
        break;
      case "buy":
        swapAmount = {
          buyAmountAfterFee: buyAmount,
        };
        break;
      default:
        throw new Error(`unsupported order kind ${order.kind}`);
    }

    const response = await fetch(orderbookUrl(network, "v1/quote"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...order,
        ...swapAmount,
        from: await signer.getAddress(),
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.description);
    }

    const { quote, id } = body;
    document.querySelector("#sellAmount").value = quote.sellAmount;
    document.querySelector("#buyAmount").value = quote.buyAmount;
    document.querySelector("#feeAmount").value = quote.feeAmount;
    document.querySelector("#quoteId").value = id;
  }),
);

document.querySelector("#sign").addEventListener(
  "click",
  handleError(async () => {
    const { chainId, network } = await init();

    const domain = {
      name: "Gnosis Protocol",
      version: "v2",
      chainId,
      verifyingContract: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
    };
    const order = readOrder();
    const signingScheme = document.querySelector("#signingScheme").value;

    let signature;
    switch (signingScheme) {
      case "eip712":
        signature = await signer._signTypedData(
          domain,
          { Order: ORDER_TYPE },
          order,
        );
        break;
      case "ethsign":
        signature = await signer.signMessage(
          ethers.utils.arrayify(
            ethers.utils._TypedDataEncoder.hash(
              domain,
              { Order: ORDER_TYPE },
              order,
            ),
          ),
        );
        break;
      case "presign":
        signature = (await signer.getAddress()).toLowerCase();
        break;
    }

    const quoteIdValue = document.querySelector("#quoteId").value;
    const quoteId = quoteIdValue === "" ? null : parseInt(quoteIdValue);

    const response = await fetch(
      orderbookUrl(network, "v1/orders"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...order,
          signature,
          signingScheme,
          quoteId,
          from: await signer.getAddress(),
        }),
      },
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.description);
    }
    const orderUid = body;

    if (signingScheme === "presign") {
      await settlement.setPreSignature(orderUid, true);
    }

    // TODO(nlordell): Fix this link (`barn` should be added based on orderbook
    // URL and network needs to be included in path for Rinkeby and GChain).
    const url = `https://barn.explorer.cow.fi/orders/${orderUid}`;

    // Additionally log to console. This facilitates copy-pasting the URL in
    // browsers where the alert box text can't be selected.
    console.info(url);
    alert(url);
  }),
);
