"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import {
  chapters,
  languageOptions,
  uiCopy,
  Language,
  ChapterContent,
} from "@/data/content";
import { useTanpuraDrone } from "@/hooks/useTanpuraDrone";
import { useDailyQuote } from "@/hooks/useDailyQuote";

const voiceHints: Record<Language, string[]> = {
  en: ["en-IN", "en-GB", "en-US"],
  hi: ["hi-IN", "mr-IN"],
  ml: ["ml-IN", "en-IN"],
  ta: ["ta-IN", "en-IN"],
  kn: ["kn-IN", "en-IN"],
  te: ["te-IN", "en-IN"],
  bn: ["bn-IN", "en-IN"],
  ar: ["ar-SA", "ar-EG", "ar"],
};

const fetchLocalized = (
  value: Record<Language, string>,
  language: Language,
): string => value[language] ?? value.en;

const pickVoice = (
  voices: SpeechSynthesisVoice[],
  language: Language,
): SpeechSynthesisVoice | undefined => {
  const hints = voiceHints[language];
  for (const hint of hints) {
    const voice = voices.find((item) => item.lang?.toLowerCase().startsWith(hint.toLowerCase()));
    if (voice) return voice;
  }
  return voices.find((item) => item.lang?.toLowerCase().startsWith("en"));
};

