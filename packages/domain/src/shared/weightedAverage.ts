export type WeightedInput = { value: number; weight: number };

export function weightedAverage(inputs: WeightedInput[]): number {
  const totalWeight = inputs.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  return inputs.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}
