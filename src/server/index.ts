import amqb from "amqplib";
import process from "node:process";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
import { createExchange, publishJSON } from "../internal/pubsub/publish.js";
import {
  ExchangePerilDirect,
  PauseKey,
  ExchangePerilTopic,
  GameLogSlug,
} from "../internal/routing/routing.js";
// import { PlayingState } from "../internal/gamelogic/gamestate.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqb.connect(rabbitConnString);
  const confirmChannel = await conn.createConfirmChannel();

  const _bindRes = await declareAndBind(
    conn,
    ExchangePerilTopic,
    "game_logs",
    `${GameLogSlug}.*`,
    SimpleQueueType.Durable,
  );

  console.log("RabbitMQ was connected successfully");

  // const ps: PlayingState = { isPaused: true };
  // const ps = { isPaused: true };
  // ExchangePerilTopic
  // await createExchange(confirmChannel, ExchangePerilDirect);
  // await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, ps);

  process.on("SIGINT", () => {
    console.log("Got SIGINT signal.");
    setTimeout(() => {
      console.log("Exiting...");
      conn.close();
      process.exit(0);
    }, 100);
  });

  console.log("Starting Peril server...");
  printServerHelp();
  while (true) {
    const input = await getInput();
    if (input.length === 0) continue;
    switch (input[0]) {
      case "pause":
        console.log("Server is sending a Pause message..");
        await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, {
          isPaused: true,
          stfu: null,
        });
        break;
      case "resume":
        console.log("Server is sending a Resume message..");
        await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, {
          isPaused: false,
        });
        break;
      case "quit":
        console.log("Server is quitting the game..");
        process.exit(0);
      default:
        console.log("Unrecognized command. Please, try again.");
        printServerHelp();
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
