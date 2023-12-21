# Bitfinex Backend Challenge

Simplified P2P distributed exchange backend service using Bitfinex microservice framework [Grenache](https://github.com/bitfinexcom/grenache), which uses the BitTorrent protocol.

# Requirement & Tips

- Code in Javascript
- Use Grenache for communication between nodes
- Simple order matching engine
- You don't need to create a UI or HTTP API
- You don't need to store state in a DB or filesystem
- It is possible to solve the task with the node std lib, async and grenache libraries
- beware of race conditions!
- No need for express or any other http api layers

# Details

- Each client will have its own instance of the orderbook.
- Clients submit orders to their own instance of orderbook. The order is distributed to other instances, too.
- If a client's order matches with another order, any remainer is added to the orderbook, too.

# Possible improvements

- Break down the large classes (Client and Orderbook) into smaller, more focused classes or modules. This will make the code easier to understand, test, and maintain.
- Improve error handling throughout the code. Ensure that potential errors are caught and handled appropriately. Log detailed error messages to aid in debugging.
- Perform locking mechanisms to improve race conditions.
- Performance optimizations: there are areas where asynchronous operations can be parallelized or optimized.

# Steps to run

## Install Dependencies

npm i

## Start the main server

npm run start

## Start the main server with simulation to generate random orders

npm run simulation

## Run tests

npm run test
