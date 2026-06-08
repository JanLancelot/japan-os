import { Metadata } from "next";
import { ReaderDashboard } from "../../features/reader";

export const metadata: Metadata = {
  title: "JapanOS - Immersive Ebook Reader",
  description: "A premium Japanese language immersion reader with vertical/horizontal pagination, local library manager, vocabulary notebook, bookmarks, and hover dictionary lookup.",
};

export default function ReaderPage() {
  return <ReaderDashboard />;
}
