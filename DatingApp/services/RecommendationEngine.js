// DatingApp/services/RecommendationEngine.js

// [추가] 사용자 취향 분석 기능을 사용하기 위해 UserTasteAnalysis.js에서 analyzeUserTaste 함수 불러오기
import { analyzeUserTaste } from './UserTasteAnalysis';

/**
 * calculateRecommendationScore
 * 현재 사용자와 후보 사용자 간의 유사도를 점수로 반환합니다.
 * 점수가 높을수록 추천도가 높다고 간주합니다.
 *
 * @param {object} currentUser - 현재 로그인한 사용자 데이터 (예: { age, location, preferredGender, ... })
 * @param {object} candidate - 추천 대상 사용자 데이터 (예: { age, location, gender, ... })
 * @returns {Promise<number>} 추천 점수 (비동기 함수로 변경됨)
 */
export const calculateRecommendationScore = async (currentUser, candidate) => {
  let score = 0;
  
  // 나이 차이: 차이가 작을수록 높은 점수 (최대 100점)
  const ageDifference = Math.abs(currentUser.age - candidate.age);
  score += Math.max(0, 100 - ageDifference);

  // 지역 일치: 일치하면 +50점
  if (currentUser.location === candidate.location) {
    score += 50;
  }

  // 성별 선호도: 만약 currentUser.preferredGender가 '상관없음'이면 무조건 +30, 아니면 후보의 성별이 선호하는 성별이면 +30
  if (currentUser.preferredGender === '상관없음' || candidate.gender === currentUser.preferredGender) {
    score += 30;
  }

  // [추가] 사용자 취향 분석 반영
  // 두 사용자의 취향 벡터를 분석하여, 코사인 유사도로 점수를 산출
  // analyzeUserTaste는 비동기 함수이므로 await를 사용합니다.
  const userTaste = await analyzeUserTaste(currentUser);      // 현재 사용자 취향 벡터
  const candidateTaste = await analyzeUserTaste(candidate);     // 후보 사용자 취향 벡터

  // 코사인 유사도를 계산하는 함수 (두 벡터가 유사할수록 1에 가까움)
  const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
  };

  const tasteSimilarity = cosineSimilarity(userTaste, candidateTaste);
  // tasteSimilarity 값은 0~1 사이입니다. 이를 0~50 점 범위로 변환하여 점수에 추가합니다.
  score += tasteSimilarity * 50;

  return score;
};
