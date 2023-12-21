const { ORDER_STATUS } = require("../constants");
const Orderbook = require("../orderbook");

describe("Orderbook", () => {
  let orderbook;

  beforeEach(() => {
    orderbook = new Orderbook();
  });

  it("should add an order to the orderbook", async () => {
    const order = {
      id: "1",
      type: "BUY",
      price: 10,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    await orderbook.addOrder(order);
    const orders = orderbook.getOrders();

    expect(orders.length).toBe(1);
    expect(orders[0]).toEqual(order);
  });

  it("should update the status of an order", async () => {
    const order = {
      id: "1",
      type: "BUY",
      price: 10,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    await orderbook.addOrder(order);
    await orderbook.updateStatus("1", ORDER_STATUS.PENDING);
    const updatedOrder = orderbook.getOrders()[0];

    expect(updatedOrder.status).toBe(ORDER_STATUS.PENDING);
  });

  it("should not update status for an unexistent order", async () => {
    const unexistentOrderId = "nonexistentOrderId";
    const newStatus = ORDER_STATUS.PENDING;

    console.error = jest.fn();

    await orderbook.updateStatus(unexistentOrderId, newStatus);

    expect(console.error).toHaveBeenCalledWith(
      `Order with ID ${unexistentOrderId} not found.`
    );
  });

  it("should update the details of an order", async () => {
    const order = {
      id: "1",
      type: "BUY",
      price: 10,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    await orderbook.addOrder(order);
    await orderbook.updateOrder("1", { price: 15 });
    const updatedOrder = orderbook.getOrders()[0];

    expect(updatedOrder.price).toBe(15);
  });

  it("should not update order for an unexistent order", async () => {
    const unexistentOrderId = "nonexistentOrderId";
    const updatedOrder = {
      type: "BUY",
      price: 15,
      coin: "BTC",
    };

    console.error = jest.fn();

    await orderbook.updateOrder(unexistentOrderId, updatedOrder);

    expect(console.error).toHaveBeenCalledWith(
      `Order with ID ${unexistentOrderId} not found.`
    );
  });

  it("should match orders for a BUY order", async () => {
    const buyOrder = {
      id: "1",
      type: "BUY",
      price: 10,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    const sellOrder = {
      id: "2",
      type: "SELL",
      price: 8,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    await orderbook.addOrder(buyOrder);
    await orderbook.addOrder(sellOrder);

    const matchedOrder = await orderbook.matchOrders(buyOrder);

    expect(matchedOrder).toEqual(sellOrder);
  });

  it("should not match orders without a current order", async () => {
    const matchedOrder = await orderbook.matchOrders();
    expect(matchedOrder).toBeUndefined();
  });

  it("should not match orders with a completed current order", async () => {
    const completedOrder = {
      id: "1",
      type: "BUY",
      price: 10,
      coin: "BTC",
      status: ORDER_STATUS.COMPLETED,
    };

    await orderbook.addOrder(completedOrder);

    const matchedOrder = await orderbook.matchOrders(completedOrder);

    expect(matchedOrder).toBeUndefined();
  });

  it("should match orders for a SELL order", async () => {
    const sellOrder = {
      id: "1",
      type: "SELL",
      price: 10,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    const buyOrder = {
      id: "2",
      type: "BUY",
      price: 12,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    await orderbook.addOrder(sellOrder);
    await orderbook.addOrder(buyOrder);

    const matchedOrder = await orderbook.matchOrders(sellOrder);

    expect(matchedOrder).toEqual(buyOrder);
  });

  it("should match orders for a BUY order - sort is working and getting the best order", async () => {
    const buyOrder = {
      id: "1",
      type: "BUY",
      price: 15,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    const sellOrder1 = {
      id: "2",
      type: "SELL",
      price: 12,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    const sellOrder2 = {
      id: "3",
      type: "SELL",
      price: 14,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    await orderbook.addOrder(buyOrder);
    await orderbook.addOrder(sellOrder1);
    await orderbook.addOrder(sellOrder2);

    const matchedOrder = await orderbook.matchOrders(buyOrder);

    expect(matchedOrder).toEqual(sellOrder1);
  });

  it("should match orders for a SELL order - sort is working and getting the best order", async () => {
    const sellOrder = {
      id: "1",
      type: "SELL",
      price: 20,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    const buyOrder1 = {
      id: "2",
      type: "BUY",
      price: 22,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    const buyOrder2 = {
      id: "3",
      type: "BUY",
      price: 18,
      coin: "BTC",
      status: ORDER_STATUS.NEW,
    };

    await orderbook.addOrder(sellOrder);
    await orderbook.addOrder(buyOrder1);
    await orderbook.addOrder(buyOrder2);

    const matchedOrder = await orderbook.matchOrders(sellOrder);

    expect(matchedOrder).toEqual(buyOrder1);
  });
});
