import { Metadata } from "next";
import { TexthookerDashboard } from "../../features/texthooker";

export const metadata: Metadata = {
  title: "Japanese Textractor WebHook - Elegant Reader",
  description: "A modern, minimalist Apple-designed WebHook reader client for Textractor. Supports horizontal and vertical reading modes, text-to-speech, and automatic clipboard integration.",
};

export default function TexthookerPage() {
  return <TexthookerDashboard />;
}
