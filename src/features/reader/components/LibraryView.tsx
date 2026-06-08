import React, { useState, useEffect } from "react";
import { Book } from "../types";
import { saveBook, deleteBook } from "../utils/db";

// Sleek abstract SVG gradients for book covers
const CAT_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23145c43"/><stop offset="100%" stop-color="%230a2f22"/></linearGradient></defs><rect width="200" height="280" fill="url(%23g)"/><rect x="15" y="15" width="170" height="250" fill="none" stroke="%23c2a649" stroke-width="1.5" opacity="0.3"/><circle cx="100" cy="110" r="45" fill="none" stroke="%23c2a649" stroke-width="1" opacity="0.2"/><path d="M 85,100 Q 100,75 115,100 Q 130,125 100,140 Q 70,125 85,100 Z" fill="none" stroke="%23c2a649" stroke-width="1.5" opacity="0.4"/><text x="100" y="210" font-family="serif" font-weight="bold" font-size="16" fill="%23e8d8a7" text-anchor="middle">吾輩は猫である</text><text x="100" y="235" font-family="sans-serif" font-size="9" fill="%23c2a649" letter-spacing="1.5" text-anchor="middle">夏目漱石</text><text x="100" y="55" font-family="monospace" font-size="7" fill="%23c2a649" letter-spacing="3" text-anchor="middle">CLASSIC IMMERSION</text></svg>`;

const MELOS_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%239a1c1c"/><stop offset="100%" stop-color="%233b0707"/></linearGradient></defs><rect width="200" height="280" fill="url(%23g)"/><rect x="15" y="15" width="170" height="250" fill="none" stroke="%23e2bc74" stroke-width="1.5" opacity="0.3"/><circle cx="100" cy="110" r="50" fill="none" stroke="%23e2bc74" stroke-width="1" opacity="0.15"/><path d="M 70,110 L 130,110 M 100,80 L 100,140" stroke="%23e2bc74" stroke-width="1.5" opacity="0.3"/><text x="100" y="210" font-family="serif" font-weight="bold" font-size="16" fill="%23f6e5c3" text-anchor="middle">走れメロス</text><text x="100" y="235" font-family="sans-serif" font-size="9" fill="%23e2bc74" letter-spacing="1.5" text-anchor="middle">太宰 治</text><text x="100" y="55" font-family="monospace" font-size="7" fill="%23e2bc74" letter-spacing="3" text-anchor="middle">CLASSIC IMMERSION</text></svg>`;

// Content for Sample 1: 吾輩は猫である (First Chapter)
const CAT_BOOK_TEXT = `吾輩は猫である
夏目漱石

第一章

　吾輩（わがはい）は猫である。名前はまだ無い。
　どこで生れたかとんと見当（けんとう）がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。しかもあとで聞くとそれは書生という人間中で一番獰悪（どうあく）な種族であったそうだ。この書生というのは時々我々を捕（つかま）えて煮（に）て食うという話である。しかしその当時は何という考もなかったから別段恐ろしいとも思わなかった。ただ彼の掌（てのひら）に載せられてスーと持ち上げられた時、何だかフワフワした感じがあったばかりである。掌の上で少し落ちついて書生の顔を見たのがいわゆる人間というものの見始（みはじめ）であろう。この時妙なものだと思った感じが今でも残っている。第一毛をもって装飾されべきはずの顔がつるつるしてまるで薬缶（やかん）だ。その後（ご）猫にもだいぶ逢（あ）ったがこんな片輪（かたわ）には一度も出会（でくわ）した事がない。のみならず顔の真中があまりに突起している。そうしてその穴の中から時々ぷうぷうと煙（けむり）を吹く。どうも咽（む）せぽくて実に弱った。これが人間の飲む煙草（たばこ）というものである事はようやくこの頃（ころ）知った。

第二章

　この書生の掌の裏（うち）でしばらくはよい心持に坐（すわ）っておったが、しばらくすると非常な速力で運転し始めた。書生が動くのか自分だけが動くのか分らないが無暗（むあみ）に眼が廻る。胸が悪くなる。到底（とうてい）助からないと思っていると、どさりと音がして眼から火が出た。気がついて見ると書生はもういない。たくさんおった兄弟も一匹も見えぬ。おまけに肝心（かんじん）の母親さえ姿を隠してしまった。上（うえ）は極めて明るい所へ出た。眼をこすってよく見て見ると、吾輩は書生の家からつまみ出されて急に荒野（あらの）へ抛（ほう）り出されたのである。
　行く手を望むと竹垣が立っている。その垣の崩れた所から、ようやくの思いで一軒の邸内（ていだん）へ忍び込んだ。これがのちに吾輩の棲家（すみか）となる教師の家であった。吾輩はここへ忍び込んで一命を取り留めたのである。

第三章

　吾輩が教師の家に住み込んでから、早くも一年が経とうとしている。
　主人はめったに我々猫と話をしない。書斎に籠もってばかりいる。何をしているかと思うと、ただ居眠りをしている。吾輩の主人はなかなかの怠け者である。しかし主人は自分を学者だと思っているらしい。時々妙な英語を大きな声で読んでいる。
　吾輩は毎日のように主人の膝（ひざ）の上に載って、その寝顔を観察するのを楽しみとしている。人間というのはまことに不思議な生き物である。
`;

