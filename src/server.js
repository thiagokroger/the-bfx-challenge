"use strict";

const { PeerRPCServer } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");
const AsyncLock = require("async-lock");
const {
  SERVICE_NAME,
  GRAPE_URL,
  ORDER_TYPE,
  ORDER_STATUS,
} = require("./constants");
const Orderbook = require("./orderbook");
const startGrape = require("./startGrape");
const Client = require("./client");

startGrape();

const link = new Link({
  grape: GRAPE_URL,
});

link.start();

const peer = new PeerRPCServer(link, {
  timeout: 300000,
});

peer.init();

const service = peer.transport("server");
const PORT = Math.floor(Math.random() * 1000) + 1024;
service.listen(PORT);

setInterval(() => {
  link.announce(SERVICE_NAME, service.port, {});
}, 1000);

const centralOrderbook = new Orderbook();
const lock = new AsyncLock();

const addOrderHandler = async (payload) => {
  const { action, ...order } = payload;
  console.log(`Received order [${order.id}] from client: ${order.clientId}.`);

  await lock.acquire(order.clientId, async () => {
    try {
      await centralOrderbook.addOrder(order);
    } catch (error) {
      await centralOrderbook.updateStatus(order.id, ORDER_STATUS.ERROR);
      throw error;
    }
  });
};

service.on("request", async (_rid, _key, payload, handler) => {
  if (payload.action === ORDER_TYPE.ADD_NEW_ORDER) {
    try {
      await addOrderHandler(payload);
      return handler.reply(null, "SUCCESS");
    } catch (error) {
      return handler.reply(error);
    }
  }

  if (payload.action === ORDER_TYPE.LIST_ALL_ORDERS) {
    const data = centralOrderbook.getOrders();
    return handler.reply(null, data);
  }

  handler.reply(null, null);
});

if (process.env.SIMULATION === "true") {
  const randomDecimal = (min, max, decimals) => {
    const rand = min + Math.random() * (max - min);
    const power = Math.pow(10, decimals);
    return Math.floor(rand * power) / power;
  };

  setInterval(() => {
    const data = centralOrderbook.getOrders();
    console.log(data);
  }, 4000);

  (async () => {
    setInterval(() => {
      const client = new Client(centralOrderbook);

      client.submitOrder({
        type: Math.random() > 0.5 ? "SELL" : "BUY",
        coin: "BTC",
        price: randomDecimal(30000, 50000, 2),
        amount: randomDecimal(1, 2, 8),
      });
    }, 5000);
  })();
}
