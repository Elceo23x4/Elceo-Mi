export type IngestionScheduleFrequency = 'five_minutes' | 'fifteen_minutes' | 'hourly' | 'four_hourly' | 'daily';

const frequencyMinutes: Record<IngestionScheduleFrequency, number> = {
  five_minutes: 5,
  fifteen_minutes: 15,
  hourly: 60,
  four_hourly: 240,
  daily: 1440
};

export function getFrequencyMinutes(frequency: IngestionScheduleFrequency): number {
  return frequencyMinutes[frequency];
}

export function floorIsoToScheduleSlot(iso: string, frequency: IngestionScheduleFrequency): string {
  const date = new Date(iso);
  const floored = new Date(date.getTime());

  floored.setUTCSeconds(0, 0);

  if (frequency === 'five_minutes') {
    floored.setUTCMinutes(Math.floor(floored.getUTCMinutes() / 5) * 5);
    return floored.toISOString();
  }

  if (frequency === 'fifteen_minutes') {
    floored.setUTCMinutes(Math.floor(floored.getUTCMinutes() / 15) * 15);
    return floored.toISOString();
  }

  if (frequency === 'hourly') {
    floored.setUTCMinutes(0);
    return floored.toISOString();
  }

  if (frequency === 'four_hourly') {
    floored.setUTCMinutes(0);
    floored.setUTCHours(Math.floor(floored.getUTCHours() / 4) * 4);
    return floored.toISOString();
  }

  floored.setUTCMinutes(0);
  floored.setUTCHours(0);
  return floored.toISOString();
}

export function getNextSlotStart(iso: string, frequency: IngestionScheduleFrequency): string {
  const slotStart = new Date(floorIsoToScheduleSlot(iso, frequency));
  slotStart.setUTCMinutes(slotStart.getUTCMinutes() + getFrequencyMinutes(frequency));
  return slotStart.toISOString();
}

export function getSlotEnd(slotStartIso: string, frequency: IngestionScheduleFrequency): string {
  const slotStart = new Date(slotStartIso);
  slotStart.setUTCMinutes(slotStart.getUTCMinutes() + getFrequencyMinutes(frequency));
  return slotStart.toISOString();
}

export function compareFrequencyGranularity(left: IngestionScheduleFrequency, right: IngestionScheduleFrequency): number {
  return getFrequencyMinutes(left) - getFrequencyMinutes(right);
}
