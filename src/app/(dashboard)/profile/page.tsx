"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  User,
  Target,
  Heart,
  LogOut,
  Save,
  Smartphone,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  height: number | null;
  weight: number | null;
  age: number | null;
  gender: string | null;
  activityLevel: string | null;
  goal: string | null;
  dietType: string | null;
  allergies: string | null;
  intolerances: string | null;
}

const goalOptions = [
  { value: "", label: "Seleziona..." },
  { value: "lose_weight", label: "Perdere peso" },
  { value: "maintain", label: "Mantenere il peso" },
  { value: "gain_muscle", label: "Aumentare massa muscolare" },
  { value: "health", label: "Migliorare la salute" },
];

const activityOptions = [
  { value: "", label: "Seleziona..." },
  { value: "sedentary", label: "Sedentario" },
  { value: "light", label: "Leggermente attivo" },
  { value: "moderate", label: "Moderatamente attivo" },
  { value: "active", label: "Attivo" },
  { value: "very_active", label: "Molto attivo" },
];

const genderOptions = [
  { value: "", label: "Seleziona..." },
  { value: "male", label: "Uomo" },
  { value: "female", label: "Donna" },
  { value: "other", label: "Altro" },
];

const dietOptions = [
  { value: "", label: "Nessuna preferenza" },
  { value: "omnivore", label: "Onnivoro" },
  { value: "vegetarian", label: "Vegetariano" },
  { value: "vegan", label: "Vegano" },
  { value: "keto", label: "Chetogenica" },
  { value: "mediterranean", label: "Mediterranea" },
  { value: "paleo", label: "Paleo" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [dietType, setDietType] = useState("");

  // Health data form
  const [steps, setSteps] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [savingHealth, setSavingHealth] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        const u = data.user;
        setUser(u);
        setName(u.name || "");
        setHeight(u.height?.toString() || "");
        setWeight(u.weight?.toString() || "");
        setAge(u.age?.toString() || "");
        setGender(u.gender || "");
        setActivityLevel(u.activityLevel || "");
        setGoal(u.goal || "");
        setDietType(u.dietType || "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          activityLevel: activityLevel || null,
          goal: goal || null,
          dietType: dietType || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHealth = async () => {
    setSavingHealth(true);
    try {
      await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: steps ? parseInt(steps) : null,
          sleepHours: sleepHours ? parseFloat(sleepHours) : null,
          weight: weight ? parseFloat(weight) : null,
          source: "manual",
        }),
      });
    } finally {
      setSavingHealth(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profilo</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
        >
          <LogOut size={16} />
          Esci
        </button>
      </div>

      {/* User Info */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-gray-500" />
          <CardTitle className="text-sm">Informazioni Personali</CardTitle>
        </div>
        <div className="space-y-3">
          <Input id="name" label="Nome" value={name} onChange={e => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="height" label="Altezza (cm)" type="number" value={height} onChange={e => setHeight(e.target.value)} />
            <Input id="weight" label="Peso (kg)" type="number" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="age" label="Et&agrave;" type="number" value={age} onChange={e => setAge(e.target.value)} />
            <Select id="gender" label="Genere" value={gender} onChange={e => setGender(e.target.value)} options={genderOptions} />
          </div>
        </div>
      </Card>

      {/* Goals */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} className="text-emerald-500" />
          <CardTitle className="text-sm">Obiettivi e Preferenze</CardTitle>
        </div>
        <div className="space-y-3">
          <Select
            id="goal"
            label="Obiettivo"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            options={goalOptions}
          />
          <Select
            id="activity"
            label="Livello di attivit&agrave;"
            value={activityLevel}
            onChange={e => setActivityLevel(e.target.value)}
            options={activityOptions}
          />
          <Select
            id="diet"
            label="Tipo di dieta"
            value={dietType}
            onChange={e => setDietType(e.target.value)}
            options={dietOptions}
          />
        </div>
      </Card>

      {/* Save Button */}
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
          <Save size={16} className="mr-2" />
          {saved ? "Salvato!" : "Salva Profilo"}
        </Button>
      </motion.div>

      {/* Health Data (Manual) */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Heart size={16} className="text-red-500" />
          <CardTitle className="text-sm">Dati Salute (Manuale)</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Inserisci manualmente i dati di salute, oppure collega Apple Health dalla versione nativa dell&apos;app.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="steps"
              label="Passi oggi"
              type="number"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder="es. 8000"
            />
            <Input
              id="sleep"
              label="Ore di sonno"
              type="number"
              value={sleepHours}
              onChange={e => setSleepHours(e.target.value)}
              placeholder="es. 7.5"
            />
          </div>
          <Button onClick={handleSaveHealth} loading={savingHealth} variant="secondary" className="w-full" size="sm">
            <Activity size={14} className="mr-1.5" />
            Salva Dati Salute
          </Button>
        </div>
      </Card>

      {/* Apple Health Integration Info */}
      <Card className="!bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white text-gray-600">
            <Smartphone size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Apple Health</p>
            <p className="text-xs text-gray-500 mt-1">
              L&apos;integrazione con Apple Health sar&agrave; disponibile nella versione nativa dell&apos;app.
              Per ora puoi inserire i dati manualmente.
            </p>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-gray-400 pb-4">
        NutrIA v1.0 &middot; {user?.email}
      </p>
    </div>
  );
}
