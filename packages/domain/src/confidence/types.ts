<<<<<<< HEAD
export type ConfidenceInputs = {
  sourceConfidence: number;
  eventStrength: number;
  modelAgreement: number;
  priceConfirmation: number;
  historicalPattern?: number;
  contradictionPenalty: number;
};

export type ConfidenceOutput = {
  total: number;
  anatomy: {
    sourceConfidence: number;
    eventStrength: number;
    modelAgreement: number;
    priceConfirmation: number;
    historicalPattern: number;
    contradictionPenalty: number;
  };
};
=======
export {};
>>>>>>> origin/main
