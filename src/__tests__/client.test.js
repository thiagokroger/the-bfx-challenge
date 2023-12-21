const Orderbook = require("../orderbook");
const Client = require("../client");

jest.mock("grenache-nodejs-link", () => {
  const Link = jest.fn();
  Link.prototype.start = jest.fn();
  return Link;
});

jest.mock("grenache-nodejs-http", () => ({
  PeerRPCClient: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    request: jest.fn(),
  })),
}));

describe("Client", () => {
  let centralOrderbook;
  let client;

  beforeEach(() => {
    centralOrderbook = new Orderbook();
    client = new Client(centralOrderbook);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("submit order without match and broadcast error", async () => {
    const order = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };

    client.peerClient.request.mockImplementationOnce(
      (_service, _payload, _options, callback) =>
        callback(new Error("Mocked error"))
    );

    await client.submitOrder(order);

    expect(client.orderbook.getOrders()).toHaveLength(1);
    expect(client.orderbook.getOrders()[0].status).toBe("ERROR");
    expect(centralOrderbook.getOrders()).toHaveLength(0);
  });

  it("submit order without match and broadcast success", async () => {
    const order = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };

    client.peerClient.request.mockImplementationOnce(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("NEW");

    expect(centralOrderbook.getOrders()).toHaveLength(1);
    expect(centralOrderbook.getOrders()[0].status).toBe("NEW");
  });

  it("submit 2 orders and fetch from getOrders", async () => {
    const order1 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };

    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 12,
      amount: 5,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(2);

    expect(orders[0]).toMatchObject({
      ...order1,
      status: "NEW",
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      status: "NEW",
    });
  });

  it("SELL - submit order with match and check updates for SELLING exact amount", async () => {
    const order1 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 5,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(2);

    expect(orders[0]).toMatchObject({
      ...order1,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
      match: orders[0].id,
    });
  });

  it("SELL - submit order with match without buying total amount available (same price)", async () => {
    const order1 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 2,
    };
    const order3 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 2,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(3);

    expect(orders[0]).toMatchObject({
      ...order1,
      amount: 1,
      initialAmount: 5,
      status: "PARTIALLY_COMPLETED",
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[0].id,
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[0].id,
    });
  });

  it("SELL - submit order with match buying total amount available (same price)", async () => {
    const order1 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 2,
    };
    const order3 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 4,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(3);

    expect(orders[0]).toMatchObject({
      ...order1,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[0].id,
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 1,
      initialAmount: 4,
      status: "PARTIALLY_COMPLETED",
    });
  });

  it("SELL - submit order with match without buying total amount available (different prices)", async () => {
    const order1 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 12, // Higher than buy price
      amount: 3,
    };
    const order3 = {
      type: "SELL",
      coin: "BTC",
      price: 9, // Lower than buy price
      amount: 2,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(3);

    expect(orders[0]).toMatchObject({
      ...order1,
      amount: 3,
      initialAmount: 5,
      status: "PARTIALLY_COMPLETED",
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      status: "NEW",
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[0].id,
    });
  });

  it("SELL - submit order with match buying total amount available (different prices)", async () => {
    const order1 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 12, // Higher than buy price
      amount: 3,
    };
    const order3 = {
      type: "SELL",
      coin: "BTC",
      price: 9, // Lower than buy price
      amount: 5,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(3);

    expect(orders[0]).toMatchObject({
      ...order1,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
      match: orders[2].id,
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      status: "NEW",
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
      match: orders[0].id,
    });
  });

  it("BUY - submit order with match and check updates for BUYING exact amount", async () => {
    const order1 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 5,
    };
    const order2 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(2);

    expect(orders[0]).toMatchObject({
      ...order1,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
      match: orders[1].id,
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
      match: orders[0].id,
    });
  });

  it("BUY - submit order with match without buying total amount available (same price)", async () => {
    const order1 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 2,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 2,
    };

    const order3 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 3,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(4);

    expect(orders[0]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[2].id,
    });

    expect(orders[1]).toMatchObject({
      ...order1,
      amount: 1,
      initialAmount: 2,
      status: "PARTIALLY_COMPLETED",
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[0].id,
    });

    expect(orders[3]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 1,
      status: "COMPLETED",
      match: orders[1].id,
    });
  });

  it("BUY - submit order with match buying total amount available (same price)", async () => {
    const order1 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 2,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 10,
      amount: 4,
    };
    const order3 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 6,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(4);

    expect(orders[0]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[2].id,
    });

    expect(orders[1]).toMatchObject({
      ...order1,
      amount: 0,
      initialAmount: 4,
      status: "COMPLETED",
      match: orders[3].id,
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[0].id,
    });

    expect(orders[3]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 4,
      status: "COMPLETED",
      match: orders[1].id,
    });
  });

  it("BUY - submit order with match without buying total amount available (different prices)", async () => {
    const order1 = {
      type: "SELL",
      coin: "BTC",
      price: 12, // Higher than buy price
      amount: 3,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 9, // Lower than buy price
      amount: 2,
    };
    const order3 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(4);

    expect(orders[0]).toMatchObject({
      ...order1,
      status: "NEW",
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[2].id,
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 2,
      status: "COMPLETED",
      match: orders[1].id,
    });

    expect(orders[3]).toMatchObject({
      ...order3,
      amount: 3,
      status: "NEW",
    });
  });

  it("BUY - submit order with match buying total amount available (different prices)", async () => {
    const order1 = {
      type: "SELL",
      coin: "BTC",
      price: 12, // Higher than buy price
      amount: 3,
    };
    const order2 = {
      type: "SELL",
      coin: "BTC",
      price: 9, // Lower than buy price
      amount: 5,
    };
    const order3 = {
      type: "BUY",
      coin: "BTC",
      price: 10,
      amount: 5,
    };

    client.peerClient.request.mockImplementation(
      (_service, payload, _options, callback) => {
        const { action, ...order } = payload;
        centralOrderbook.addOrder(order);
        callback(null, "SUCCESS");
      }
    );

    await client.submitOrder(order1);
    await client.submitOrder(order2);
    await client.submitOrder(order3);

    const orders = centralOrderbook.getOrders();

    expect(orders).toHaveLength(3);

    expect(orders[0]).toMatchObject({
      ...order1,
      status: "NEW",
    });

    expect(orders[1]).toMatchObject({
      ...order2,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
      match: orders[2].id,
    });

    expect(orders[2]).toMatchObject({
      ...order3,
      amount: 0,
      initialAmount: 5,
      status: "COMPLETED",
      match: orders[1].id,
    });
  });
});
