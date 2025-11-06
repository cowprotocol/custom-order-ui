import { ethers } from "./lib/ethers.js";

const STORAGE_KEY = "custom-order-form-state";
const FORM_FIELDS = [
  "sellToken",
  "buyToken",
  "receiver",
  "sellAmount",
  "buyAmount",
  "validTo",
  "appData",
  "kind",
  "partiallyFillable",
  "sellTokenBalance",
  "buyTokenBalance",
  "signingScheme",
  "quoteId",
];

const DEFAULT_FORM_STATE = {
  sellToken: "0x0000000000000000000000000000000000000000",
  buyToken: "0x0000000000000000000000000000000000000000",
  receiver: "0x0000000000000000000000000000000000000000",
  sellAmount: "0",
  buyAmount: "0",
  validTo: "0",
  appData: "0x0000000000000000000000000000000000000000000000000000000000000000",
  kind: "sell",
  partiallyFillable: false,
  sellTokenBalance: "erc20",
  buyTokenBalance: "erc20",
  signingScheme: "eip712",
  quoteId: "",
};

function fieldElement(id) {
  return document.querySelector(`#${id}`);
}

function applyFormState(state) {
  for (const id of FORM_FIELDS) {
    if (!(id in state)) {
      continue;
    }
    const element = fieldElement(id);
    if (!element) {
      continue;
    }
    if (element.type === "checkbox") {
      element.checked = Boolean(state[id]);
    } else {
      element.value = state[id];
    }
  }
}

function readFormState() {
  const state = {};
  for (const id of FORM_FIELDS) {
    const element = fieldElement(id);
    if (!element) {
      continue;
    }
    if (element.type === "checkbox") {
      state[id] = element.checked;
    } else {
      state[id] = element.value;
    }
  }
  return state;
}

function saveFormState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readFormState()));
  } catch (err) {
    console.warn("Unable to persist form state", err);
  }
}

function restoreFormState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const state = JSON.parse(stored);
      applyFormState({ ...DEFAULT_FORM_STATE, ...state });
      saveFormState();
      return;
    } catch (err) {
      console.warn("Unable to restore form state", err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  applyFormState(DEFAULT_FORM_STATE);
  saveFormState();
}

function clearFormState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Unable to clear form state", err);
  }
}

restoreFormState();

for (const element of document.querySelectorAll("#order input, #order select")) {
  const eventName = element.type === "checkbox" || element.tagName === "SELECT" ? "change" : "input";
  element.addEventListener(eventName, saveFormState);
  if (eventName !== "change") {
    element.addEventListener("change", saveFormState);
  }
}

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

const KNOWN_NETWORKS = {
  1: "mainnet",
  56: "bnb",
  100: "xdai",
  8453: "base",
  42161: "arbitrum_one",
  137: "polygon",
  43114: "avalanche",
  59144: "linea",
  11155111: "sepolia",
};

function network(chainId) {
  if (KNOWN_NETWORKS[chainId] === undefined) {
    throw new Error(`unsupported network ${chainId}`);
  }
  return KNOWN_NETWORKS[chainId];
}

function orderbookUrl(chainId, path) {
  const { orderbook } = parseQuery(window.location.search);
  let baseUrl;
  switch (orderbook || "barn") {
    case "prod":
    case "production":
      baseUrl = `https://api.cow.fi/${network(chainId)}`;
      break;
    case "barn":
    case "dev":
    case "staging":
      baseUrl = `https://barn.api.cow.fi/${network(chainId)}`;
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
    feeAmount: "0",
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

async function init() {
  await ethereum.request({ method: "eth_requestAccounts" });

  const { chainId } = await provider.getNetwork();

  return {
    chainId,
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
    if (
      !allowance.isZero() && allowance.sub(sellAmount).gte(0)
    ) {
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
    saveFormState();
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
    saveFormState();
  }),
);

document.querySelector("#quote").addEventListener(
  "click",
  handleError(async () => {
    const { chainId } = await init();

    const { sellAmount, buyAmount, ...order } = readOrder();
    let swapAmount;
    switch (order.kind) {
      case "sell":
        swapAmount = {
          sellAmountBeforeFee: sellAmount,
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

    const response = await fetch(orderbookUrl(chainId, "v1/quote"), {
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
    document.querySelector("#sellAmount").value = order.kind === "sell" ? BigInt(quote.sellAmount) + BigInt(quote.feeAmount) : quote.sellAmount;
    document.querySelector("#buyAmount").value = quote.buyAmount;
    document.querySelector("#quoteId").value = id;
    saveFormState();
  }),
);

document.querySelector("#reset").addEventListener(
  "click",
  () => {
    clearFormState();
    applyFormState(DEFAULT_FORM_STATE);
    saveFormState();
  },
);

document.querySelector("#sign").addEventListener(
  "click",
  handleError(async () => {
    const { chainId } = await init();

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
      orderbookUrl(chainId, "v1/orders"),
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
