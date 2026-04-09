"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto",
              "bg-white rounded-t-3xl p-6 pb-8",
              "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "sm:rounded-2xl sm:max-w-md sm:w-full sm:pb-6",
              className
            )}
          >
            <div className="flex items-center justify-between mb-4">
              {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors ml-auto"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
