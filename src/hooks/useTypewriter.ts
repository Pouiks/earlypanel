"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Scenario } from "@/types";

interface UseTypewriterReturn {
  currentIndex: number;
  displayedText: string;
  charCount: number;
  isTypingDone: boolean;
  goToScenario: (index: number) => void;
  goToNext: () => void;
}

export function useTypewriter(
  scenarios: Scenario[],
  speed = 16,
  pauseAfterDone = 3500,
  startDelay = 500
): UseTypewriterReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    timerRef.current = null;
    pauseTimerRef.current = null;
    startTimerRef.current = null;
  }, []);

  const startTyping = useCallback(
    (scenarioIndex: number) => {
      const fullText = scenarios[scenarioIndex].answer;
      let idx = 0;
      setCharIndex(0);
      setIsTypingDone(false);

      timerRef.current = setInterval(() => {
        if (idx <= fullText.length) {
          setCharIndex(idx);
          idx++;
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setIsTypingDone(true);

          pauseTimerRef.current = setTimeout(() => {
            const nextIdx = (scenarioIndex + 1) % scenarios.length;
            setCurrentIndex(nextIdx);
          }, pauseAfterDone);
        }
      }, speed);
    },
    [scenarios, speed, pauseAfterDone]
  );

  const goToScenario = useCallback(
    (index: number) => {
      clearAllTimers();
      setCurrentIndex(index);
    },
    [clearAllTimers]
  );

  const goToNext = useCallback(() => {
    clearAllTimers();
    setCurrentIndex((prev) => (prev + 1) % scenarios.length);
  }, [clearAllTimers, scenarios.length]);

  useEffect(() => {
    clearAllTimers();
    setCharIndex(0);
    setIsTypingDone(false);

    startTimerRef.current = setTimeout(() => {
      startTyping(currentIndex);
    }, startDelay);

    return clearAllTimers;
  }, [currentIndex, clearAllTimers, startTyping, startDelay]);

  const scenario = scenarios[currentIndex];
  const displayedText = scenario.answer.slice(0, charIndex);

  return {
    currentIndex,
    displayedText,
    charCount: charIndex,
    isTypingDone,
    goToScenario,
    goToNext,
  };
}
