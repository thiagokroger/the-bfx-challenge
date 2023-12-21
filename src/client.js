const { PeerRPCClient } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");
const { v4: uuid } = require("uuid");
const Orderbook = require("./orderbook");

const {
  SERVICE_NAME,
  GRAPE_URL,
  ORDER_TYPE,
  ORDER_STATUS,
} = require("./constants");

class Client {
  constructor(centralOrderbook) {
    const link = new Link({
      grape: GRAPE_URL,
      requestTimeout: 10000,
    });

    link.start();

    this.peerClient = new PeerRPCClient(link, {});
    this.peerClient.init();

    this.clientId = uuid();
    this.orderbook = new Orderbook();
    this.centralOrderbook = centralOrderbook;
  }

  async submitOrder(order) {
    const orderId = uuid();
    const currentOrder = { ...order, id: orderId, status: ORDER_STATUS.NEW };

    try {
      await this.orderbook.addOrder(currentOrder);
    } catch (error) {
      console.error(`Error creating order: ${error}`);
    }

    try {
      const matchedOrder = await this.centralOrderbook.matchOrders(
        currentOrder
      );

      if (matchedOrder) {
        console.log(
          `[${orderId}] Matched - ${currentOrder.amount} ${currentOrder.coin} (${currentOrder.price}) with [${matchedOrder.id}] ${matchedOrder.amount} ${matchedOrder.coin} (${matchedOrder.price}).`
        );

        await this.centralOrderbook.updateStatus(
          matchedOrder.id,
          ORDER_STATUS.PENDING
        );

        const minAmount = Math.min(matchedOrder.amount, currentOrder.amount);

        matchedOrder.initialAmount =
          matchedOrder.initialAmount || matchedOrder.amount;
        matchedOrder.amount -= minAmount;

        if (matchedOrder.initialAmount === minAmount) {
          matchedOrder.match = currentOrder.id;
        }

        await this.centralOrderbook.updateOrder(matchedOrder.id, {
          ...matchedOrder,
          status:
            matchedOrder.amount > 0
              ? ORDER_STATUS.PARTIALLY_COMPLETED
              : ORDER_STATUS.COMPLETED,
        });

        if (
          currentOrder.amount - minAmount > 0 &&
          currentOrder.type === "BUY"
        ) {
          const newOrder = {
            type: order.type,
            coin: order.coin,
            price: order.price,
            amount: order.amount - minAmount,
          };

          currentOrder.amount = minAmount;
          currentOrder.initialAmount = minAmount;

          this.submitOrder(newOrder);
        } else {
          currentOrder.initialAmount = order.amount;
        }

        currentOrder.status =
          currentOrder.amount - minAmount > 0
            ? ORDER_STATUS.PARTIALLY_COMPLETED
            : ORDER_STATUS.COMPLETED;

        currentOrder.amount -= minAmount;

        if (
          currentOrder.initialAmount === minAmount ||
          currentOrder.type === "BUY"
        ) {
          currentOrder.match = matchedOrder.id;
        }

        await this.orderbook.updateOrder(orderId, currentOrder);
        await this.broadcastOrder(currentOrder);
      } else {
        await this.broadcastOrder(currentOrder);
      }
    } catch (error) {
      this.orderbook.updateStatus(orderId, ORDER_STATUS.ERROR);
      console.error(`Error processing order: ${error}`);
    }
  }

  async broadcastOrder(order) {
    return new Promise((resolve, reject) => {
      const payload = {
        ...order,
        clientId: this.clientId,
        action: ORDER_TYPE.ADD_NEW_ORDER,
      };

      this.peerClient.request(
        SERVICE_NAME,
        payload,
        { timeout: 10000 },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });
  }

  getOrders() {
    return this.orderbook.getOrders();
  }
}

module.exports = Client;