// Content for Sample 2: 走れメロス (Full Text / Condensed Major chapters)
const MELOS_BOOK_TEXT = `走れメロス
太宰治

第一章

　メロスは激怒した。必ず、かの邪智暴虐（じゃちぼうぎゃく）の王を除かなければならぬと決意した。メロスには政治がわからぬ。メロスは、村の牧人である。笛を吹き、羊と遊んで暮して来た。けれども邪悪に対しては、人一倍に敏感であった。きょう未明メロスは村を出発し、野を越え山越え、十里はなれた此（こ）のシラクスの市にやって来た。メロスには父も母もない。女房もない。十六の、内気な妹と二人暮らしだ。この妹は、近々、一人の律気な牧人を婿（むこ）として迎える事になっていた。婚礼の日も間近なのである。メロスは、それゆえ、花嫁の衣裳やら婚礼の御馳走やらを買いに、はるばる市にやって来たのである。
　買い物を終り、街を歩いているうちに、メロスは街の様子がひどく寂しいのに気づいた。

第二章

　メロスは、シラクスの親友であるセリヌンティウスを訪ねた。セリヌンティウスは石工（いしく）である。二人は固い友情で結ばれていた。
　しかし、メロスは王の城に忍び込んだ疑いにより、捉えられてしまった。王の前に引き出されたメロスは、王の残虐さをなじった。王は冷笑して言った。「お前を死刑にしてやる。」
　メロスは願った。「私を殺す前に、三日間の日限を与えて下さい。たった一人の妹に花婿を迎えさせ、婚礼を挙げさせてやりたいのです。三日のうちに、私は必ずここに戻ってきます。」
　王は信じなかった。「身代わりを立てるというのか？」
　メロスは言った。「ここにいるセリヌンティウスを身代わりにしてください。私が三日目に戻らなければ、彼を殺してください。」
　セリヌンティウスは無言でうなずき、人質となることを引き受けた。メロスは解放され、妹のいる村へと走り出した。

第三章

　メロスは夜通し走り続け、翌朝村に着いた。妹の婚礼を急いで挙げさせ、三日目の朝、また市に向けて走り出した。
　道中、数々の困難がメロスを襲った。大雨による川の氾濫、橋の流出、そして山賊の襲撃。メロスは満身創痍になりながらも、シラクスの市を目指して走り続けた。
　しかし、太陽は刻一刻と沈みかけていく。疲労と渇きで倒れそうになるメロス。
　「私は信じられている。親友が私の帰りを待っている！」
　メロスは最後の力を振り絞ってシラクスの刑場へと飛び込んだ。まさにセリヌンティウスが磔台（はりつけだい）に上げられようとするその瞬間であった。
　「待て！私がメロスだ！戻ってきたぞ！」
　群衆から歓声が上がった。王は二人の友情の美しさに打たれ、メロスを許し、自らも彼らの仲間に入れてほしいと頼むのだった。
`;

interface LibraryViewProps {
  onSelectBook: (book: Book) => void;
  books: Book[];
  onRefreshBooks: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectBook,
  books,
  onRefreshBooks,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Seed sample books if database is empty
  useEffect(() => {
    const seedSampleBooks = async () => {
      if (books.length === 0 && !isSeeding) {
        setIsSeeding(true);
        try {
          const encoder = new TextEncoder();
          
          // Seed "吾輩は猫である"
          const catData = encoder.encode(CAT_BOOK_TEXT).buffer;
          const catBook: Book = {
            id: "sample-cat-book",
            title: "吾輩は猫である",
            author: "夏目漱石",
            coverUrl: CAT_COVER_SVG,
            fileType: "txt",
            fileData: catData,
            addedAt: Date.now() - 100000,
            currentChapterIndex: 0,
            currentProgress: 0,
          };
          await saveBook(catBook);

          // Seed "走れメロス"
          const melosData = encoder.encode(MELOS_BOOK_TEXT).buffer;
          const melosBook: Book = {
            id: "sample-melos-book",
            title: "走れメロス",
            author: "太宰治",
            coverUrl: MELOS_COVER_SVG,
            fileType: "txt",
            fileData: melosData,
            addedAt: Date.now(),
            currentChapterIndex: 0,
            currentProgress: 0,
          };
          await saveBook(melosBook);

          // Refresh parent state list
          onRefreshBooks();
        } catch (err) {
          console.error("Failed to seed sample books:", err);
        } finally {
          setIsSeeding(false);
        }
      }
    };
    
    seedSampleBooks();
  }, [books, isSeeding]);

