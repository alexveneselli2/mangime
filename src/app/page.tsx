"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, Brain, Heart, TrendingUp } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Sparkles,
    title: "Analisi AI Istantanea",
    desc: "Descrivi cosa hai mangiato e l'AI calcola calorie e macronutrienti",
  },
  {
    icon: Brain,
    title: "Consigli Personalizzati",
    desc: "Ricevi suggerimenti basati sul tuo stile alimentare",
  },
  {
    icon: Heart,
    title: "Apple Health",
    desc: "Integra passi, calorie bruciate e sonno per consigli completi",
  },
  {
    icon: TrendingUp,
    title: "Report Settimanali",
    desc: "Analisi dettagliate dei tuoi trend nutrizionali",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-600 shadow-lg shadow-emerald-600/30 mb-6">
            <span className="text-3xl font-black text-white tracking-tight">N</span>
          </div>

          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Nutr<span className="text-emerald-600">IA</span>
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Il diario alimentare intelligente
          </p>
        </motion.div>

        {/* Features */}
        <div className="space-y-3 mb-10">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Link href="/register" className="block">
            <Button className="w-full" size="lg">
              Inizia Gratis
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button variant="ghost" className="w-full" size="lg">
              Ho gi&agrave; un account
            </Button>
          </Link>
        </motion.div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by AI &middot; Privacy First
        </p>
      </div>
    </div>
  );
}
