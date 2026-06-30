import amqb from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { subscribeJSON } from "../internal/pubsub/subscribe.js";
import {
  ExchangePerilDirect,
  ExchangePerilTopic,
  PauseKey,
} from "../internal/routing/routing.js";
import { handlerMove, handlerPause } from "./handlers.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqb.connect(rabbitConnString);
  const confirmChannel = await conn.createConfirmChannel();
  console.log("RabbitMQ was connected successfully");
  const clientUsername = await clientWelcome();
  const queueName = `${PauseKey}.${clientUsername}`;
  const routingKey = `army_moves.${clientUsername}`;
  const _bindRes = await declareAndBind(
    conn,
    ExchangePerilDirect,
    queueName,
    PauseKey,
    SimpleQueueType.Transient,
  );

  console.log("Starting Peril client...");

  printClientHelp();
  const gameState = new GameState(clientUsername);
  // const validUnits = ["infantry", "cavalry", "artillery"];
  // const validLocations = ["americas", "europe", "africa", "asia", "antarctica", "australia"];
  subscribeJSON(
    conn,
    ExchangePerilDirect,
    queueName,
    PauseKey,
    SimpleQueueType.Transient,
    handlerPause(gameState),
  );

  subscribeJSON(
    conn,
    ExchangePerilTopic,
    routingKey,
    "army_moves.*",
    SimpleQueueType.Transient,
    handlerMove(gameState),
  );

  while (true) {
    const words = await getInput();
    if (words.length === 0) continue;
    switch (words[0]) {
      case "spawn":
        commandSpawn(gameState, words);
        break;
      case "move":
        commandMove(gameState, words);
        await publishJSON(confirmChannel, ExchangePerilTopic, routingKey, {
          moved: true,
        });
        console.log("Your move was published successfully");
        break;
      case "status":
        commandStatus(gameState);
        break;
      case "spam":
        console.log("Spamming not allowed yet!");
        break;
      case "quit":
        printQuit();
        process.exit(0);
      default:
        console.log("\nUnrecognized command. Please, try again.");
        printClientHelp();
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
