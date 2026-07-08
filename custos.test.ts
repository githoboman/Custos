import { describe, expect, it, beforeEach } from "vitest";
import { initSimnet } from "@stacks/clarinet-sdk";
import { Cl } from "@stacks/transactions";

const CONTRACT = "custos";
const TOKEN = "mock-usdcx";

let simnet: Awaited<ReturnType<typeof initSimnet>>;
let deployer: string, client: string, freelancer: string, stranger: string;
let tokenPrincipal: string; // `${deployer}.mock-usdcx`
let ftAssetId: string; // key used inside getAssetsMap(): `${tokenPrincipal}::mock-usdcx`

// Everyone starts with a big USDCx balance so token transfers never fail for
// lack of funds -- these tests are about the escrow logic, not the token.
const START_BALANCE = 1_000_000_000n;

beforeEach(async () => {
  simnet = await initSimnet();
  const accounts = simnet.getAccounts();
  deployer = accounts.get("deployer")!;
  client = accounts.get("wallet_1")!;
  freelancer = accounts.get("wallet_2")!;
  stranger = accounts.get("wallet_3")!;

  tokenPrincipal = `${deployer}.${TOKEN}`;
  // clarinet-sdk keys FT balances as `.<contract-name>.<ft-name>` (no deployer
  // prefix, dot-separated), with the holder principal as the inner-map key.
  ftAssetId = `.${TOKEN}.${TOKEN}`;

  // Mint USDCx to the parties that need to spend it.
  for (const who of [client, freelancer, stranger]) {
    simnet.callPublicFn(
      TOKEN,
      "mint",
      [Cl.uint(START_BALANCE), Cl.principal(who)],
      deployer
    );
  }
});

// token argument every fund-moving custos function now requires
function tokenArg() {
  return Cl.contractPrincipal(deployer, TOKEN);
}

function create(opts: {
  freelancer: string;
  upfront: number;
  lock: number;
  deliveryWindow: number;
  approvalWindow: number;
  sender: string;
}) {
  return simnet.callPublicFn(
    CONTRACT,
    "create-retainer",
    [
      tokenArg(),
      Cl.principal(opts.freelancer),
      Cl.uint(opts.upfront),
      Cl.uint(opts.lock),
      Cl.uint(opts.deliveryWindow),
      Cl.uint(opts.approvalWindow),
    ],
    opts.sender
  );
}

function markDelivered(id: number, sender: string) {
  return simnet.callPublicFn(CONTRACT, "mark-delivered", [Cl.uint(id)], sender);
}

function approve(id: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT,
    "approve-and-release",
    [Cl.uint(id), tokenArg()],
    sender
  );
}

function autoRelease(id: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT,
    "auto-release",
    [Cl.uint(id), tokenArg()],
    sender
  );
}

function disputeIt(id: number, sender: string) {
  return simnet.callPublicFn(CONTRACT, "dispute", [Cl.uint(id)], sender);
}

function resolve(id: number, freelancerAmount: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT,
    "resolve-dispute",
    [Cl.uint(id), Cl.uint(freelancerAmount), tokenArg()],
    sender
  );
}

function reclaimAbandoned(id: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT,
    "reclaim-abandoned",
    [Cl.uint(id), tokenArg()],
    sender
  );
}

// USDCx (mock) balance, replacing the STX balance helper from the STX version.
function tokenBalance(who: string): bigint {
  return simnet.getAssetsMap().get(ftAssetId)?.get(who) ?? 0n;
}

// Standard retainer used across most tests: 2000 upfront, 8000 escrowed,
// 10 blocks to deliver, 20 blocks for the client to act after delivery.
function createStandard() {
  return create({
    freelancer,
    upfront: 2000,
    lock: 8000,
    deliveryWindow: 10,
    approvalWindow: 20,
    sender: client,
  });
}

describe("create-retainer", () => {
  it("pays the upfront split immediately, escrows the rest in the contract", () => {
    const freelancerBefore = tokenBalance(freelancer);
    const clientBefore = tokenBalance(client);

    const { result } = createStandard();
    expect(result).toBeOk(Cl.uint(0));

    expect(tokenBalance(freelancer)).toBe(freelancerBefore + 2000n);
    expect(tokenBalance(client)).toBe(clientBefore - 10000n);
    expect(tokenBalance(`${deployer}.${CONTRACT}`)).toBe(8000n);
  });

  it("rejects client == freelancer", () => {
    const { result } = create({
      freelancer: client,
      upfront: 100,
      lock: 100,
      deliveryWindow: 10,
      approvalWindow: 10,
      sender: client,
    });
    expect(result).toBeErr(Cl.uint(106));
  });

  it("rejects a zero delivery window or approval window", () => {
    const noDelivery = create({
      freelancer,
      upfront: 100,
      lock: 100,
      deliveryWindow: 0,
      approvalWindow: 10,
      sender: client,
    });
    expect(noDelivery.result).toBeErr(Cl.uint(107));

    const noApproval = create({
      freelancer,
      upfront: 100,
      lock: 100,
      deliveryWindow: 10,
      approvalWindow: 0,
      sender: client,
    });
    expect(noApproval.result).toBeErr(Cl.uint(107));
  });

  it("rejects a totally zero-value retainer", () => {
    const { result } = create({
      freelancer,
      upfront: 0,
      lock: 0,
      deliveryWindow: 10,
      approvalWindow: 10,
      sender: client,
    });
    expect(result).toBeErr(Cl.uint(105));
  });

  it("assigns sequential ids so a client can hold multiple concurrent retainers", () => {
    const first = createStandard();
    const second = create({
      freelancer: stranger,
      upfront: 100,
      lock: 100,
      deliveryWindow: 10,
      approvalWindow: 10,
      sender: client,
    });
    expect(first.result).toBeOk(Cl.uint(0));
    expect(second.result).toBeOk(Cl.uint(1));
  });
});

