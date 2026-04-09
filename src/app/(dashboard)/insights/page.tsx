"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Target,
  Lightbulb,
  RefreshCw,
  Star,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyInsight {
  summary: string;
  score: number;
  tips: string[];
}

interface WeeklyReport {
  report: string;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  weeklyGoals: string[];
}

export default function InsightsPage() {
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  const fetchDailyInsight = async () => {
    setLoadingDaily(true);
    try {
      const res = await fetch("/api/insights?type=daily");
      const data = await res.json();
      setDailyInsight(data);
    } catch {
      // silently fail
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchWeeklyReport = async () => {
    setLoadingWeekly(true);
    try {
      const res = await fetch("/api/insights?type=weekly");
      const data = await res.json();
      setWeeklyReport(data);
    } catch {
      // silently fail
    } finally {
      setLoadingWeekly(false);
    }
  };

  useEffect(() => {
    fetchDailyInsight();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "from-emerald-50 to-green-50 border-emerald-100";
    if (score >= 60) return "from-yellow-50 to-amber-50 border-yellow-100";
    if (score >= 40) return "from-orange-50 to-amber-50 border-orange-100";
    return "from-red-50 to-pink-50 border-red-100";
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-sm text-gray-500">Analisi personalizzata della tua alimentazione</p>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
          <Sparkles size={20} />
        </div>
      </div>

      {/* Tab Switch */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => {
            setActiveTab("daily");
            if (!dailyInsight) fetchDailyInsight();
          }}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
            activeTab === "daily"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          )}
        >
          Oggi
        </button>
        <button
          onClick={() => {
            setActiveTab("weekly");
            if (!weeklyReport) fetchWeeklyReport();
          }}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
            activeTab === "weekly"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          )}
        >
          Settimana
        </button>
      </div>

      {/* Daily Insight */}
      {activeTab === "daily" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {loadingDaily ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : dailyInsight ? (
            <>
              {/* Score Card */}
              <Card className={cn("!p-5 bg-gradient-to-br border", getScoreBg(dailyInsight.score))}>
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm">Punteggio Giornaliero</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchDailyInsight}
                    className="!p-1"
                  >
                    <RefreshCw size={16} className="text-gray-400" />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className={cn("text-4xl font-black", getScoreColor(dailyInsight.score))}>
                    {dailyInsight.score}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{dailyInsight.summary}</p>
                  </div>
                </div>
              </Card>

              {/* Tips */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-amber-500" />
                  <CardTitle className="text-sm">Consigli per te</CardTitle>
                </div>
                <div className="space-y-2">
                  {dailyInsight.tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-700">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="!p-8 text-center">
              <Sparkles className="mx-auto mb-3 text-gray-300" size={32} />
              <p className="text-gray-500 text-sm">
                Registra almeno un pasto per ricevere insight dall&apos;AI
              </p>
            </Card>
          )}
        </motion.div>
      )}

      {/* Weekly Report */}
      {activeTab === "weekly" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {loadingWeekly ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : weeklyReport ? (
            <>
              {/* Overall Score */}
              <Card className={cn("!p-5 bg-gradient-to-br border", getScoreBg(weeklyReport.overallScore))}>
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm">Punteggio Settimanale</CardTitle>
                  <Button variant="ghost" size="icon" onClick={fetchWeeklyReport} className="!p-1">
                    <RefreshCw size={16} className="text-gray-400" />
                  </Button>
                </div>
                <div className={cn("text-4xl font-black mb-2", getScoreColor(weeklyReport.overallScore))}>
                  {weeklyReport.overallScore}
                </div>
              </Card>

              {/* Report */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-blue-500" />
                  <CardTitle className="text-sm">Analisi Settimanale</CardTitle>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {weeklyReport.report}
                </p>
              </Card>

              {/* Strengths */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Star size={16} className="text-emerald-500" />
                  <CardTitle className="text-sm">Punti di Forza</CardTitle>
                </div>
                <div className="space-y-2">
                  {weeklyReport.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Trophy size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Improvements */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <CardTitle className="text-sm">Aree di Miglioramento</CardTitle>
                </div>
                <div className="space-y-2">
                  {weeklyReport.improvements.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Target size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Goals */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-blue-500" />
                  <CardTitle className="text-sm">Obiettivi Settimanali</CardTitle>
                </div>
                <div className="space-y-2">
                  {weeklyReport.weeklyGoals.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm text-blue-800">{g}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="!p-8 text-center">
              <TrendingUp className="mx-auto mb-3 text-gray-300" size={32} />
              <p className="text-gray-500 text-sm mb-3">
                Clicca per generare il report settimanale
              </p>
              <Button onClick={fetchWeeklyReport} size="sm">
                <Sparkles size={14} className="mr-1" />
                Genera Report
              </Button>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
