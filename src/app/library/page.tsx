import { LibraryDashboard } from "../../features/library";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "小説 Library - Japanese OS",
  description: "A premium Japanese novel library and vertical reader.",
};

export default function LibraryPage() {
  return <LibraryDashboard />;
}
