import { Metadata } from "next";
import { VideoPlayerDashboard } from "../../features/video-player";

export const metadata: Metadata = {
  title: "JapanOS - Video Immersion Player",
  description: "A premium Japanese video immersion player with interactive subtitles, real-time dictionary lookups, synchronization controls, and keyboard navigation.",
};

export default function VideoPlayerPage() {
  return <VideoPlayerDashboard />;
}
