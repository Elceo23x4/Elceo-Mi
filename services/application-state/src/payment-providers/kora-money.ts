export type KoraMoneyCapability = {
  minorUnitExponent: number;
  providerAmountEncoding: 'decimal_major_json_number';
};

function validateCapability(capability: KoraMoneyCapability): number {
  const exponent = capability.minorUnitExponent;
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 18 || capability.providerAmountEncoding !== 'decimal_major_json_number') {
    throw new Error('korapay_money_capability_unverified');
  }
  return exponent;
}

function exactInteger(value: string): bigint {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) throw new Error('invalid_exact_money');
  return BigInt(value);
}

export function encodeKoraProviderAmount(amountMinor: string, capability: KoraMoneyCapability): string {
  const minor = exactInteger(amountMinor);
  const places = validateCapability(capability);
  if (places === 0) return minor.toString();
  const scale = 10n ** BigInt(places);
  return `${minor / scale}.${(minor % scale).toString().padStart(places, '0')}`;
}

export function decodeKoraProviderAmount(amount: string, capability: KoraMoneyCapability): string {
  const places = validateCapability(capability);
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(amount)) throw new Error('invalid_korapay_provider_amount');
  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > places) throw new Error('korapay_provider_amount_precision_mismatch');
  return (BigInt(whole!) * 10n ** BigInt(places) + BigInt((fraction + '0'.repeat(places)).slice(0, places) || '0')).toString();
}

/** Serializes an already validated exact decimal as a JSON numeric token, never through Number. */
export function serializeKoraJson(body: Record<string, unknown>, amountDecimal: string): string {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(amountDecimal)) throw new Error('invalid_korapay_provider_amount');
  const marker = '"__ELCEO_EXACT_KORA_AMOUNT__"';
  const serialized = JSON.stringify({ ...body, amount: '__ELCEO_EXACT_KORA_AMOUNT__' });
  if (!serialized.includes(marker)) throw new Error('korapay_amount_serialization_failed');
  return serialized.replace(marker, amountDecimal);
}
