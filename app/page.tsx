"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Message = {
  id: number;
  nickname: string;
  message: string;
  created_at: string;
};

type SongRequest = {
  id: number;
  nickname: string;
  song: string;
  status: string;
  created_at: string;
};

type Room = {
  id: number;
  name: string;
  is_live: boolean;
  current_song: string | null;
  updated_at: string;
};

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const [songRequest, setSongRequest] = useState("");
  const [requests, setRequests] = useState<SongRequest[]>([]);

  const [room, setRoom] = useState<Room | null>(null);

  const [sending, setSending] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {

    const savedNickname = localStorage.getItem("live-room-nickname");

    if (savedNickname) {
      setNickname(savedNickname);
      setJoined(true);
    }
    loadMessages();
    loadRequests();
    loadRoom();

    const channel = supabase
      .channel("live-room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          setMessages((current) => [
            ...current,
            payload.new as Message,
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "song_requests",
        },
        (payload) => {
          setRequests((current) => [
            ...current,
            payload.new as SongRequest,
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room",
        },
        (payload) => {
          console.log("LISTENER ROOM UPDATE:", payload.new);
          setRoom(payload.new as Room);
        }
      ).subscribe((status) => {
        console.log("LISTENER REALTIME STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error(error);
      return;
    }

    setMessages(data ?? []);
  }

  async function loadRequests() {
    const { data, error } = await supabase
      .from("song_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      return;
    }

    setRequests(data ?? []);
  }

  async function loadRoom() {
    const { data, error } = await supabase
      .from("room")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setRoom(data);
  }

  async function sendMessage() {
    const text = message.trim();

    if (!text || !nickname) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      nickname,
      message: text,
    });

    if (error) {
      console.error(error);
      alert("Could not send message.");
    } else {
      setMessage("");
    }

    setSending(false);
  }

  async function requestSong() {
    const song = songRequest.trim();

    if (!song || !nickname) return;

    setRequesting(true);

    const { error } = await supabase.from("song_requests").insert({
      nickname,
      song,
    });

    if (error) {
      console.error(error);
      alert("Could not request song.");
    } else {
      setSongRequest("");
      alert("Song request sent! 🎵");
    }

    setRequesting(false);
  }

  function joinRoom() {
    const name = nickname.trim();

    if (!name) return;

    localStorage.setItem("live-room-nickname", name);

    setNickname(name);
    setJoined(true);
  }

  if (!joined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mb-4 text-6xl">🎵</div>

            <h1 className="text-3xl font-bold">
              My Radio
            </h1>

            <p className="mt-2 text-slate-400">
              Enter your name to join the live room
            </p>
          </div>

          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                joinRoom();
              }
            }}
            placeholder="Your nickname"
            maxLength={30}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
          />

          <button
            onClick={joinRoom}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500"
          >
            Join Live Room
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">

        {/* Header */}
        <header className="mb-8 text-center">
          <div
            className={`mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
              room?.is_live
                ? "bg-red-500/10 text-red-400"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                room?.is_live
                  ? "animate-pulse bg-red-500"
                  : "bg-slate-500"
              }`}
            />
            {room?.is_live ? "LIVE ROOM" : "OFFLINE"}
          </div>

          <h1 className="text-4xl font-bold">
            🎵 My Radio
          </h1>

          <p className="mt-2 text-slate-400">
            Welcome, {nickname}
          </p>
        </header>

        {/* Player */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="flex min-h-[300px] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
            <div className="text-center">
              <div className="mb-6 text-7xl">🎵</div>

              <p className="text-sm uppercase tracking-widest text-slate-500">
                {room?.is_live ? "Now Playing" : "Broadcast Offline"}
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {room?.is_live
                  ? room.current_song || "Live broadcast"
                  : "Waiting for the broadcast"}
              </h2>

              <p className="mt-1 text-slate-400">
                {room?.is_live
                  ? "The DJ is live now 🎧"
                  : "The DJ hasn't started yet"}
              </p>
            </div>
          </div>

          <div className="p-6">
            <button
              disabled={!room?.is_live}
              className={`w-full rounded-xl px-6 py-4 font-semibold ${
                room?.is_live
                  ? "bg-indigo-600 hover:bg-indigo-500"
                  : "bg-slate-700 opacity-50"
              }`}
            >
              {room?.is_live ? "▶ Listen Live" : "Broadcast Offline"}
            </button>

            <div className="mt-4 text-center text-sm text-slate-400">
              👥 Live listeners coming soon
            </div>
          </div>
        </section>

        {/* Chat */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            💬 Chat
          </h2>

          <div className="mb-4 h-64 overflow-y-auto rounded-xl bg-slate-950 p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No messages yet. Say hello! 👋
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((item) => (
                  <div key={item.id}>
                    <span className="font-semibold text-indigo-400">
                      {item.nickname}
                    </span>

                    <span className="ml-2 text-slate-300">
                      {item.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Write a message..."
              maxLength={500}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />

            <button
              onClick={sendMessage}
              disabled={sending || !message.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </section>

        {/* Song requests */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-xl font-semibold">
            🎵 Request a Song
          </h2>

          <p className="mb-4 text-sm text-slate-400">
            Tell the DJ what you'd like to hear.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={songRequest}
              onChange={(e) => setSongRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  requestSong();
                }
              }}
              placeholder="Song name or artist..."
              maxLength={200}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />

            <button
              onClick={requestSong}
              disabled={requesting || !songRequest.trim()}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requesting ? "..." : "Request"}
            </button>
          </div>

          {requests.length > 0 && (
            <div className="mt-6 border-t border-slate-800 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-400">
                Recent Requests
              </h3>

              <div className="space-y-2">
                {requests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg bg-slate-950 px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-emerald-400">
                      {request.nickname}
                    </span>

                    <span className="ml-2 text-slate-300">
                      {request.song}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-slate-600">
          Private Live Room
        </footer>
      </div>
    </main>
  );
}