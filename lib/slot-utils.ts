export type SlotPricingSettings = {
  openTime: string;
  closeTime: string;
  defaultPrice: number;
  primeStartTime: string;
  primeEndTime: string;
  primePrice: number;
  slotIntervalMinutes: number;
};

export type SlotWindow = {
  startTime: string;
  endTime: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseTimeParts(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  return {
    hour: Number(hourRaw ?? 0),
    minute: Number(minuteRaw ?? 0),
  };
}

export function getSlotWindows(settings: Pick<SlotPricingSettings, "openTime" | "closeTime" | "slotIntervalMinutes">) {
  const { hour: openHour, minute: openMinute } = parseTimeParts(settings.openTime);
  const { hour: closeHourRaw, minute: closeMinute } = parseTimeParts(settings.closeTime);
  const closeHour = settings.closeTime === "24:00" ? 24 : closeHourRaw;
  const openTotalMinutes = openHour * 60 + openMinute;
  const closeTotalMinutes = closeHour * 60 + closeMinute;

  const windows: SlotWindow[] = [];

  for (
    let currentMinutes = openTotalMinutes;
    currentMinutes < closeTotalMinutes;
    currentMinutes += settings.slotIntervalMinutes
  ) {
    const nextMinutes = currentMinutes + settings.slotIntervalMinutes;
    const startHour = Math.floor(currentMinutes / 60);
    const startMinute = currentMinutes % 60;
    const endHour = Math.floor(nextMinutes / 60);
    const endMinute = nextMinutes % 60;

    windows.push({
      startTime: `${pad(startHour)}:${pad(startMinute)}`,
      endTime: `${pad(endHour % 24)}:${pad(endMinute)}`,
    });
  }

  return windows;
}

export function getSlotPrice(
  startTime: string,
  settings: Pick<SlotPricingSettings, "defaultPrice" | "primeStartTime" | "primeEndTime" | "primePrice">,
) {
  return startTime >= settings.primeStartTime && startTime < settings.primeEndTime
    ? settings.primePrice
    : settings.defaultPrice;
}

export function getSlotIsoRange(dayKey: string, startTime: string, endTime: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const { hour: startHour, minute: startMinute } = parseTimeParts(startTime);
  const { hour: endHourRaw, minute: endMinute } = parseTimeParts(endTime);
  const rollsToNextDay = endTime <= startTime;
  const endHour = rollsToNextDay ? endHourRaw + 24 : endHourRaw;

  const startUtc = Date.UTC(year, month - 1, day, startHour - 7, startMinute);
  const endUtc = Date.UTC(year, month - 1, day, endHour - 7, endMinute);

  return {
    startAt: new Date(startUtc).toISOString(),
    endAt: new Date(endUtc).toISOString(),
  };
}
