import type { EvidenceAssembly } from '@elceo/types';
import { evidenceToCognition } from './pipeline/evidence-to-cognition';
import type { CognitionPipelineOutput } from './contracts/cognition-contract';

export class ReasoningService {
  reasonAssembly(assembly: EvidenceAssembly): CognitionPipelineOutput {
    const result = evidenceToCognition(assembly);
    return {
      assetCode: assembly.assetCode,
      intraday: result.intraday,
      swing: result.swing
    };
  }
}
