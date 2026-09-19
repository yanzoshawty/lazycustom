"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

/*
 * Toast dipakai hanya untuk kabar singkat yang tidak perlu tindakan.
 * Masalah yang butuh tindakan tampil inline lewat ErrorNotice.
 * Lapisan z: toast z-50 (satu-satunya lapisan melayang di aplikasi ini).
 */
interface ToastItem {
  id: number;
  text: string;
}

type Push = (text: string) => void;

const ToastContext = createContext<Push>(() => undefined);

export function useToast(): Push {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const push = useCallback<Push>((text) => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-2), { id, text }]);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
    timers.current.add(timer);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.p
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="rounded-full border border-line bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lg"
            >
              {t.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
