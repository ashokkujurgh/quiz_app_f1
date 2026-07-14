import { get } from '../apiClient';
import type { Topic, SubTopic } from '../../types';

export const fetchTopics = () => get<{ success: boolean; topics: Topic[] }>('/api/topics');

export const fetchSubTopics = (topicId: string) =>
  get<{ success: boolean; subtopics: SubTopic[] }>(`/api/topics/${topicId}/subtopics`);
