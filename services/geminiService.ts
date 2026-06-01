import { UserStats, NutritionGoals } from "../hooks/useProfile";
import Constants from "expo-constants";

/** Gemini 2.0 Flash is discontinued June 1, 2026 — use 3.1 Flash Lite Preview. */
export const GEMINI_MODEL = "gemini-3.1-flash-lite";

const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type GeminiContentPart = {
  text?: string;
  thought?: boolean;
  thought_signature?: string;
  inline_data?: { mime_type: string; data: string };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: GeminiContentPart[] } }>;
};

/** Model turn to pass back on follow-up requests (preserves thought signatures). */
export type GeminiModelTurn = {
  role: "model";
  parts: GeminiContentPart[];
};

const DEFAULT_GENERATION_CONFIG = {
  topK: 32,
  topP: 1,
  maxOutputTokens: 1024,
  thinkingConfig: { thinkingLevel: "minimal" as const },
};

function getGeminiApiKey(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.geminiApiKey as string | undefined) ||
    process.env.EXPO_PUBLIC_GEMINI_API_KEY
  );
}

/** Extract answer text; skips thought-summary parts from thinking models. */
function extractTextFromGeminiResponse(
  data: GeminiGenerateContentResponse
): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) return "";

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.text && !part.thought) return part.text;
  }

  for (const part of parts) {
    if (part.text) return part.text;
  }
  return "";
}

/** Preserve the full model turn for multi-turn / function-calling follow-ups. */
export function modelTurnFromGeminiResponse(
  data: GeminiGenerateContentResponse
): GeminiModelTurn | null {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;
  return { role: "model", parts };
}

async function callGeminiGenerateContent(
  parts: GeminiContentPart[],
  configOverrides: {
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
): Promise<GeminiGenerateContentResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }

  const url = `${GEMINI_GENERATE_CONTENT_URL}?key=${apiKey}`;
  const payload = {
    contents: [{ parts }],
    generationConfig: {
      ...DEFAULT_GENERATION_CONFIG,
      temperature: configOverrides.temperature ?? 0.2,
      ...(configOverrides.maxOutputTokens != null && {
        maxOutputTokens: configOverrides.maxOutputTokens,
      }),
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Gemini API error response:", errorData);
    throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
  }

  return response.json();
}

interface AnalysisResult {
  title: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ExerciseData {
  type: string;
  duration: number;
  description: string;
  userStats: UserStats;
  intensity: string;
}

export interface ExerciseResult {
  title: string;
  caloriesBurned: number;
  description: string;
}

export interface WeightTrendAnalysis {
  trend: string; // "losing", "gaining", "maintaining"
  averageWeeklyChange: number;
  feedback: string;
  recommendedActions: string[];
}

/**
 * Analyzes a food image using Gemini 3.1 Flash Lite Preview
 * @param base64Image - Base64 encoded image
 * @returns Nutritional analysis of the food in the image
 */
export const analyzeFoodImage = async (
  base64Image: string
): Promise<AnalysisResult> => {
  try {
    if (!getGeminiApiKey()) {
      console.warn("Gemini API key is not configured");
      return createDefaultResult();
    }

    const parts: GeminiContentPart[] = [
      {
        text: `Analyze this food image and provide a detailed nutritional analysis. Follow these guidelines:

1. Identify all food items in the image and list them in the 'items' array.
2. For each food item, estimate:
   - Total calories (kcal)
   - Protein content (g)
   - Carbohydrate content (g)
   - Fat content (g)

3. Consider these factors in your estimation:
   - Portion sizes relative to common serving sizes
   - Cooking methods (fried, baked, raw, etc.)
   - Visible ingredients and their quantities
   - Standard nutritional values for similar dishes

4. Return ONLY a valid JSON object with these fields:
   {
     "title": "Meal Title",
     "items": ["food item 1", "food item 2", ...],
     "calories": number,
     "protein": number,
     "carbs": number,
     "fats": number
   }

5. Ensure all numbers are realistic and consistent with standard nutritional values.
6. Do not include any explanation or additional text outside the JSON object.`,
      },
      {
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Image,
        },
      },
    ];

    console.log("Sending request to Gemini API...");

    const data = await callGeminiGenerateContent(parts, { temperature: 0.1 });
    console.log("Received response from Gemini API");

    const textContent = extractTextFromGeminiResponse(data);
    console.log("Raw response:", textContent);

    // Extract the JSON portion from the text response
    const jsonMatch =
      textContent.match(/```json\n([\s\S]*?)\n```/) ||
      textContent.match(/```([\s\S]*?)```/) ||
      textContent.match(/\{[\s\S]*\}/);

    let parsedResult: AnalysisResult;

    if (jsonMatch) {
      try {
        // Clean up the JSON string and parse it
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log("Extracted JSON:", jsonStr);
        parsedResult = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Error parsing JSON from Gemini response:", parseError);
        // Fallback to default values
        parsedResult = createDefaultResult();
      }
    } else {
      console.warn("Could not extract JSON from Gemini response");
      parsedResult = createDefaultResult();
    }

    // Ensure all required fields are present with numeric values
    return {
      title:
        typeof parsedResult.title === "string"
          ? parsedResult.title
          : "Unknown Meal",
      items: Array.isArray(parsedResult.items)
        ? parsedResult.items
        : ["Unknown food item"],
      calories:
        typeof parsedResult.calories === "number" ? parsedResult.calories : 0,
      protein:
        typeof parsedResult.protein === "number" ? parsedResult.protein : 0,
      carbs: typeof parsedResult.carbs === "number" ? parsedResult.carbs : 0,
      fats: typeof parsedResult.fats === "number" ? parsedResult.fats : 0,
    };
  } catch (error) {
    console.error("Food analysis error:", error);
    return createDefaultResult();
  }
};

