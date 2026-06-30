import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js"
import { handleMove } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js"
import type { ArmyMove } from "../internal/gamelogic/gamedata.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => void {
  return function handler(ps: PlayingState) {
    handlePause(gs, ps);
    console.log("> ");
  }
}

export function handlerMove(gs: GameState): (move: ArmyMove) => void {
  return function handler(move: ArmyMove) {
    handleMove(gs, move);
    console.log("> ");
  }
}