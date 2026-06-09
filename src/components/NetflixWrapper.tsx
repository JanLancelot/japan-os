"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  avatarColor: string;
}

const PROFILES: Profile[] = [
  { id: "sensei", name: "Sensei (先生)", avatarColor: "bg-blue-600" },
  { id: "otaku", name: "Otaku (オタク)", avatarColor: "bg-red-600" },
  { id: "gamer", name: "Gamer (ゲーマー)", avatarColor: "bg-purple-600" },
  { id: "bookworm", name: "Bookworm (読書家)", avatarColor: "bg-emerald-600" },
];

export function NetflixWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  
  const [activeProfile, setActiveProfile] = useState<Profile>(PROFILES[0]);
  const [globalTheme, setGlobalTheme] = useState("dark");
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Header visibility (for auto-hide on tool pages)
  const [headerVisible, setHeaderVisible] = useState(true);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLandingPage = pathname === "/";

  // Handle global theme change
  const handleSelectTheme = (newTheme: string) => {
    setGlobalTheme(newTheme);
    localStorage.setItem("japanos-global-theme", newTheme);
    
    // Update document classes for styling
    const html = document.documentElement;
    html.className = ""; // clear previous classes
    html.classList.add(`theme-${newTheme}`);
    if (newTheme === "dark" || newTheme === "midnight") {
      html.classList.add("dark");
    }
    
    // Notify all components that are listening
    window.dispatchEvent(new Event("japanos-theme-change"));
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle auto-hide header for tool pages
  useEffect(() => {
    if (isLandingPage) {
      setHeaderVisible(true);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      return;
    }

    const resetMouseTimer = () => {
      setHeaderVisible(true);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      
      mouseTimeoutRef.current = setTimeout(() => {
        setHeaderVisible(false);
      }, 3000); // Hide after 3s of inactivity
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Always show if cursor is near the top edge
      if (e.clientY <= 60) {
        setHeaderVisible(true);
        if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      } else {
        resetMouseTimer();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    resetMouseTimer();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
    };
  }, [pathname, isLandingPage]);

  // Load selected profile and global theme from localStorage if present
  useEffect(() => {
    const savedProfile = localStorage.getItem("japanos-active-profile");
    if (savedProfile) {
      const found = PROFILES.find((p) => p.id === savedProfile);
      if (found) setActiveProfile(found);
    }
    
    const savedTheme = localStorage.getItem("japanos-global-theme") || "dark";
    handleSelectTheme(savedTheme);
  }, []);

  // Sync header visibility state to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-header-visible", headerVisible.toString());
  }, [headerVisible]);

  const handleSelectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    localStorage.setItem("japanos-active-profile", profile.id);
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Global Navigation Header */}
      <header
        className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 md:px-12 transition-all duration-500 ease-in-out ${
          scrolled || !isLandingPage ? "bg-zinc-950/95 shadow-md backdrop-blur-md" : "bg-gradient-to-b from-black/80 to-transparent"
        } ${
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-6 md:gap-10">
          {/* Netflix-style Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl md:text-2xl font-extrabold tracking-tighter text-[#E50914] font-sans hover:scale-105 transition-transform duration-300">
              JAPAN<span className="text-zinc-100">OS</span>
            </span>
            <div className="w-5 h-5 rounded bg-[#E50914] flex items-center justify-center text-white font-bold text-xs font-serif shadow-sm">
              和
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-normal text-zinc-350">
            <Link
              href="/"
              className={`hover:text-zinc-100 transition-colors duration-300 ${
                pathname === "/" ? "text-white font-bold" : ""
              }`}
            >
              Home
            </Link>
            <Link
              href="/reader"
              className={`hover:text-zinc-100 transition-colors duration-300 ${
                pathname === "/reader" ? "text-white font-bold" : ""
              }`}
            >
              Ebook Reader
            </Link>
            <Link
              href="/video-player"
              className={`hover:text-zinc-100 transition-colors duration-300 ${
                pathname === "/video-player" ? "text-white font-bold" : ""
              }`}
            >
              Video Player
            </Link>
            <Link
              href="/texthooker"
              className={`hover:text-zinc-100 transition-colors duration-300 ${
                pathname === "/texthooker" ? "text-white font-bold" : ""
              }`}
            >
              Live Texthooker
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 md:gap-6 relative">
          {/* Expanding Search Bar */}
          <div className="flex items-center relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-zinc-200 hover:text-white transition-colors duration-300 p-1.5 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <input
              type="text"
              placeholder="Titles, people, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-zinc-900 border border-zinc-700 text-xs px-3 py-1.5 text-white placeholder-zinc-500 rounded transition-all duration-500 origin-right focus:outline-none focus:border-zinc-500 ${
                searchOpen ? "w-40 md:w-56 opacity-100 ml-2" : "w-0 opacity-0 pointer-events-none"
              }`}
            />
          </div>

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-1.5 focus:outline-none"
            >
              <div
                className={`w-7.5 h-7.5 rounded text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer transition-transform hover:scale-105 ${activeProfile.avatarColor}`}
              >
                {activeProfile.name.charAt(0)}
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                className={`text-zinc-400 transition-transform duration-300 ${profileOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-52 bg-zinc-950 border border-zinc-900 rounded shadow-2xl overflow-hidden z-50 text-xs">
                <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-950/80">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider block mb-2">Switch Profile</span>
                  <div className="flex flex-col gap-2.5">
                    {PROFILES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProfile(p)}
                        className={`flex items-center gap-2.5 w-full text-left font-medium hover:text-white transition-colors py-1 ${
                          activeProfile.id === p.id ? "text-white" : "text-zinc-400"
                        }`}
                      >
                        <div className={`w-5.5 h-5.5 rounded flex items-center justify-center text-[10px] font-bold text-white ${p.avatarColor}`}>
                          {p.name.charAt(0)}
                        </div>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2 flex flex-col border-b border-zinc-900">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/");
                    }}
                    className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded transition-colors"
                  >
                    Manage Profiles
                  </button>
                  <button
                    onClick={() => setProfileOpen(false)}
                    className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded border-t border-zinc-900 pt-2 transition-colors mt-1"
                  >
                    Sign out of JapanOS
                  </button>
                </div>
                <div className="px-4 py-3 bg-zinc-950/80">
                  <span className="text-zinc-450 text-[9px] uppercase font-bold tracking-wider block mb-2">Workspace Theme</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "light", name: "Light (白)", color: "bg-white text-zinc-950 border border-zinc-350" },
                      { id: "sepia", name: "Sepia (茶)", color: "bg-[#f5ebd6] text-[#4a3621] border border-[#d3c2a3]" },
                      { id: "dark", name: "Dark (墨)", color: "bg-zinc-900 text-zinc-100 border border-zinc-800" },
                      { id: "midnight", name: "OLED (宵)", color: "bg-black text-slate-100 border border-blue-950" },
                    ].map((th) => (
                      <button
                        key={th.id}
                        onClick={() => handleSelectTheme(th.id)}
                        className={`flex items-center justify-center gap-1 py-1 rounded text-[9px] font-semibold transition-all cursor-pointer ${th.color} ${
                          globalTheme === th.id ? "ring-2 ring-red-600 scale-[1.02]" : "opacity-75 hover:opacity-100"
                        }`}
                      >
                        {th.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <div className={`flex-1 flex flex-col ${isLandingPage || pathname === "/video-player" || pathname === "/reader" || pathname === "/texthooker" ? "h-screen w-screen overflow-hidden" : "pt-16"}`}>
        {children}
      </div>

      {/* Floating back-to-top or indicator when header is hidden */}
      {!isLandingPage && !headerVisible && (
        <div className="fixed top-0 left-0 w-full h-1 z-40 bg-[#E50914]/20 pointer-events-none animate-pulse" />
      )}
    </div>
  );
}
export default NetflixWrapper;
