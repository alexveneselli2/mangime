const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface NutritionalData {
  foodName: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
  notes: string;
}

interface FoodAnalysis {
  items: NutritionalData[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  mealQuality: number;
  suggestions: string[];
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your-anthropic-api-key-here") {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function analyzeFoodEntry(description: string, mealType: string): Promise<FoodAnalysis> {
  const systemPrompt = `You are a nutritional analysis AI. Analyze the food description and provide detailed nutritional estimates.
Respond ONLY with a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "items": [
    {
      "foodName": "name of the food",
      "quantity": "estimated quantity",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "fiber": number (grams),
      "sugar": number (grams),
      "sodium": number (mg),
      "confidence": number (0-1, how confident you are),
      "notes": "any relevant notes"
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalFiber": number,
  "mealQuality": number (0-100, overall meal quality score),
  "suggestions": ["suggestion1", "suggestion2"]
}

Be realistic with portions. If the description is vague, estimate typical serving sizes.
Consider the meal type for context (breakfast portions differ from dinner).
Always respond in the same language as the user's description.`;

  const userMessage = `Meal type: ${mealType}
Food description: ${description}`;

  try {
    const response = await callClaude(systemPrompt, userMessage);
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback with estimates if API fails
    return generateFallbackAnalysis(description);
  }
}

export async function generateDailyInsight(
  entries: { description: string; calories: number; protein: number; carbs: number; fat: number; mealType: string }[],
  userProfile: { goal?: string | null; dietType?: string | null; weight?: number | null; height?: number | null; age?: number | null; gender?: string | null; activityLevel?: string | null },
  healthData?: { steps?: number | null; activeEnergy?: number | null; sleepHours?: number | null }
): Promise<{ summary: string; score: number; tips: string[] }> {
  const systemPrompt = `You are a friendly, expert nutritionist AI assistant for the app "NutrIA".
Analyze the user's daily food intake and provide personalized insights.
Respond ONLY with valid JSON (no markdown, no code fences):
{
  "summary": "A brief, encouraging summary of the day's nutrition (2-3 sentences)",
  "score": number (0-100, daily nutrition quality score),
  "tips": ["tip1", "tip2", "tip3"] (3 actionable, specific tips)
}
Always respond in Italian. Be encouraging but honest.`;

  const entriesSummary = entries.map(e =>
    `${e.mealType}: ${e.description} (${e.calories} kcal, P:${e.protein}g C:${e.carbs}g F:${e.fat}g)`
  ).join("\n");

  const profileInfo = userProfile.goal ? `
User profile: Goal: ${userProfile.goal}, Diet: ${userProfile.dietType || "not specified"},
Weight: ${userProfile.weight || "N/A"}kg, Height: ${userProfile.height || "N/A"}cm,
Age: ${userProfile.age || "N/A"}, Gender: ${userProfile.gender || "N/A"},
Activity: ${userProfile.activityLevel || "N/A"}` : "";

  const healthInfo = healthData ? `
Health data today: Steps: ${healthData.steps || "N/A"},
Active energy burned: ${healthData.activeEnergy || "N/A"} kcal,
Sleep: ${healthData.sleepHours || "N/A"} hours` : "";

  const userMessage = `Today's meals:\n${entriesSummary}${profileInfo}${healthInfo}`;

  try {
    const response = await callClaude(systemPrompt, userMessage);
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: "Non sono riuscito ad analizzare la giornata. Continua a registrare i pasti!",
      score: 50,
      tips: ["Cerca di variare gli alimenti", "Bevi almeno 2 litri di acqua", "Includi frutta e verdura in ogni pasto"],
    };
  }
}

export async function generateWeeklyReport(
  dailySummaries: { date: string; totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number; qualityScore: number | null }[],
  userProfile: { goal?: string | null; dietType?: string | null; weight?: number | null },
  healthDataWeek: { steps?: number | null; activeEnergy?: number | null; sleepHours?: number | null }[]
): Promise<{ report: string; overallScore: number; strengths: string[]; improvements: string[]; weeklyGoals: string[] }> {
  const systemPrompt = `You are an expert nutritionist AI for "NutrIA". Generate a comprehensive weekly nutrition report.
Respond ONLY with valid JSON (no markdown, no code fences):
{
  "report": "Detailed weekly analysis (3-4 paragraphs)",
  "overallScore": number (0-100),
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "weeklyGoals": ["goal1", "goal2", "goal3"]
}
Always respond in Italian. Be motivating and specific.`;

  const summaryText = dailySummaries.map(d =>
    `${d.date}: ${d.totalCalories} kcal (P:${d.totalProtein}g C:${d.totalCarbs}g F:${d.totalFat}g) Score: ${d.qualityScore || "N/A"}`
  ).join("\n");

  const userMessage = `Weekly food summary:\n${summaryText}\nUser goal: ${userProfile.goal || "general health"}\nDiet: ${userProfile.dietType || "not specified"}`;

  try {
    const response = await callClaude(systemPrompt, userMessage);
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      report: "Report settimanale non disponibile. Continua a registrare i pasti per ricevere analisi dettagliate.",
      overallScore: 50,
      strengths: ["Stai usando NutrIA regolarmente"],
      improvements: ["Registra più pasti per un'analisi completa"],
      weeklyGoals: ["Registra almeno 3 pasti al giorno", "Bevi 2L di acqua", "Includi 5 porzioni di frutta e verdura"],
    };
  }
}

function generateFallbackAnalysis(description: string): FoodAnalysis {
  // Simple heuristic fallback when API is unavailable
  const words = description.toLowerCase();
  let baseCalories = 300;
  let protein = 15, carbs = 40, fat = 10, fiber = 3;

  if (words.includes("insalata") || words.includes("salad")) {
    baseCalories = 150; protein = 5; carbs = 15; fat = 8; fiber = 5;
  } else if (words.includes("pasta")) {
    baseCalories = 450; protein = 12; carbs = 65; fat = 12; fiber = 3;
  } else if (words.includes("pizza")) {
    baseCalories = 600; protein = 20; carbs = 70; fat = 25; fiber = 3;
  } else if (words.includes("pollo") || words.includes("chicken")) {
    baseCalories = 350; protein = 35; carbs = 5; fat = 15; fiber = 1;
  } else if (words.includes("pesce") || words.includes("fish") || words.includes("salmone")) {
    baseCalories = 300; protein = 30; carbs = 2; fat = 18; fiber = 0;
  } else if (words.includes("frutta") || words.includes("fruit") || words.includes("mela")) {
    baseCalories = 100; protein = 1; carbs = 25; fat = 0; fiber = 4;
  } else if (words.includes("riso") || words.includes("rice")) {
    baseCalories = 400; protein = 8; carbs = 80; fat = 2; fiber = 2;
  }

  return {
    items: [{
      foodName: description,
      quantity: "1 porzione",
      calories: baseCalories,
      protein, carbs, fat, fiber,
      sugar: Math.round(carbs * 0.2),
      sodium: 400,
      confidence: 0.3,
      notes: "Stima approssimativa (API AI non disponibile)",
    }],
    totalCalories: baseCalories,
    totalProtein: protein,
    totalCarbs: carbs,
    totalFat: fat,
    totalFiber: fiber,
    mealQuality: 60,
    suggestions: ["Configura la API key di Anthropic per analisi più precise"],
  };
}
