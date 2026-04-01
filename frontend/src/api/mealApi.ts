import type { MealAiAnswer } from '../types/meal';
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export async function fetchMealAiAnswers(): Promise<MealAiAnswer[]> {
  const res = await fetch(`${BASE_URL}/api/meal/ai-answers`);
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  return res.json() as Promise<MealAiAnswer[]>;
}
