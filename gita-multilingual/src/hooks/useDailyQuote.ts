"use client";

import { useMemo } from "react";
import { dailyQuotes, Language } from "@/data/content";

const STORAGE_KEY = "gita-daily-quote";

const resolveQuoteId = (): string => {
  if (typeof window === "undefined") {
    return dailyQuotes[0]?.id ?? "";
  }
  const today = new Date();
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);

  let stored: { date: string; quoteId: string } | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      stored = JSON.parse(raw) as { date: string; quoteId: string };
    }
  } catch {
    stored = null;
  }

  if (stored?.date === localDate) {
    return stored.quoteId;
  }

  const selection =
    dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)] ?? dailyQuotes[0];

  if (selection) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: localDate, quoteId: selection.id }),
    );
    return selection.id;
  }

  return "";
};

export const useDailyQuote = (language: Language) => {
  const quoteId = useMemo(() => resolveQuoteId(), []);

  return useMemo(() => {
    const found = dailyQuotes.find((item) => item.id === quoteId) ?? dailyQuotes[0];
    if (!found) {
      return { text: "", source: "" };
    }
    return {
      text: found.text[language] ?? found.text.en,
      source: found.source[language] ?? found.source.en,
    };
  }, [language, quoteId]);
};
