import { useState } from 'react';
import { fetchMealAiAnswers } from '../../api/mealApi';
import type { MealAiAnswer } from '../../types/meal';
import './MealAiPanel.css';

// 질문 타입 → 한글 라벨 매핑
const QUESTION_LABEL: Record<MealAiAnswer['questionType'], string> = {
  BEST_CAMPUS: '🏫 오늘의 본캠 중식 중 최고 메뉴의 식당',
  BEST_DORM:   '🏠 오늘의 광주기숙사 최고 식사타입',
};

export default function MealAiPanel() {
  const [isOpen, setIsOpen]     = useState(false);
  const [answers, setAnswers]   = useState<MealAiAnswer[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpen(true);

    // 이미 데이터 있으면 재호출 안 함 (당일 캐시 효과)
    if (answers.length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchMealAiAnswers();
      setAnswers(data);
    } catch (e) {
      setError('AI 추천을 불러오지 못했어요 😢');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* ─── FAB 버튼 ─── */}
      <button className="meal-ai-fab" onClick={handleOpen} aria-label="AI 식단 추천 열기">
        🍽️ AI 추천
      </button>

      {/* ─── 딤드 배경 ─── */}
      {isOpen && (
        <div className="meal-ai-backdrop" onClick={handleClose} aria-hidden="true" />
      )}

      {/* ─── 슬라이드업 패널 ─── */}
      <div className={`meal-ai-panel ${isOpen ? 'open' : ''}`} role="dialog" aria-label="AI 식단 추천 패널">

        {/* 패널 헤더 */}
        <div className="meal-ai-panel__header">
          <span className="meal-ai-panel__title">✨ AI 오늘의 추천</span>
          <button className="meal-ai-panel__close" onClick={handleClose} aria-label="닫기">✕</button>
        </div>

        {/* 패널 바디 */}
        <div className="meal-ai-panel__body">
          {loading && (
            <p className="meal-ai-status">AI가 오늘의 메뉴를 분석 중이에요... 🤔</p>
          )}

          {error && (
            <p className="meal-ai-status meal-ai-status--error">{error}</p>
          )}

          {!loading && !error && answers.length === 0 && (
            <p className="meal-ai-status">오늘의 추천 정보가 없어요 😥</p>
          )}

          {!loading && !error && answers.map((item) => (
            <div className="meal-ai-card" key={item.id}>
              <span className="meal-ai-card__label">
                {QUESTION_LABEL[item.questionType]}
              </span>
              {/* title 속성 → 40자 초과 시 tooltip으로 전체 내용 표시 */}
              <p
                className="meal-ai-card__answer"
                title={item.answer}
              >
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        {/* 생성 시각 표시 (첫 번째 항목 기준) */}
        {answers.length > 0 && (
          <p className="meal-ai-panel__footer">
            🕐 {new Date(answers[0].generatedAt).toLocaleDateString('ko-KR')} 기준
          </p>
        )}
      </div>
    </>
  );
}
