"use client";

import { useEffect, useReducer, useState } from "react";
import { useParams } from "next/navigation";
import { id, tx } from "@instantdb/react";
import useLocalStorage from "use-local-storage";
import { db, Entrant, Race } from "@/lib/db";
import { TEAMS } from "@/lib/constants";
import Link from "next/link";

export default function RacePage() {
  const { raceId } = useParams<{ raceId: string }>();

  const { data } = db.useQuery({
    races: {
      $: {
        where: {
          id: raceId,
        },
      },
      entrants: {},
    },
  });

  const race = data?.races[0] as Race & { entrants: Entrant[] };

  const [entrantId] = useLocalStorage(`entrantId-${raceId}`, id());
  const [name, setName] = useLocalStorage("name", "");
  const [team, setTeam] = useLocalStorage("team", "");

  useEffect(() => {
    db.transact([
      tx.entrants[entrantId].update({ name, team, progress: 0 }),
      tx.races[raceId].link({ entrants: entrantId }),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      /Mobi|Android/i.test(navigator.userAgent)
    ) {
      alert("This game doesn’t work on phones, only computers.");
    }
  }, []);

  return (
    <div className="p-4">
      <Link href="/" className="text-gray-600">
        &larr;{" "}
        <span className="underline decoration-gray-400">
          Start another race
        </span>
      </Link>
      <div className="mt-4 grid grid-cols-[1fr_350px] gap-x-4">
        <Typing race={race} />
        <Profile
          name={name}
          setName={setName}
          team={team}
          setTeam={setTeam}
          entrantId={entrantId}
        />
      </div>
    </div>
  );
}

const Typing = ({ race }: { race?: Race & { entrants: Entrant[] } }) => {
  const raceHasStartTime = !!race?.startedAt;
  const msInFuture = race?.startedAt ? race.startedAt - Date.now() : null;
  const inRace = raceHasStartTime && msInFuture && msInFuture < 0;

  const [ownedRaceIds] = useLocalStorage<string[]>("ownedRaceIds", []);
  const [text, setText] = useState("");

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const forceUpdateRecursive = () => {
      forceUpdate();

      const msInPast = race?.startedAt ? Date.now() - race?.startedAt : null;
      if (!(msInPast && msInPast > 1_000)) {
        setTimeout(forceUpdateRecursive, 500);
      }
    };
    forceUpdateRecursive();
  }, [race?.startedAt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        setText(text.slice(0, -1));
      } else if (e.key.length === 1) {
        setText(text + e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [text]);

  if (!race) {
    return <div />;
  }

  const startRace = () => {
    db.transact(tx.races[race.id].update({ startedAt: Date.now() + 5_000 }));
  };

  if (!raceHasStartTime) {
    const isOwner = ownedRaceIds.includes(race.id);
    return (
      <div className="p-4 bg-white rounded-xl ring-1 ring-gray-900/10 shadow-sm space-y-4">
        <div className="space-y-2">
          <p>
            <span className="font-semibold">Joined: </span>
            {race.entrants
              .map((entrant) =>
                entrant.name === "" ? "Unnamed" : entrant.name
              )
              .join(", ")}
          </p>

          {isOwner ? (
            <button
              onClick={startRace}
              className="px-4 py-2 rounded-full ring-1 ring-gray-900/10 shadow-sm font-medium"
            >
              Everyone is here. Start the race!
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2">
              <div className="border-2 border-gray-300 p-1 border-t-gray-400 size-4 rounded-full animate-spin" />
              <p className="text-gray-500">
                Waiting for race creator to start the race...
              </p>
            </div>
          )}

          <ul className="text-gray-500 max-w-lg border-l-2 border-cyan-500 pl-6 py-1 list-disc space-y-0.5">
            {isOwner && <li>Send this link to have people join the race.</li>}
            <li>
              When the race starts, there will be a countdown, and then you’ll
              be shown a paragraph to type.
            </li>
            <li>
              You <em className="font-semibold">do</em> need to go back and
              correct mistakes.
            </li>
            <li>Fastest typing speed wins.</li>
          </ul>
        </div>
      </div>
    );
  }

  if (raceHasStartTime && !inRace && msInFuture) {
    return (
      <div className="p-4 bg-white rounded-xl ring-1 ring-gray-900/10 shadow-sm">
        <p className="text-xl font-bold">
          Starting in {Math.ceil(msInFuture / 1_000)}...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl ring-1 ring-gray-900/10 shadow-sm">
      <div className="text-lg font-mono">{race.text}</div>

      <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-300">
        <p className="text-lg font-mono">
          {text}
          <span className="translate-y-1 inline-block w-px h-5 bg-gray-900 animate-blink" />
        </p>
      </div>
    </div>
  );
};

const Profile = ({
  name,
  setName,
  team,
  setTeam,
  entrantId,
}: {
  name: string;
  setName: (name: string) => void;
  team: string;
  setTeam: (team: string) => void;
  entrantId: string;
}) => {
  return (
    <div className="p-4 bg-white rounded-xl ring-1 ring-gray-900/10 shadow-sm space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-500"
        >
          Your full name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => {
            const value = e.target.value;
            setName(value);
            db.transact(tx.entrants[entrantId].update({ name: value }));
          }}
          className="mt-1 rounded-lg border-gray-300 bg-gray-50 w-full"
        />
      </div>
      <select
        value={team}
        onChange={(e) => {
          const value = e.target.value;
          setTeam(value);
          db.transact(tx.entrants[entrantId].update({ team: value }));
        }}
        className="rounded-lg border-gray-300 bg-gray-50 w-full"
      >
        <option value="" disabled>
          Select a team...
        </option>
        {TEAMS.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </div>
  );
};
