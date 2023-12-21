const { Grape } = require("grenache-grape");
const startGrape = require("../startGrape");

jest.mock("grenache-grape", () => {
  const Grape = jest.fn();
  Grape.prototype.start = jest.fn();
  return { Grape };
});

describe("startGrape", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should log a failed start of the Grape network", (done) => {
    Grape.prototype.start.mockImplementationOnce((callback) => {
      callback(new Error("Failed to start Grape network"));
    });

    console.error = jest.fn();

    startGrape();

    expect(Grape.prototype.start).toHaveBeenCalled();

    setTimeout(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Error starting grape",
        expect.any(Error)
      );

      done();
    }, 0);
  });

  it("should start the Grape network", (done) => {
    Grape.prototype.start.mockImplementationOnce((callback) => callback(null));

    console.log = jest.fn();

    startGrape();

    expect(console.log).toHaveBeenCalledWith("Grape network is running");

    setTimeout(() => {
      done();
    }, 0);
  });
});