describe("mark-delivered", () => {
  beforeEach(() => {
    createStandard();
  });

  it("rejects delivery confirmation from anyone but the freelancer", () => {
    const { result } = markDelivered(0, stranger);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects delivery confirmation from the client themselves", () => {
    const { result } = markDelivered(0, client);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("moves state to delivered and opens the approval window", () => {
    const { result } = markDelivered(0, freelancer);
    expect(result).toBeOk(Cl.bool(true));

    const { result: record } = simnet.callReadOnlyFn(
      CONTRACT,
      "get-retainer",
      [Cl.uint(0)],
      deployer
    );
    const tuple = (record as any).value.value;
    expect(tuple.state.value).toBe("delivered");
  });

  it("rejects delivery confirmation after the delivery-deadline", () => {
    simnet.mineEmptyBlocks(11);
    const { result } = markDelivered(0, freelancer);
    expect(result).toBeErr(Cl.uint(109));
  });

  it("rejects a second delivery confirmation on an already-delivered retainer", () => {
    markDelivered(0, freelancer);
    const { result } = markDelivered(0, freelancer);
    expect(result).toBeErr(Cl.uint(102));
  });
});

describe("approve-and-release", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
  });

  it("rejects approval from anyone but the client", () => {
    const { result } = approve(0, freelancer);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("pays the full lock-amount to the freelancer immediately on approval", () => {
    const before = tokenBalance(freelancer);
    const { result } = approve(0, client);
    expect(result).toBeOk(Cl.bool(true));
    expect(tokenBalance(freelancer)).toBe(before + 8000n);
    expect(tokenBalance(`${deployer}.${CONTRACT}`)).toBe(0n);
  });

  it("rejects approval on a retainer that hasn't been delivered", () => {
    createStandard(); // id 1, never delivered
    const { result } = approve(1, client);
    expect(result).toBeErr(Cl.uint(103));
  });

  it("rejects a second approval on an already-paid retainer", () => {
    approve(0, client);
    const { result } = approve(0, client);
    expect(result).toBeErr(Cl.uint(103));
  });
});

describe("auto-release", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
  });

  it("rejects auto-release before the approval-deadline", () => {
    const { result } = autoRelease(0, stranger);
    expect(result).toBeErr(Cl.uint(108));
  });

  it("pays the freelancer once the client has gone silent past the approval-deadline", () => {
    simnet.mineEmptyBlocks(21);
    const before = tokenBalance(freelancer);
    // anyone can trigger it, not just the freelancer
    const { result } = autoRelease(0, stranger);
    expect(result).toBeOk(Cl.bool(true));
    expect(tokenBalance(freelancer)).toBe(before + 8000n);
  });

  it("cannot be triggered once the client already approved", () => {
    approve(0, client);
    simnet.mineEmptyBlocks(21);
    const { result } = autoRelease(0, stranger);
    expect(result).toBeErr(Cl.uint(103));
  });

  it("cannot be triggered once the client has disputed", () => {
    disputeIt(0, client);
    simnet.mineEmptyBlocks(21);
    const { result } = autoRelease(0, stranger);
    expect(result).toBeErr(Cl.uint(103));
  });
});

describe("dispute", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
  });

  it("rejects a dispute from anyone but the client", () => {
    const { result } = disputeIt(0, freelancer);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects a dispute after the approval-deadline has passed", () => {
    simnet.mineEmptyBlocks(21);
    const { result } = disputeIt(0, client);
    expect(result).toBeErr(Cl.uint(111));
  });

  it("freezes the retainer in disputed state, no funds move yet", () => {
    const before = tokenBalance(freelancer);
    const { result } = disputeIt(0, client);
    expect(result).toBeOk(Cl.bool(true));
    expect(tokenBalance(freelancer)).toBe(before);
    expect(tokenBalance(`${deployer}.${CONTRACT}`)).toBe(8000n);
  });
});

