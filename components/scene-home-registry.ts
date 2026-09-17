import { tent } from "./scene-home-tent";
import { trailer } from "./scene-home-trailer";
import { cabin } from "./scene-home-cabin";
import { condo } from "./scene-home-condo";
import { house } from "./scene-home-house";
import { mansion } from "./scene-home-mansion";

// Product order is the homeStages array order, not the reverse threshold table.
const models = [tent, trailer, cabin, condo, house, mansion];
export function modelFor(stage: number) {
  return Number.isInteger(stage) ? models[stage] : undefined;
}
