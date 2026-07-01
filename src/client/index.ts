import amqb, { type ConfirmChannel } from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  getMaliciousLog,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { SimpleQueueType } from "../internal/pubsub/consume.js";
import { publishJSON, publishMsgPack } from "../internal/pubsub/publish.js";
import { subscribeJSON } from "../internal/pubsub/subscribe.js";
import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  GameLogSlug,
  PauseKey,
  WarRecognitionsPrefix,
} from "../internal/routing/routing.js";
import { handlerMove, handlerPause, handlerWar } from "./handlers.js";
import { type GameLog } from "../internal/gamelogic/logs.js";

const rabbitConnString = "amqp://guest:guest@localhost:5672/";
const conn = await amqb.connect(rabbitConnString);
export const confirmChannel = await conn.createConfirmChannel();
export function publishGameLog(
  ch: ConfirmChannel,
  username: string,
  message: string,
): Promise<void> {
  const gl: GameLog = {
    currentTime: new Date(),
    message: message,
    username: username,
  };

  return publishMsgPack(
    ch,
    ExchangePerilTopic,
    `${GameLogSlug}.${username}`,
    gl,
  );
}

async function main() {
  console.log("RabbitMQ was connected successfully");
  const clientUsername = await clientWelcome();
  const pauseQueueName = `${PauseKey}.${clientUsername}`;
  const armyMovesRoutingKey = `${ArmyMovesPrefix}.${clientUsername}`;

  console.log("Starting Peril client...");
  printClientHelp();

  const gameState = new GameState(clientUsername);

  // Subscribe to pause messages (direct exchange, per-client transient queue)
  subscribeJSON(
    conn,
    ExchangePerilDirect,
    pauseQueueName,
    PauseKey,
    SimpleQueueType.Transient,
    handlerPause(gameState),
  );

  // Subscribe to war messages (topic exchange, shared durable "war" queue, wildcard routing key)
  subscribeJSON(
    conn,
    ExchangePerilTopic,
    "war",
    `${WarRecognitionsPrefix}.*`,
    SimpleQueueType.Durable,
    handlerWar(gameState),
  );

  // Subscribe to army move messages (topic exchange, per-client transient queue)
  subscribeJSON(
    conn,
    ExchangePerilTopic,
    armyMovesRoutingKey,
    `${ArmyMovesPrefix}.*`,
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
        const move = commandMove(gameState, words);
        await publishJSON(
          confirmChannel,
          ExchangePerilTopic,
          armyMovesRoutingKey,
          move,
        );
        console.log("Your move was published successfully");
        break;
      case "status":
        commandStatus(gameState);
        break;
      case "spam":
        if (!words[1]) {
          console.log("The spam command requires an argument. e.g 'spam 10'.");
          break;
        }
        const spamNum = Number(words[1]);
        for (let i = 0; i < spamNum; i++) {
          const gl: GameLog = {
            username: clientUsername,
            message: getMaliciousLog(),
            currentTime: new Date(),
          };
          await publishMsgPack(
            confirmChannel,
            ExchangePerilTopic,
            `${GameLogSlug}.${clientUsername}`,
            gl,
          );
        }
        console.log("Spamming..");
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
