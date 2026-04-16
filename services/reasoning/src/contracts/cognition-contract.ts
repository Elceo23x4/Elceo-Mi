import type { AssetCognitionState } from '@elceo/types';

export type CognitionPipelineOutput = {
  assetCode: string;
  intraday: AssetCognitionState;
  swing: AssetCognitionState;
};