export const GitaExperience = () => {
  const [language, setLanguage] = useState<Language>("en");
  const [chapterId, setChapterId] = useState<number>(chapters[0]?.id ?? 1);
  const [sectionId, setSectionId] = useState<string>(chapters[0]?.sections[0]?.id ?? "");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { isActive: isDroneActive, toggle: toggleDrone } = useTanpuraDrone();
  const quote = useDailyQuote(language);

  const chapter = useMemo<ChapterContent | undefined>(
    () => chapters.find((item) => item.id === chapterId),
    [chapterId],
  );

  const section = useMemo(() => {
    if (!chapter) return undefined;
    return chapter.sections.find((item) => item.id === sectionId) ?? chapter.sections[0];
  }, [chapter, sectionId]);

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!speechSupported) return;

    const syncVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length) {
        startTransition(() => setVoices(available));
      }
    };

    syncVoices();

    const target = window.speechSynthesis as SpeechSynthesis & {
      addEventListener?: (
        type: "voiceschanged",
        listener: () => void,
      ) => void;
      removeEventListener?: (
        type: "voiceschanged",
        listener: () => void,
      ) => void;
    };

    if (typeof target.addEventListener === "function") {
      target.addEventListener("voiceschanged", syncVoices);
      return () => {
        target.removeEventListener?.("voiceschanged", syncVoices);
      };
    }

    const previous = target.onvoiceschanged;
    target.onvoiceschanged = syncVoices;
    return () => {
      if (target.onvoiceschanged === syncVoices) {
        target.onvoiceschanged = previous ?? null;
      }
    };
  }, [speechSupported]);

  const handleNarration = useCallback(() => {
    if (!section || typeof window === "undefined") return;
    const synthesis = window.speechSynthesis;
    if (!synthesis) return;

    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      [
        fetchLocalized(section.brief, language),
        fetchLocalized(section.narration, language),
        fetchLocalized(section.realLife, language),
      ].join(" "),
    );

    const voice = pickVoice(voices, language);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = language === "ar" ? "ar-SA" : "en-IN";
    }

    utterance.rate = language === "ar" ? 0.9 : language === "en" ? 0.98 : 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synthesis.speak(utterance);
  }, [language, section, voices]);

  const stopNarration = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      stopNarration();
    };
  }, [stopNarration]);

  const cardGradient = "bg-white/70 backdrop-blur-xl shadow-xl shadow-sky-200/40";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-amber-50 to-rose-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <header className="flex flex-col gap-4 rounded-3xl bg-white/80 px-6 py-6 backdrop-blur-xl shadow-lg shadow-amber-100/50 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold md:text-3xl">
              {fetchLocalized(uiCopy.appTitle, language)}
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 md:text-base">
              {fetchLocalized(uiCopy.appSubtitle, language)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              {fetchLocalized(uiCopy.languageLabel, language)}
              <select
                value={language}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                onChange={(event) => setLanguage(event.target.value as Language)}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={toggleDrone}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                isDroneActive
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-white text-amber-700 hover:bg-amber-100"
              }`}
            >
              {fetchLocalized(
                isDroneActive ? uiCopy.tanpuraOff : uiCopy.tanpuraOn,
                language,
              )}
            </button>
          </div>
        </header>

        <section className={`${cardGradient} rounded-3xl px-6 py-5`}> 
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
            {fetchLocalized(uiCopy.dailyQuoteTitle, language)}
          </h2>
          <p className="mt-3 text-lg font-medium text-slate-800 md:text-xl">
            {quote.text}
          </p>
          <p className="mt-2 text-sm text-slate-500">{quote.source}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-400">
            {fetchLocalized(uiCopy.newDayPrompt, language)}
          </p>
        </section>

        <div className="grid flex-1 gap-6 lg:grid-cols-[280px,1fr]">
          <aside className={`${cardGradient} max-h-[70vh] overflow-y-auto rounded-3xl px-4 py-6`}> 
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              {fetchLocalized(uiCopy.chapterListHeading, language)}
            </h3>
            <nav className="flex flex-col gap-3">
              {chapters.map((item) => {
                const isActive = item.id === chapter?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setChapterId(item.id);
                      setSectionId(item.sections[0]?.id ?? "");
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                      isActive
                        ? "border-transparent bg-sky-500 text-white shadow-md shadow-sky-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {fetchLocalized(item.name, language)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {fetchLocalized(item.essence, language)}
                    </p>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex flex-col gap-6">
            {chapter && (
              <article className={`${cardGradient} rounded-3xl px-6 py-6`}> 
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
                      {fetchLocalized(chapter.name, language)}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                      {fetchLocalized(chapter.essence, language)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-inner">
                    <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
                      {fetchLocalized(uiCopy.highlightVerseLabel, language)}
                    </span>
                    <p className="mt-2 text-sm leading-relaxed">
                      {fetchLocalized(chapter.highlightVerse, language)}
                    </p>
                  </div>
                </div>
              </article>
            )}

            {chapter && section && (
              <section className={`${cardGradient} rounded-3xl px-6 py-6`}> 
                <div className="mb-5 flex flex-wrap gap-2">
                  {chapter.sections.map((item) => {
                    const active = item.id === section.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSectionId(item.id)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                          active
                            ? "border-transparent bg-amber-500 text-white"
                            : "border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {fetchLocalized(item.title, language)}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-6 md:grid-cols-[minmax(0,260px),1fr]">
                  {section.image && (
                    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-slate-200">
                      <Image
                        src={section.image}
                        alt={fetchLocalized(section.title, language)}
                        fill
                        sizes="(max-width: 768px) 100vw, 260px"
                        className="object-cover object-center"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-4">
                    <header>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {fetchLocalized(section.title, language)}
                      </h3>
                    </header>
                    <div className="grid gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                          {fetchLocalized(uiCopy.briefLabel, language)}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          {fetchLocalized(section.brief, language)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                          {fetchLocalized(uiCopy.narrationLabel, language)}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          {fetchLocalized(section.narration, language)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                          {fetchLocalized(uiCopy.realLifeLabel, language)}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          {fetchLocalized(section.realLife, language)}
                        </p>
                      </div>
                    </div>
                    {speechSupported ? (
                      <div className="mt-2 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={isSpeaking ? stopNarration : handleNarration}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                            isSpeaking
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : "bg-sky-500 text-white hover:bg-sky-600"
                          }`}
                        >
                          {fetchLocalized(
                            isSpeaking ? uiCopy.stopNarration : uiCopy.listenNarration,
                            language,
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-rose-600">
                        {fetchLocalized(uiCopy.noSpeechSupport, language)}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitaExperience;
