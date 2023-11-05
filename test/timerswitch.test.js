const helper = require("node-red-node-test-helper");
const timerswitchNode = require("../timerswitch.js");

jest.useFakeTimers();
jest.spyOn(global, "setTimeout");
jest.spyOn(global, "setInterval");

describe("timerswitch.test.js", () => {
  beforeEach(() => {
    global.console = require("console");
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    helper.unload();
  });

  let DEFAULT_FLOW = [
    {
      id: "n1",
      type: "timerswitch",
      name: "",
      ontopic: "",
      offtopic: "",
      onpayload: "",
      offpayload: "",
      disabled: false,
      schedules: [
        {
          // Skip Saturdays
          on_days: [true, true, true, true, true, true, false],
          on_h: "00",
          on_m: "00",
          on_s: "00",
          off_h: "00",
          off_m: "01",
          off_s: "00",
          valid: true,
        },
      ],
      wires: [[]],
    },
  ];

  const getNode = async (nodeId) => {
    let node = null;
    await helper.load(timerswitchNode, DEFAULT_FLOW, () => {
      node = helper.getNode(nodeId);
    });
    return node;
  };
  describe("send", () => {
    describe("when scheduled time starts", () => {
      it("sends on", async () => {
        const n = await getNode("n1");
        n.send = jest.fn();

        jest.setSystemTime(new Date("2023-11-05T23:59:59"));
        jest.advanceTimersByTime(1000);

        expect(n.send.mock.calls).toHaveLength(1);
        expect(n.send.mock.calls[0][0].payload).toBe("off");
        expect(n.scheduler.state()).toBe("off");

        jest.advanceTimersByTime(1000);

        expect(n.send.mock.calls).toHaveLength(2);
        expect(n.send.mock.calls[1][0].payload).toBe("on");
        expect(n.scheduler.state()).toBe("on");
      });
    });

    describe("when scheduled time ends", () => {
      it("sends off", async () => {
        const n = await getNode("n1");
        n.send = jest.fn();

        jest.setSystemTime(new Date("2023-11-05T23:59:59")); // 1s before start
        jest.advanceTimersByTime(2000);

        expect(n.scheduler.state()).toBe("on");

        jest.advanceTimersByTime(60000); // run to end of scheduled time

        expect(n.send.mock.calls).toHaveLength(3);
        expect(n.send.mock.calls[0][0].payload).toBe("off");
        expect(n.send.mock.calls[1][0].payload).toBe("on");
        expect(n.send.mock.calls[2][0].payload).toBe("off");
        expect(n.scheduler.state()).toBe("off");
        expect(new Date()).toStrictEqual(new Date("2023-11-06T00:01:01"));
      });
    });

    describe("when on a skipped/off day", () => {
      it("stays off when started on skipped day", async () => {
        // 4th is a skipped day
        jest.setSystemTime(new Date("2023-11-04T00:00:30"));
        const n = await getNode("n1");
        n.send = jest.fn();


        jest.advanceTimersByTime(1000);

        expect(n.send.mock.calls).toHaveLength(1);
        expect(n.send.mock.calls[0][0].payload).toBe("off");
        expect(n.scheduler.state()).toBe("off");
      });

      it("stays off when started before skipped time", async () => {
        // 4th is a skipped day
        jest.setSystemTime(new Date("2023-11-03T23:59:59"));
        const n = await getNode("n1");
        n.send = jest.fn();

        jest.advanceTimersByTime(2000);

        expect(n.send.mock.calls).toHaveLength(1);
        expect(n.send.mock.calls[0][0].payload).toBe("off");
        expect(n.scheduler.state()).toBe("off");
      });
    });

    describe("with payload", () => {
      it("sends on instantly", async () => {
        const n = await getNode("n1");
        n.send = jest.fn();

        n.receive({ payload: "on" });

        expect(n.send.mock.calls).toHaveLength(1);
        expect(n.send.mock.calls[0][0].payload).toBe("on");
        expect(n.scheduler.state()).toBe("on");
      });
    });
  });
});
