const { ORDER_STATUS } = require("./constants");

class Orderbook {
  constructor() {
    this.orders = new Map();
  }

  async addOrder(order) {
    this.orders.set(order.id, order);
    console.log(
      `[${order.id}] - ${order.type} ${order.price} ${order.coin} order added.`
    );
  }

  async updateStatus(id, status) {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      this.orders.set(id, order);
    } else {
      console.error(`Order with ID ${id} not found.`);
    }
  }

  async updateOrder(id, updatedOrder) {
    const order = this.orders.get(id);
    if (order) {
      this.orders.set(id, {
        ...order,
        ...updatedOrder,
      });
    } else {
      console.error(`Order with ID ${id} not found.`);
    }
  }

  async matchOrders(currentOrder) {
    if (!currentOrder || currentOrder.status === ORDER_STATUS.COMPLETED) {
      return;
    }

    const availableOrders = Array.from(this.orders.values()).filter(
      (order) =>
        order.status === ORDER_STATUS.NEW ||
        order.status === ORDER_STATUS.PARTIALLY_COMPLETED
    );

    if (currentOrder.type === "BUY") {
      const bestOrder = availableOrders
        .filter((order) => order.type === "SELL")
        .sort((a, b) => a.price - b.price)
        .find((order) => order.price <= currentOrder.price);

      return bestOrder;
    } else {
      const bestOrder = availableOrders
        .filter((order) => order.type === "BUY")
        .sort((a, b) => b.price - a.price)
        .find((order) => order.price >= currentOrder.price);

      return bestOrder;
    }
  }

  getOrders() {
    return Array.from(this.orders.values());
  }
}

module.exports = Orderbook;
