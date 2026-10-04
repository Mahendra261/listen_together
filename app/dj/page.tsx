"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SongRequest = {
  id: number;
  nickname: string;
  song: string;
  status: string;
  created_at: string;
};

export default function DJPage() {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [currentSong, setCurrentSong] = useState("");

  useEffect(() => {
    loadRoom();
    loadRequests();

    const channel = supabase
      .channel("dj-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "song_requests",
        },
        () => {
          loadRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room",
        },
        () => {
          loadRoom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadRoom() {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setIsLive(data.is_live);
    setCurrentSong(data.current_song ?? "");
  }

  async function loadRequests() {
    const { data, error } = await supabase
      .from("song_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setRequests(data ?? []);
  }

 async function toggleBroadcast() {
  const newStatus = !isLive;

  const { data, error } = await supabase
    .from("room")
    .update({
      is_live: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  console.log("DJ ROOM UPDATE:", { data, error });

  if (error) {
    console.error("Could not update broadcast:", error);
    alert("Could not update broadcast status.");
    return;
  }

  if (data) {
    setIsLive(data.is_live);
  }
}
  async function markRequestDone(id: number) {
    const { error } = await supabase
      .from("song_requests")
      .update({
        status: "played",
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not update request.");
      return;
    }

    loadRequests();
  }

  async function playRequest(request: SongRequest) {
    const { error } = await supabase
      .from("room")
      .update({
        current_song: request.song,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error(error);
      alert("Could not update current song.");
      return;
    }

    setCurrentSong(request.song);
  }

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  );

  const playedRequests = requests.filter(
    (request) => request.status === "played"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                🎵 My Radio
              </h1>

              <p className="mt-1 text-slate-400">
                DJ Dashboard
              </p>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                isLive
                  ? "bg-red-500/10 text-red-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {isLive ? "🔴 LIVE" : "⚫ OFFLINE"}
            </div>
          </div>
        </header>

        {/* Broadcast control */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            Broadcast
          </h2>

          <div className="mt-5 rounded-xl bg-slate-950 p-6 text-center">
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Current Song
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {currentSong || "Nothing playing"}
            </p>
          </div>

          <button
            onClick={toggleBroadcast}
            className={`mt-5 w-full rounded-xl px-6 py-4 font-semibold ${
              isLive
                ? "bg-slate-700 hover:bg-slate-600"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {isLive
              ? "⏹ Stop Broadcast"
              : "🔴 Start Broadcast"}
          </button>
        </section>

        {/* Pending requests */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              🎵 Song Requests
            </h2>

            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm text-indigo-400">
              {pendingRequests.length} pending
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="rounded-xl bg-slate-950 p-6 text-center text-sm text-slate-500">
                No pending requests
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl bg-slate-950 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {request.song}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Requested by {request.nickname}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => playRequest(request)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
                      >
                        ▶ Play
                      </button>

                      <button
                        onClick={() => markRequestDone(request.id)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
                      >
                        ✓ Done
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Played requests */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            ✓ Recently Played
          </h2>

          <div className="mt-4 space-y-2">
            {playedRequests.slice(0, 10).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg bg-slate-950 px-4 py-3 text-sm"
              >
                <div>
                  <span className="text-slate-300">
                    {request.song}
                  </span>

                  <span className="ml-2 text-slate-600">
                    — {request.nickname}
                  </span>
                </div>

                <span className="text-emerald-500">
                  Played
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            ← Open Listener Room
          </a>
        </div>
      </div>
    </main>
  );
}