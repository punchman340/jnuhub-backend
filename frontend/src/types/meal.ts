export interface MealAiAnswer {
  id: number;
  questionType: 'BEST_CAMPUS' | 'BEST_DORM';
  answer: string;
  generatedAt: string; // ISO 8601
}

export { };
