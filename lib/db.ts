import { init } from "@instantdb/react";

export type Race = {
  id: string;
  text: string;
  startedAt?: number;
};

export type Entrant = {
  id: string;
  raceId: string;
  name: string;
  team: string;
  progress: number;
  finishedAt?: number;
};

export const db = init<{
  races: Race;
  entrants: Entrant;
}>({ appId: "53bf3129-4441-4730-aea8-2ad064e9ab5e" });
