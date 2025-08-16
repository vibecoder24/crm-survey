import { surveySchema } from '@/data/schema';

export type AnswerRecord = {
  [questionId: string]: unknown;
};

export type ResponseRecord = {
  id: string;
  name: string;
  email: string;
  company?: string;
  answers: AnswerRecord;
  ratingGroup?: { [itemId: string]: number };
  aiGists?: { [questionId: string]: string };
  createdAt: string;
  meta?: { channel?: 'public' | 'token'; tokenId?: string };
};

const responses: ResponseRecord[] = [];

export function addResponse(resp: Omit<ResponseRecord, 'id' | 'createdAt'>): ResponseRecord {
  const newResp: ResponseRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...resp,
  };
  responses.push(newResp);
  return newResp;
}

export function listResponses(): ResponseRecord[] {
  return responses.slice().reverse();
}

export function getSchema() {
  return surveySchema;
}


