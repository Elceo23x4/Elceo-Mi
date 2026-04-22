import { floorIsoToScheduleSlot, getNextSlotStart, getSlotEnd } from '../scheduler/frequency';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runSchedulerFrequencyTests(): void {
  assert(floorIsoToScheduleSlot('2026-04-22T10:07:19.000Z', 'five_minutes') === '2026-04-22T10:05:00.000Z', 'five_minutes floor should snap to lower 5-min boundary');
  assert(floorIsoToScheduleSlot('2026-04-22T10:14:59.000Z', 'fifteen_minutes') === '2026-04-22T10:00:00.000Z', 'fifteen_minutes floor should snap to lower 15-min boundary');
  assert(floorIsoToScheduleSlot('2026-04-22T10:59:59.000Z', 'hourly') === '2026-04-22T10:00:00.000Z', 'hourly floor should clear minute/seconds');
  assert(floorIsoToScheduleSlot('2026-04-22T11:17:00.000Z', 'four_hourly') === '2026-04-22T08:00:00.000Z', 'four_hourly floor should snap to 0/4/8/12/16/20 hour boundaries');
  assert(floorIsoToScheduleSlot('2026-04-22T17:33:00.000Z', 'daily') === '2026-04-22T00:00:00.000Z', 'daily floor should snap to UTC day start');

  assert(getNextSlotStart('2026-04-22T10:07:00.000Z', 'five_minutes') === '2026-04-22T10:10:00.000Z', 'next slot should advance by schedule duration');
  assert(getSlotEnd('2026-04-22T10:00:00.000Z', 'hourly') === '2026-04-22T11:00:00.000Z', 'slot end should be slot start plus frequency duration');
}
