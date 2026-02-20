import { useState, useEffect } from "react";
export function useTypingEffect(
  texts: string[],
  typingSpeed: number = 50,
  deletingSpeed: number = 50,
  pauseDuration: number = 1500,
) {
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [prevTexts, setPrevTexts] = useState(texts);
  if (texts !== prevTexts) {
    setPrevTexts(texts);
    setDisplayedText("");
    setIsDeleting(false);
    setTextIndex(0);
  }
  useEffect(() => {
    if (texts.length === 0) return;
    const currentText = texts[textIndex % texts.length];
    let timer: ReturnType<typeof setTimeout>;

    if (isDeleting) {
      if (displayedText === "") {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }, 0);
      } else {
        timer = setTimeout(() => {
          setDisplayedText((prev) => prev.substring(0, prev.length - 1));
        }, deletingSpeed);
      }
    } else {
      if (displayedText === currentText) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      } else {
        timer = setTimeout(() => {
          setDisplayedText((prev) => currentText.substring(0, prev.length + 1));
        }, typingSpeed);
      }
    }
    return () => clearTimeout(timer);
  }, [
    displayedText,
    isDeleting,
    textIndex,
    texts,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
  ]);
  return displayedText;
}
