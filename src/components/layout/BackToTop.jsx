import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = document.getElementById("app-scroll-root");

    function handleScroll() {
      const topOffset = scrollContainer
        ? scrollContainer.scrollTop
        : window.scrollY;
      setIsVisible(topOffset > 300);
    }

    handleScroll();
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => {
        const scrollContainer = document.getElementById("app-scroll-root");
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="fixed bottom-24 right-4 z-50 rounded-full bg-brand-gold p-4 text-white shadow-lg animate-in fade-in zoom-in-95 transition hover:opacity-90 sm:bottom-8 sm:right-8"
    >
      <ChevronUp className="h-6 w-6" />
    </button>
  );
}

export default BackToTop;
