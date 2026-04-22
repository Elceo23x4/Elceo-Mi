import { runRuntimeContractFormulaTests } from './runtime-contracts.test.js';
import { runSchemaValidationTests } from './schema-validation.test.js';

export function runReasoningTests(): void {
  runRuntimeContractFormulaTests();
  runSchemaValidationTests();
}