  const handleFileUpload = async (file: File) => {
    setUploadError("");
    const isEpub = file.name.endsWith(".epub");
    const isTxt = file.name.endsWith(".txt");

    if (!isEpub && !isTxt) {
      setUploadError("Only EPUB and plain TXT files are supported.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return;

        let title = file.name.replace(/\.(epub|txt)$/i, "");
        let author = "Unknown Author";
        let coverUrl: string | undefined;

        if (isEpub) {
          try {
            const { parseEpubMetadata } = await import("../utils/epubParser");
            const meta = await parseEpubMetadata(buffer);
            title = meta.title || title;
            author = meta.author || author;
            coverUrl = meta.coverUrl;
          } catch (err) {
            console.error("EPUB metadata parse error, using file name:", err);
          }
        }

        const newBook: Book = {
          id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          author,
          coverUrl,
          fileType: isEpub ? "epub" : "txt",
          fileData: buffer,
          addedAt: Date.now(),
          currentChapterIndex: 0,
          currentProgress: 0,
        };

        await saveBook(newBook);
        onRefreshBooks();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Failed to upload book:", err);
      setUploadError("Failed to read the file. Please try again.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this book from your library?")) {
      await deleteBook(bookId);
      onRefreshBooks();
    }
  };

  // Drag and Drop triggers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-5xl w-full mx-auto gap-8 relative select-none">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans">
            読書 <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Library Workspace</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Store and read EPUB/TXT books locally. Hover words with Shift for dictionary lookups, vertical layout supported.
          </p>
        </div>

        {/* Manual Browse button */}
        <label className="px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 text-xs font-semibold text-neutral-350 hover:text-white transition flex items-center gap-2 cursor-pointer backdrop-blur-sm shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import EPUB / TXT
          <input
            type="file"
            accept=".epub,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </label>
      </div>

      {uploadError && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium">
          ⚠️ {uploadError}
        </div>
      )}

      {/* Upload Drop Zone card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border border-dashed rounded-3xl p-8 bg-neutral-950/20 text-center backdrop-blur-sm transition duration-300 flex flex-col justify-center items-center gap-4 ${
          isDragOver
            ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
            : "border-neutral-900 hover:border-neutral-800"
        }`}
      >
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition ${isDragOver ? "bg-blue-950/40 border-blue-800 text-blue-400" : "bg-neutral-900 border-neutral-800 text-neutral-500"}`}>
          📚
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-200">Drag and drop book files here</p>
          <p className="text-[10px] text-neutral-550 mt-1 font-mono">Supports reflowable EPUB or plain TXT format</p>
        </div>
      </div>

      {/* Book Grid */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Your Books ({books.length})</h3>
        
        {isSeeding && books.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-550 text-xs">
            <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
            <span>Seeding classic Aozora Bunko books...</span>
          </div>
        ) : books.length === 0 ? (
          <p className="text-xs text-neutral-600 italic py-16 text-center">Your library is currently empty.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group relative flex flex-col bg-neutral-950/40 border border-neutral-900/60 rounded-2xl p-3 hover:bg-neutral-900/30 hover:border-neutral-800 transition-all duration-300 cursor-pointer shadow-lg transform hover:-translate-y-1 hover:shadow-2xl"
              >
                {/* Delete button (shows on hover) */}
                <button
                  onClick={(e) => handleDelete(e, book.id)}
                  className="absolute top-2 right-2 z-20 w-6 h-6 rounded-lg bg-neutral-950/80 hover:bg-red-500/20 hover:text-red-400 border border-neutral-800 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                  title="Delete Book"
                >
                  ❌
                </button>

                {/* Cover Image container */}
                <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-900 relative shadow-inner group-hover:scale-[1.02] transition duration-300">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    // Fallback cover
                    <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex flex-col justify-between p-4">
                      <div className="text-[7px] font-mono text-neutral-500 tracking-widest uppercase">Ebook Reader</div>
                      <div className="text-xs font-serif font-bold text-neutral-300 line-clamp-3 leading-tight">{book.title}</div>
                      <div className="text-[9px] text-neutral-500 truncate">{book.author}</div>
                    </div>
                  )}

                  {/* Reading Progress Ribbon */}
                  {book.currentProgress > 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-2 py-1 flex items-center justify-between text-[9px] font-mono text-blue-400 font-semibold border-t border-neutral-900">
                      <span>Progress</span>
                      <span>{book.currentProgress}%</span>
                    </div>
                  )}
                </div>

                {/* Title & Author */}
                <div className="mt-3 flex flex-col min-w-0">
                  <h4 className="text-xs font-bold text-zinc-100 group-hover:text-white transition truncate font-sans">
                    {book.title}
                  </h4>
                  <span className="text-[10px] text-neutral-500 mt-0.5 truncate">
                    {book.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
