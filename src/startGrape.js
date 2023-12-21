const { Grape } = require("grenache-grape");

const startGrape = () => {
  const grape = new Grape({
    host: "127.0.0.1",
    dht_port: 20001,
    dht_bootstrap: ["127.0.0.1:20002"],
    api_port: 30001,
  });

  grape.start((error) => {
    if (error) console.error(`Error starting grape`, error);
    else console.log(`Grape network is running`);
  });
};

module.exports = startGrape;
