export interface FeedbackData {
  q1: number | null; // 1-10
  q2: number | null; // 1-5
  q3: string[];      // Multiple choice
  q4: string;        // Text
  q5: number | null; // 1-5
  q6: string | null; // Radio
  q7: string[];      // Multiple choice
  q8: number | null; // 1-5
  q9: number | null; // 1-5
  q10: string;       // Text
  q11: string[];     // Multiple choice
  q12: number | null; // 1-5
  q13: string[];     // Multiple choice
  q14: string;       // Text (Required)
  q15: string | null; // Radio
  q16: number | null; // 0-10
  q17: string;       // Textarea
}

export const defaultFeedbackData: FeedbackData = {
  q1: null,
  q2: null,
  q3: [],
  q4: '',
  q5: null,
  q6: null,
  q7: [],
  q8: null,
  q9: null,
  q10: '',
  q11: [],
  q12: null,
  q13: [],
  q14: '',
  q15: null,
  q16: null,
  q17: '',
};