/**
 * Gets personalized nutrition recommendations based on user stats
 * @param userStats - User's physical stats and goals
 * @param geminiData - Formatted data specifically for Gemini API
 * @returns Recommended nutrition goals
 */
export const getNutritionRecommendations = async (
  userStats: UserStats,
  geminiData?: any
): Promise<NutritionGoals> => {
  try {
    if (!getGeminiApiKey()) {
      console.warn("Gemini API key is not configured");
      return createDefaultNutritionGoals();
    }

    let prompt;

    if (geminiData) {
      // Use the formatted data specifically for Gemini
      prompt = `
      Create a personalized nutrition plan based on the following information:
      - Age: ${geminiData.age}
      - Sex (biological): ${geminiData.sex}
      - Height: ${geminiData.height}
      - Weight: ${geminiData.weight}
      - Activity Level: ${geminiData.activityLevel}
      - Goal: ${geminiData.goal}
      
      I need a daily nutrition plan with specific macronutrient targets. Please provide:
      - Total daily calories
      - Protein in grams
      - Carbohydrates in grams
      - Fats in grams
      
      Return ONLY a valid JSON object with the following fields:
      {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number
      }
      
      Do not include any explanation, text, or other information outside of the JSON object.
      `;
    } else {
      // Use the original approach with userStats
      prompt = `
      Based on the following user information, provide personalized daily nutrition recommendations:
      - Starting weight: ${userStats.startingWeight} kg
      - Current weight: ${userStats.currentWeight} kg
      - Goal weight: ${userStats.goalWeight} kg
      - Weekly goal: ${userStats.weeklyGoal} (lose, maintain, or gain weight)
      - Activity level: ${userStats.activityLevel}
      - Height: ${userStats.height} cm
      - Age: ${userStats.age}
      - Gender: ${userStats.gender}

      Return ONLY a valid JSON object with recommended daily nutrition goals with the following fields:
      - calories (number): Total daily calories
      - protein (number): Daily protein in grams
      - carbs (number): Daily carbs in grams
      - fats (number): Daily fats in grams

      Do not include any explanation, text, or other information outside of the JSON object.
      `;
    }

    console.log("Requesting nutrition recommendations from Gemini API...");

    const data = await callGeminiGenerateContent([{ text: prompt.trim() }]);
    console.log("Received nutrition recommendations from Gemini API");

    const textContent = extractTextFromGeminiResponse(data);
    console.log("Raw response:", textContent);

    // Extract the JSON portion from the text response
    const jsonMatch =
      textContent.match(/```json\n([\s\S]*?)\n```/) ||
      textContent.match(/```([\s\S]*?)```/) ||
      textContent.match(/\{[\s\S]*\}/);

    let parsedResult: NutritionGoals;

    if (jsonMatch) {
      try {
        // Clean up the JSON string and parse it
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log("Extracted JSON:", jsonStr);
        parsedResult = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error(
          "Error parsing JSON from nutrition recommendations:",
          parseError
        );
        // Fallback to default values
        parsedResult = createDefaultNutritionGoals();
      }
    } else {
      console.warn("Could not extract JSON from Gemini API response");
      parsedResult = createDefaultNutritionGoals();
    }

    // Ensure all required fields are present with numeric values
    return {
      calories:
        typeof parsedResult.calories === "number"
          ? parsedResult.calories
          : 2000,
      protein:
        typeof parsedResult.protein === "number" ? parsedResult.protein : 150,
      carbs: typeof parsedResult.carbs === "number" ? parsedResult.carbs : 200,
      fats: typeof parsedResult.fats === "number" ? parsedResult.fats : 65,
    };
  } catch (error) {
    console.error("Error getting nutrition recommendations:", error);
    return createDefaultNutritionGoals();
  }
};

// Create a default result for fallback
const createDefaultResult = (): AnalysisResult => {
  return {
    title: "Unknown Meal",
    items: ["Unknown food item"],
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  };
};

// Create default nutrition goals for fallback
const createDefaultNutritionGoals = (): NutritionGoals => {
  return {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fats: 65,
  };
};