describe("resolve-dispute", () => {
  beforeEach(() => {
    createStandard();
    markDelivered(0, freelancer);
    disputeIt(0, client);
  });

  it("records a lone proposal and waits for the other party", () => {
    const { result } = resolve(0, 6000, client);
    expect(result).toBeOk(Cl.bool(false));

    const { result: stored } = simnet.callReadOnlyFn(
      CONTRACT,
      "get-dispute-proposal",
      [Cl.uint(0), Cl.principal(client)],
      deployer
    );
    expect(stored).toBeSome(Cl.uint(6000));
  });

  it("executes the split once both parties propose the same freelancer-amount", () => {
    resolve(0, 6000, client);
    const freelancerBefore = tokenBalance(freelancer);
    const clientBefore = tokenBalance(client);

    const { result } = resolve(0, 6000, freelancer);
    expect(result).toBeOk(Cl.bool(true));

    expect(tokenBalance(freelancer)).toBe(freelancerBefore + 6000n);
    expect(tokenBalance(client)).toBe(clientBefore + 2000n); // 8000 - 6000 back to client
    expect(tokenBalance(`${deployer}.${CONTRACT}`)).toBe(0n);
  });

  it("does not execute when proposals disagree, and stays frozen", () => {
    resolve(0, 6000, client);
    const { result } = resolve(0, 3000, freelancer);
    expect(result).toBeOk(Cl.bool(false));
    expect(tokenBalance(`${deployer}.${CONTRACT}`)).toBe(8000n);
  });

  it("rejects a proposal from anyone other than the client or freelancer", () => {
    const { result } = resolve(0, 6000, stranger);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects a proposal exceeding the escrowed lock-amount", () => {
    const { result } = resolve(0, 9000, client);
    expect(result).toBeErr(Cl.uint(112));
  });

  it("rejects resolve-dispute on a retainer that isn't disputed", () => {
    createStandard(); // id 1, still active
    const { result } = resolve(1, 100, client);
    expect(result).toBeErr(Cl.uint(104));
  });

  it("supports a full-refund-to-client split (freelancer-amount = 0)", () => {
    resolve(0, 0, client);
    const clientBefore = tokenBalance(client);
    const { result } = resolve(0, 0, freelancer);
    expect(result).toBeOk(Cl.bool(true));
    expect(tokenBalance(client)).toBe(clientBefore + 8000n);
  });
});

describe("reclaim-abandoned", () => {
  beforeEach(() => {
    createStandard();
  });

  it("rejects reclaim before the delivery-deadline", () => {
    const { result } = reclaimAbandoned(0, client);
    expect(result).toBeErr(Cl.uint(110));
  });

  it("rejects reclaim from anyone but the client", () => {
    simnet.mineEmptyBlocks(11);
    const { result } = reclaimAbandoned(0, freelancer);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("returns the lock-amount to the client once the freelancer never delivered in time", () => {
    simnet.mineEmptyBlocks(11);
    const before = tokenBalance(client);
    const { result } = reclaimAbandoned(0, client);
    expect(result).toBeOk(Cl.bool(true));
    expect(tokenBalance(client)).toBe(before + 8000n);
  });

  it("cannot be reclaimed once the freelancer already marked it delivered", () => {
    markDelivered(0, freelancer);
    simnet.mineEmptyBlocks(11);
    const { result } = reclaimAbandoned(0, client);
    expect(result).toBeErr(Cl.uint(102));
  });
});

describe("get-retainer", () => {
  it("returns none for an unknown id", () => {
    const { result } = simnet.callReadOnlyFn(
      CONTRACT,
      "get-retainer",
      [Cl.uint(0)],
      deployer
    );
    expect(result).toBeNone();
  });
});

// New coverage specific to the SIP-010 port: a retainer is bound to the token
// it was created with, and later fund-moving calls must present that same
// token or be rejected with ERR-WRONG-TOKEN (u113).
describe("token binding (SIP-010 port)", () => {
  it("records the token the retainer was denominated in", () => {
    createStandard();
    const { result } = simnet.callReadOnlyFn(
      CONTRACT,
      "get-retainer",
      [Cl.uint(0)],
      deployer
    );
    const tuple = (result as any).value.value;
    expect(tuple.token.value).toBe(tokenPrincipal);
  });

  it("rejects approve-and-release presented with a different SIP-010 token", () => {
    createStandard(); // denominated in mock-usdcx
    markDelivered(0, freelancer);
    // present a *different* valid SIP-010 token (mock-token-b) -- wrong principal
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "approve-and-release",
      [Cl.uint(0), Cl.contractPrincipal(deployer, "mock-token-b")],
      client
    );
    expect(result).toBeErr(Cl.uint(113));
  });

  it("moves real USDCx units, not STX", () => {
    const stxBefore =
      simnet.getAssetsMap().get("STX")?.get(freelancer) ?? 0n;
    createStandard();
    markDelivered(0, freelancer);
    approve(0, client);
    // freelancer got 2000 upfront + 8000 released = 10000 USDCx
    expect(tokenBalance(freelancer)).toBe(START_BALANCE + 10000n);
    // and their STX balance was untouched by the retainer flow
    const stxAfter = simnet.getAssetsMap().get("STX")?.get(freelancer) ?? 0n;
    expect(stxAfter).toBe(stxBefore);
  });
});
