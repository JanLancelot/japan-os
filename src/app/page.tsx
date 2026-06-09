"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Book } from "../features/reader/types";
import { getAllBooks } from "../features/reader/utils/db";

const PROFILES = [
  { id: "sensei", name: "Sensei (先生)", avatarColor: "bg-blue-600" },
  { id: "otaku", name: "Otaku (オタク)", avatarColor: "bg-red-600" },
  { id: "gamer", name: "Gamer (ゲーマー)", avatarColor: "bg-purple-600" },
  { id: "bookworm", name: "Bookworm (読書家)", avatarColor: "bg-emerald-600" },
];

export default function Home() {
  // Intro states
  const [showIntro, setShowIntro] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // Dashboard states
  const [activeProfile, setActiveProfile] = useState(PROFILES[0]);
  const [books, setBooks] = useState<Book[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [selectedChartDay, setSelectedChartDay] = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  
  // Custom checklist state (saved in localStorage)
  const [dailyGoals, setDailyGoals] = useState({
    reading: false,
    video: false,
    anki: false,
    hooking: false,
  });

  useEffect(() => {
    // Play intro only once per session
    const hasSeenIntro = sessionStorage.getItem("japanos-seen-intro");
    if (!hasSeenIntro) {
      setShowIntro(true);
      sessionStorage.setItem("japanos-seen-intro", "true");
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 3200); // Intro lasts ~3.2s
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync profile details
  useEffect(() => {
    const loadProfile = () => {
      const savedProfileId = localStorage.getItem("japanos-active-profile");
      const found = PROFILES.find((p) => p.id === savedProfileId);
      if (found) {
        setActiveProfile(found);
      }
    };
    loadProfile();

    const interval = setInterval(loadProfile, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load Ebooks data from IndexedDB
  const loadDBData = async () => {
    try {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
      setDbLoaded(true);
    } catch (err) {
      console.error("Failed to load IndexedDB data on dashboard:", err);
      setDbLoaded(true);
    }
  };

  useEffect(() => {
    loadDBData();
  }, []);

  // Load goals checklist from localStorage
  useEffect(() => {
    const storedGoals = localStorage.getItem("japanos-daily-goals");
    if (storedGoals) {
      try {
        setDailyGoals(JSON.parse(storedGoals));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleToggleGoal = (key: keyof typeof dailyGoals) => {
    const nextGoals = { ...dailyGoals, [key]: !dailyGoals[key] };
    setDailyGoals(nextGoals);
    localStorage.setItem("japanos-daily-goals", JSON.stringify(nextGoals));
  };

  // Mock charts data
  const chartData = [
    { day: "Mon", reading: 35, video: 20, hooking: 15, date: "June 02" },
    { day: "Tue", reading: 15, video: 40, hooking: 10, date: "June 03" },
    { day: "Wed", reading: 45, video: 15, hooking: 25, date: "June 04" },
    { day: "Thu", reading: 20, video: 30, hooking: 15, date: "June 05" },
    { day: "Fri", reading: 50, video: 25, hooking: 20, date: "June 06" },
    { day: "Sat", reading: 65, video: 55, hooking: 30, date: "June 07" },
    { day: "Sun", reading: 40, video: 45, hooking: 35, date: "June 08" },
  ];

  // Calculations for donut chart
  const totals = useMemo(() => {
    const reading = chartData.reduce((acc, curr) => acc + curr.reading, 0);
    const video = chartData.reduce((acc, curr) => acc + curr.video, 0);
    const hooking = chartData.reduce((acc, curr) => acc + curr.hooking, 0);
    const total = reading + video + hooking;
    return { reading, video, hooking, total };
  }, []);

  const donutPercentage = useMemo(() => {
    const rPct = Math.round((totals.reading / totals.total) * 100);
    const vPct = Math.round((totals.video / totals.total) * 100);
    const hPct = 100 - rPct - vPct; // clean remainder
    return { reading: rPct, video: vPct, hooking: hPct };
  }, [totals]);

  // Circumference for Donut R=40 is 2 * PI * 40 = 251.3
  const donutSlices = useMemo(() => {
    const rLen = (totals.reading / totals.total) * 251.3;
    const vLen = (totals.video / totals.total) * 251.3;
    const hLen = (totals.hooking / totals.total) * 251.3;
    return [
      { len: rLen, offset: 0, color: "stroke-emerald-500", name: "Ebook Reader", value: `${totals.reading}m`, pct: `${donutPercentage.reading}%` },
      { len: vLen, offset: -rLen, color: "stroke-violet-500", name: "Video Player", value: `${totals.video}m`, pct: `${donutPercentage.video}%` },
      { len: hLen, offset: -(rLen + vLen), color: "stroke-red-500", name: "Texthooker", value: `${totals.hooking}m`, pct: `${donutPercentage.hooking}%` },
    ];
  }, [totals, donutPercentage]);

  // Average reading progress of stored books
  const averageBookProgress = useMemo(() => {
    if (books.length === 0) return 0;
    const totalProgress = books.reduce((acc, book) => acc + (book.currentProgress || 0), 0);
    return Math.round(totalProgress / books.length);
  }, [books]);

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] overflow-hidden select-none">
        <style jsx global>{`
          @keyframes tudum-logo {
            0% {
              transform: scale(0.6);
              opacity: 0;
              letter-spacing: -10px;
              filter: blur(10px);
            }
            15% {
              transform: scale(1.02);
              opacity: 1;
              letter-spacing: 2px;
              filter: blur(0px);
            }
            75% {
              transform: scale(1);
              opacity: 1;
              letter-spacing: 0px;
              filter: blur(0px);
            }
            100% {
              transform: scale(1.6);
              opacity: 0;
              letter-spacing: 4px;
              filter: blur(4px);
            }
          }
          @keyframes tudum-glow {
            0% { text-shadow: 0 0 0px rgba(229, 9, 20, 0); }
            30% { text-shadow: 0 0 30px rgba(229, 9, 20, 0.8), 0 0 50px rgba(229, 9, 20, 0.4); }
            70% { text-shadow: 0 0 40px rgba(229, 9, 20, 0.9), 0 0 70px rgba(229, 9, 20, 0.5); }
            100% { text-shadow: 0 0 0px rgba(229, 9, 20, 0); }
          }
          .tudum-animate {
            animation: tudum-logo 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .tudum-glow-animate {
            animation: tudum-glow 3.2s ease-in-out forwards;
          }
        `}</style>
        <div className="flex flex-col items-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#E50914] font-sans tudum-animate tudum-glow-animate">
            JAPANOS
          </h1>
          <p className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase mt-4 animate-pulse">
            Booting Immersion Workspace v2.0...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#09090b] text-[#E5E5E5] min-h-screen relative pb-16 overflow-y-auto pt-20">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#E50914]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-violet-900/5 blur-[130px] pointer-events-none" />

      {/* Main SaaS Dashboard Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col gap-8 relative z-10">
        
        {/* Welcome SaaS Banner Card */}
        <div className="relative rounded-2xl overflow-hidden border border-zinc-850 bg-gradient-to-r from-zinc-950/80 via-zinc-900/40 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-4.5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-black/40 ${activeProfile.avatarColor}`}>
              {activeProfile.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white font-sans">
                  Hello, {activeProfile.name}!
                </h2>
                <span className="bg-emerald-950/40 border border-emerald-900/40 text-emerald-500 font-extrabold text-[9px] tracking-wider px-2 py-0.5 rounded-full uppercase font-sans">
                  Immersion Dashboard
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-lg">
                Your immersive workspace is active. You currently have <span className="text-white font-bold">{books.length} books</span> loaded in your local library.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-md">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-bold font-mono">Current Streak</p>
                <p className="text-base font-extrabold text-white">14 Days</p>
              </div>
            </div>
            <button
              onClick={() => setInfoModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 p-2.5 rounded-xl transition duration-300 shadow-md cursor-pointer"
              title="More Info"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </div>
        </div>

        {/* 3 Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Immersion Time */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm group hover:border-zinc-800 transition duration-300">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-450 font-bold uppercase tracking-wider font-mono">Total Immersion</span>
              <span className="text-3xl font-black text-white">40.8 hrs</span>
              <span className="text-[10px] text-zinc-500">Avg. 92m / day</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-950/20 border border-violet-900/30 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

          {/* Card 2: Library Stored */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm group hover:border-zinc-800 transition duration-300">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-450 font-bold uppercase tracking-wider font-mono">Ebooks Stored</span>
              <span className="text-3xl font-black text-white">{dbLoaded ? books.length : "..."}</span>
              <span className="text-[10px] text-zinc-500">
                {books.length > 0 ? `Avg. progress: ${averageBookProgress}%` : "No books uploaded"}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-950/20 border border-blue-900/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
          </div>

          {/* Card 3: WebSocket hooker status */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm group hover:border-zinc-800 transition duration-300">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-450 font-bold uppercase tracking-wider font-mono">Live Texthooker</span>
              <span className="text-3xl font-black text-white">ws://6677</span>
              <span className="text-[10px] text-red-500 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Listening
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </div>

        </div>

        {/* Charts & Interactive Goals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Section: 7 Day Stacked Activity (2/3 width) */}
          <div className="lg:col-span-2 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Immersion Activity</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Stacked minutes spent on reading, video, and texthooking</p>
              </div>

              {selectedChartDay !== null ? (
                <div className="text-[10px] bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md text-zinc-300 font-mono animate-fade-in">
                  <span className="font-bold text-white">{chartData[selectedChartDay].day}: </span>
                  📖 {chartData[selectedChartDay].reading}m | 🎬 {chartData[selectedChartDay].video}m | ⚡ {chartData[selectedChartDay].hooking}m
                </div>
              ) : (
                <span className="text-[10px] text-zinc-550 font-mono">Hover columns for details</span>
              )}
            </div>

            {/* Custom Interactive SVG Chart */}
            <div className="relative h-[190px] w-full flex items-end">
              <svg viewBox="0 0 540 180" className="w-full h-full" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0, 1, 2, 3].map((g) => (
                  <line
                    key={g}
                    x1="30"
                    y1={30 + g * 35}
                    x2="530"
                    y2={30 + g * 35}
                    stroke="#18181b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Y-Axis labels */}
                <text x="5" y="34" fill="#52525b" fontSize="8" fontFamily="monospace">120m</text>
                <text x="5" y="69" fill="#52525b" fontSize="8" fontFamily="monospace">90m</text>
                <text x="5" y="104" fill="#52525b" fontSize="8" fontFamily="monospace">60m</text>
                <text x="5" y="139" fill="#52525b" fontSize="8" fontFamily="monospace">30m</text>

                {/* Draw the stacked columns */}
                {chartData.map((d, i) => {
                  const barWidth = 32;
                  const colX = 55 + i * 66;
                  // Max total 150m. Scale to 130 max height.
                  const scale = 130 / 150;
                  const readH = d.reading * scale;
                  const vidH = d.video * scale;
                  const hookH = d.hooking * scale;

                  // y-positions for stacking
                  const baseLine = 150; // SVG coordinate
                  const readY = baseLine - readH;
                  const vidY = readY - vidH;
                  const hookY = vidY - hookH;

                  return (
                    <g key={i}>
                      {/* 1. Reading Segment (Emerald) */}
                      <rect
                        x={colX}
                        y={readY}
                        width={barWidth}
                        height={readH}
                        className="fill-emerald-500/80 group-hover:fill-emerald-500 transition duration-300"
                        rx="2"
                      />

                      {/* 2. Video Segment (Violet) */}
                      <rect
                        x={colX}
                        y={vidY}
                        width={barWidth}
                        height={vidH}
                        className="fill-violet-500/80 group-hover:fill-violet-500 transition duration-300"
                        rx="2"
                      />

                      {/* 3. Hooking Segment (Red) */}
                      <rect
                        x={colX}
                        y={hookY}
                        width={barWidth}
                        height={hookH}
                        className="fill-red-500/80 group-hover:fill-red-500 transition duration-300"
                        rx="2"
                      />

                      {/* X-Axis day text label */}
                      <text
                        x={colX + barWidth / 2}
                        y="170"
                        fill={selectedChartDay === i ? "#ffffff" : "#71717a"}
                        fontSize="9"
                        fontWeight={selectedChartDay === i ? "bold" : "normal"}
                        textAnchor="middle"
                      >
                        {d.day}
                      </text>

                      {/* Hover trigger overlay rectangle */}
                      <rect
                        x={colX - 8}
                        y="15"
                        width={barWidth + 16}
                        height={140}
                        fill="transparent"
                        className="cursor-pointer hover:fill-white/[0.03] rounded-lg transition duration-200"
                        onMouseEnter={() => setSelectedChartDay(i)}
                        onMouseLeave={() => setSelectedChartDay(null)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Donut Chart breakdown (1/3 width) */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Immersion Breakdown</h3>
              <p className="text-[11px] text-zinc-550 mt-0.5">Distribution of study modes</p>
            </div>

            <div className="flex items-center justify-center my-2 relative">
              <svg viewBox="0 0 120 120" className="w-[130px] h-[130px]">
                {/* Background circle track */}
                <circle cx="60" cy="60" r="40" fill="transparent" stroke="#18181b" strokeWidth="11" />
                
                {/* SVG Donuts circles chain */}
                {donutSlices.map((slice, i) => (
                  <circle
                    key={i}
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    className={`${slice.color} transition-all duration-300 cursor-pointer`}
                    strokeWidth={hoveredSlice === i ? "15" : "11"}
                    strokeDasharray="251.3"
                    strokeDashoffset={slice.offset}
                    transform="rotate(-90 60 60)"
                    onMouseEnter={() => setHoveredSlice(i)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                ))}
              </svg>

              {/* Dynamic text in center of donut */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                {hoveredSlice !== null ? (
                  <>
                    <span className="text-sm font-black text-white">{donutSlices[hoveredSlice].pct}</span>
                    <span className="text-[9px] text-zinc-450 uppercase font-semibold">{donutSlices[hoveredSlice].value}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black text-white">{totals.total}m</span>
                    <span className="text-[9px] text-zinc-450 uppercase font-semibold">Total Time</span>
                  </>
                )}
              </div>
            </div>

            {/* Legend checklist detail */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-900">
              {donutSlices.map((slice, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between text-xs py-0.5 px-2 rounded-md transition duration-200 ${
                    hoveredSlice === i ? "bg-zinc-900/60" : ""
                  }`}
                  onMouseEnter={() => setHoveredSlice(i)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-violet-500" : "bg-red-500"}`} />
                    <span className="text-zinc-400 font-medium">{slice.name}</span>
                  </div>
                  <span className="text-white font-bold font-mono">{slice.pct} <span className="text-[10px] text-zinc-550 font-normal">({slice.value})</span></span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Interactive Goals Grid & Quick Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daily Goals Checklist Card (2/3 width on large screens) */}
          <div className="lg:col-span-2 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between shadow-xl backdrop-blur-md gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Daily Goals</h3>
              <p className="text-[11px] text-zinc-550 mt-0.5">Toggle goals completed today to track your consistency</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { key: "reading", label: "Read 15m of Ebooks", icon: "📖" },
                { key: "video", label: "Watch 30m of videos with Subs", icon: "🎬" },
                { key: "hooking", label: "Hook 10 lines from media", icon: "⚡" },
                { key: "anki", label: "Complete reviews in Anki", icon: "📇" }
              ].map((goal) => (
                <button
                  key={goal.key}
                  onClick={() => handleToggleGoal(goal.key as any)}
                  className={`flex items-center justify-between text-xs p-3.5 rounded-xl border transition-all duration-300 text-left cursor-pointer w-full ${
                    dailyGoals[goal.key as keyof typeof dailyGoals]
                      ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
                      : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{goal.icon}</span>
                    <span className="font-semibold">{goal.label}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    dailyGoals[goal.key as keyof typeof dailyGoals]
                      ? "border-emerald-500 bg-emerald-500 text-black"
                      : "border-zinc-700"
                  }`}>
                    {dailyGoals[goal.key as keyof typeof dailyGoals] && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-550 pt-2 border-t border-zinc-900 font-mono">
              <span>Goal Progress:</span>
              <span className="font-bold text-white">
                {Object.values(dailyGoals).filter(Boolean).length} / 4 Completed
              </span>
            </div>
          </div>

          {/* Quick Info & Tips Panel (1/3 width) */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between shadow-xl backdrop-blur-md gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Workspace Tips</h3>
              <p className="text-[11px] text-zinc-550 mt-0.5">Get the most out of your immersion</p>
            </div>

            <div className="flex flex-col gap-3 text-xs text-zinc-400">
              <div className="flex gap-2.5">
                <span className="text-violet-400 shrink-0">💡</span>
                <p>Press <kbd className="bg-zinc-900 text-zinc-200 border border-zinc-800 px-1 rounded font-mono text-[10px]">Shift</kbd> while hovering over kanji inside Ebooks or Subtitles for instant Yomichan definitions.</p>
              </div>
              <div className="flex gap-2.5 border-t border-zinc-900/60 pt-3">
                <span className="text-violet-400 shrink-0">🔊</span>
                <p>Enable text-to-speech in the Live Texthooker settings to automatically read aloud VN lines as they hook.</p>
              </div>
            </div>

            <button
              onClick={() => setInfoModalOpen(true)}
              className="w-full text-center bg-zinc-900 hover:bg-zinc-850 text-zinc-350 hover:text-white border border-zinc-800 font-semibold text-xs py-2 rounded-xl transition duration-200 cursor-pointer shadow-sm"
            >
              Learn More
            </button>
          </div>

        </div>

        {/* Dynamic Applications Section (SaaS Tool launchers) */}
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-white tracking-wide">Immersion Services</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Ebook Card */}
            <div className="group relative h-52 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-900 hover:border-zinc-800 shadow-xl flex flex-col justify-between p-5 transition duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600')",
                }}
              />
              
              <div className="z-20 flex items-center justify-between w-full">
                <span className="text-2xl">📖</span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest uppercase bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-full">
                  Ebook Reader
                </span>
              </div>

              <div className="z-20 flex flex-col gap-1 mt-4">
                <h4 className="text-base font-extrabold text-white">読書 Ebook Library</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Read traditional vertical layouts and hover words for quick definitions.
                </p>
              </div>

              <div className="z-20 flex items-center justify-between border-t border-zinc-900/80 pt-3 mt-3 w-full">
                <span className="text-[10px] text-zinc-550 font-medium">
                  {books.length} upload{books.length !== 1 ? "s" : ""}
                </span>
                <Link
                  href="/reader"
                  className="bg-white hover:bg-zinc-200 text-black font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition duration-300"
                >
                  Open Reader
                </Link>
              </div>
            </div>

            {/* Video Player Card */}
            <div className="group relative h-52 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-900 hover:border-zinc-800 shadow-xl flex flex-col justify-between p-5 transition duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=600')",
                }}
              />
              
              <div className="z-20 flex items-center justify-between w-full">
                <span className="text-2xl">🎬</span>
                <span className="text-[10px] font-bold text-violet-400 font-mono tracking-widest uppercase bg-violet-950/40 border border-violet-900/40 px-2 py-0.5 rounded-full">
                  Video Player
                </span>
              </div>

              <div className="z-20 flex flex-col gap-1 mt-4">
                <h4 className="text-base font-extrabold text-white">動画 Media Immersion</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Synchronize SRT subtitles and look up visual novels/show dialog immediately.
                </p>
              </div>

              <div className="z-20 flex items-center justify-between border-t border-zinc-900/80 pt-3 mt-3 w-full">
                <span className="text-[10px] text-zinc-550 font-medium">Subtitle Lookups active</span>
                <Link
                  href="/video-player"
                  className="bg-white hover:bg-zinc-200 text-black font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition duration-300"
                >
                  Open Player
                </Link>
              </div>
            </div>

            {/* Texthooker Card */}
            <div className="group relative h-52 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-900 hover:border-zinc-800 shadow-xl flex flex-col justify-between p-5 transition duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600')",
                }}
              />
              
              <div className="z-20 flex items-center justify-between w-full">
                <span className="text-2xl">⚡</span>
                <span className="text-[10px] font-bold text-red-400 font-mono tracking-widest uppercase bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded-full">
                  Texthooker
                </span>
              </div>

              <div className="z-20 flex flex-col gap-1 mt-4">
                <h4 className="text-base font-extrabold text-white">テキストフッカー Hook Client</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Auto-capture VN text lines with clipboard monitor and speech engine.
                </p>
              </div>

              <div className="z-20 flex items-center justify-between border-t border-zinc-900/80 pt-3 mt-3 w-full">
                <span className="text-[10px] text-red-500 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Listening on 6677
                </span>
                <Link
                  href="/texthooker"
                  className="bg-white hover:bg-zinc-200 text-black font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition duration-300"
                >
                  Open Hooker
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Info Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg w-full p-6 text-sm text-zinc-300 relative shadow-2xl">
            <button
              onClick={() => setInfoModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-lg font-bold text-white mb-2 tracking-wide font-sans">About JapanOS Immersion Hub</h3>
            <p className="leading-relaxed mb-4 text-xs text-zinc-400">
              JapanOS is a custom-built, premium language immersion dashboard. By integrating local media reading, video playing, and text hookers, it allows seamless workflow in one window.
            </p>
            <ul className="flex flex-col gap-2.5 border-t border-zinc-900 pt-4 text-xs">
              <li className="flex items-center gap-2 text-zinc-350">
                <span className="text-emerald-500">✔</span>
                <span>Responsive vertical ebook reading with bookmarks</span>
              </li>
              <li className="flex items-center gap-2 text-zinc-350">
                <span className="text-emerald-500">✔</span>
                <span>Dynamic local SRT/VTT file sync for videos</span>
              </li>
              <li className="flex items-center gap-2 text-zinc-350">
                <span className="text-emerald-500">✔</span>
                <span>Automatic clipboard copy & speech synthesis</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
