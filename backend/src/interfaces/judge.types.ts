export interface JudgeResponse {
  isValid: boolean;
  isBlocked?: boolean;
  feedbackSQL: string;
  feedbackViz: string;
}