export const analyzeExercise = async (
  exerciseData: ExerciseData
): Promise<ExerciseResult> => {
  try {
    if (!getGeminiApiKey()) {
      throw new Error("Gemini API key is not configured");
    }

    const prompt = `Calculate calories burned for this exercise:
    Type: ${exerciseData.type}
    Duration: ${exerciseData.duration} minutes
    Intensity: ${exerciseData.intensity || "Moderate"}
    Description: ${exerciseData.description}
    User Stats:
    - Weight: ${exerciseData.userStats.currentWeight} kg
    - Height: ${exerciseData.userStats.height} cm
    - Age: ${exerciseData.userStats.age}
    - Gender: ${exerciseData.userStats.gender}
    - Activity Level: ${exerciseData.userStats.activityLevel}

    Return a JSON object with:
    - title: A descriptive title for the exercise that includes intensity level
    - caloriesBurned: Estimated calories burned (number)
    - description: A brief description of the exercise

    Consider the intensity level (${
      exerciseData.intensity || "Moderate"
    }), duration, and user's physical characteristics in your calculation.`;

    const data = await callGeminiGenerateContent([{ text: prompt }]);
    const text = extractTextFromGeminiResponse(data);

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini");
    }

    const parsedResult = JSON.parse(jsonMatch[0]);

    return {
      title:
        parsedResult.title ||
        `${exerciseData.type} (${exerciseData.intensity || "Moderate"})`,
      caloriesBurned: parsedResult.caloriesBurned || 0,
      description: parsedResult.description || exerciseData.description,
    };
  } catch (error) {
    console.error("Exercise analysis error:", error);
    return {
      title: `${exerciseData.type} (${exerciseData.intensity || "Moderate"})`,
      caloriesBurned: 0,
      description: exerciseData.description,
    };
  }
};

/**
 * Analyzes weight trends using Gemini AI
 * @param weightData - Array of weight entries sorted by date
 * @param goalWeight - User's goal weight
 * @param weeklyGoal - User's weekly goal (lose, maintain, gain)
 * @returns Analysis of weight trends and personalized feedback
 */
export const analyzeWeightTrends = async (
  weightData: { weight: number; date: Date }[],
  goalWeight: number,
  weeklyGoal: string
): Promise<WeightTrendAnalysis> => {
  try {
    if (weightData.length < 2) {
      return {
        trend: "maintaining",
        averageWeeklyChange: 0,
        feedback:
          "Not enough data to analyze trends. Keep logging your weight regularly.",
        recommendedActions: ["Continue logging your weight daily or weekly"],
      };
    }

    if (!getGeminiApiKey()) {
      throw new Error("Gemini API key is not configured");
    }

    // Format weight data for the prompt
    const formattedWeightData = weightData.map((entry) => ({
      weight: entry.weight,
      date: entry.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
    }));

    // Create a detailed prompt with all user stats
    const prompt = `
    Analyze the following weight tracking data and provide insights and recommendations.
    Weight data (ordered from oldest to newest):
    ${JSON.stringify(formattedWeightData)}
    
    Goal weight: ${goalWeight} kg
    Weekly goal: ${weeklyGoal} (lose, maintain, or gain weight)

    Return a valid JSON object with the following fields:
    - trend: Either "losing", "gaining", or "maintaining" based on the overall trend
    - averageWeeklyChange: Average weight change per week in kg (positive for gain, negative for loss)
    - feedback: A personalized message about their progress
    - recommendedActions: An array of 2-3 specific actions they could take based on their progress and goal

    Make sure your analysis is helpful, accurate, and motivational.
    `;

    console.log("Requesting weight trend analysis from Gemini API...");

    const data = await callGeminiGenerateContent([{ text: prompt.trim() }]);
    console.log("Received weight trend analysis from Gemini API");

    const textContent = extractTextFromGeminiResponse(data);
    console.log("Raw response:", textContent);

    // Extract the JSON portion from the text response
    const jsonMatch =
      textContent.match(/```json\n([\s\S]*?)\n```/) ||
      textContent.match(/```([\s\S]*?)```/) ||
      textContent.match(/\{[\s\S]*\}/);

    let parsedResult: WeightTrendAnalysis;

    if (jsonMatch) {
      try {
        // Clean up the JSON string and parse it
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log("Extracted JSON:", jsonStr);
        parsedResult = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Error parsing JSON from Gemini response:", parseError);
        // Fallback to default values
        parsedResult = createDefaultWeightAnalysis();
      }
    } else {
      console.warn("Could not extract JSON from Gemini response");
      parsedResult = createDefaultWeightAnalysis();
    }

    return parsedResult;
  } catch (error) {
    console.error("Weight trend analysis error:", error);
    return createDefaultWeightAnalysis();
  }
};

/**
 * Creates a default weight trend analysis
 */
const createDefaultWeightAnalysis = (): WeightTrendAnalysis => {
  return {
    trend: "maintaining",
    averageWeeklyChange: 0,
    feedback:
      "We couldn't analyze your weight trends at this time. Keep logging your weight regularly.",
    recommendedActions: [
      "Continue logging your weight daily or weekly",
      "Stay consistent with your nutrition plan",
      "Make sure to track all your meals and exercises",
    ],
  };
};
