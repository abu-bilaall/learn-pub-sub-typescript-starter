import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js"
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js"
import type { ArmyMove, RecognitionOfWar } from "../internal/gamelogic/gamedata.js";
import { type AckType } from "../internal/pubsub/subscribe.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { confirmChannel, publishGameLog } from "./index.js";
import { ExchangePerilTopic, WarRecognitionsPrefix } from "../internal/routing/routing.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return function handler(ps: PlayingState) {
    handlePause(gs, ps);
    process.stdout.write("> ");
    return "Ack";
  }
}

export function handlerMove(gs: GameState): (move: ArmyMove) => Promise<AckType> {
  return async function handler(move: ArmyMove) {
    const outcome = handleMove(gs, move);

    if (outcome === MoveOutcome.MakeWar) {
      const rw: RecognitionOfWar = {
        attacker: move.player,
        defender: gs.getPlayerSnap(),
      };

      try {
        await publishJSON(confirmChannel, ExchangePerilTopic, `${WarRecognitionsPrefix}.${gs.getUsername()}`, rw);
      } catch (error) {
        process.stdout.write("> ");
        return "NackRequeue";
      }

      process.stdout.write("> ");
      return "Ack";
    }

    if (outcome === MoveOutcome.Safe) {
      process.stdout.write("> ");
      return "Ack";
    }

    process.stdout.write("> ");
    return "NackDiscard";
  }
}

export function handlerWar(gs: GameState): (rw: RecognitionOfWar) => Promise<AckType> {
  return async function handler(rw: RecognitionOfWar) {
    const wr = handleWar(gs, rw);
    process.stdout.write("> ");

    switch (wr.result) {
      case WarOutcome.NotInvolved:
        return "NackRequeue";
      case WarOutcome.NoUnits:
        return "NackDiscard";
      case WarOutcome.OpponentWon:
        try {
          await publishGameLog(confirmChannel, gs.getUsername(), `${wr.winner} won a war against ${wr.loser}`);
          return "Ack";
        } catch (err) {
          return "NackRequeue";
        }
      case WarOutcome.YouWon:
        try {
          await publishGameLog(confirmChannel, gs.getUsername(), `${wr.winner} won a war against ${wr.loser}`);
          return "Ack";
        } catch (err) {
          return "NackRequeue";
        }
      case WarOutcome.Draw:
        try {
          await publishGameLog(confirmChannel, gs.getUsername(), `A war between ${wr.attacker} and ${wr.defender} resulted in a draw`);
          return "Ack";
        } catch (err) {
          return "NackRequeue";
        }
      default:
        console.error("Something went wrong");
        return "NackDiscard";
    }
  }
}
