import type { AppState, Exam, SubjectConfig } from '../types';
import { topicsFor } from '../data/taxonomy';
import { filterExams } from './exams';
import { computeWeights, topicPriority, topicStats, type TopicStat } from './weights';
import { errorBoost, observations, topicMastery } from './mastery';

export interface TopicInfo {
  topicId: string;
  stat: TopicStat;
  weight: number; // wyliczona z arkuszy
  manual: number | undefined;
  mastery: number | null;
  boost: number;
  priority: number;
}

export interface SubjectPriorities {
  subject: SubjectConfig;
  topics: TopicInfo[];
  examsUsed: number;
  oldExamsUsed: number;
}

export function manualKey(subjectId: string, topicId: string): string {
  return `${subjectId}:${topicId}`;
}

export function subjectPriorities(state: AppState, exams: Exam[], subject: SubjectConfig, date: string): SubjectPriorities {
  const s = state.settings;
  const topics = topicsFor(subject.family, subject.level);
  const { current, old } = filterExams(exams, {
    family: subject.family,
    level: subject.level,
    yearFrom: s.yearFrom,
    yearTo: s.yearTo,
    includeOldFormula: s.includeOldFormula,
    excluded: s.excludedExams,
  });
  // Wagi liczę tylko z formuły 2023. Poprzednia formuła jest pokazywana osobno w analizie.
  const stats = topicStats(current, topics);
  const weights = computeWeights(stats, s.weightMode);
  const infos: TopicInfo[] = stats.map((stat) => {
    const obs = observations(subject.id, stat.topicId, state.bank, state.mocks, exams, state.diagnoses);
    const mastery = topicMastery(obs);
    const boost = errorBoost(state.errors, subject.id, stat.topicId, date);
    const manual = s.manualWeights[manualKey(subject.id, stat.topicId)];
    return {
      topicId: stat.topicId,
      stat,
      weight: weights[stat.topicId],
      manual,
      mastery,
      boost,
      priority: topicPriority(weights[stat.topicId], mastery, boost, manual),
    };
  });
  return { subject, topics: infos, examsUsed: current.length, oldExamsUsed: old.length };
}

export function allPriorities(state: AppState, exams: Exam[], date: string): Record<string, SubjectPriorities> {
  const out: Record<string, SubjectPriorities> = {};
  for (const sub of state.settings.subjects) if (sub.enabled) out[sub.id] = subjectPriorities(state, exams, sub, date);
  return out;
}
