import { AppLoadContext } from "@remix-run/cloudflare";

const CACHE_TTL = 10 * 60; // 10 minutes in seconds

// Data comes back from sheet.getDataRange().getValues()
// which is an array of arrays.
export async function fetchData(context: AppLoadContext): Promise<{
  sheet_2024: string[][],
  sheet_2025: string[][]
}> {
  const cacheKey = `google_api_sheet`;

  // Try to get data from cache
  const cachedData = await context.cloudflare.env.CHOIR_SCHEDULER_KV.get(
    cacheKey
  );
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // If not in cache, fetch from API
  const apiUrl = `https://script.google.com/macros/s/${context.cloudflare.env.GOOGLE_API_SCRIPT_ID}/exec?everything=true`;
  const response = await fetch(apiUrl);
  const data = await response.json() as { sheet_2024: string[][], sheet_2025: string[][] };

  await context.cloudflare.env.CHOIR_SCHEDULER_KV.put(
    cacheKey,
    JSON.stringify(data),
    {
      expirationTtl: CACHE_TTL,
    }
  );

  return data;
}

export type PersonalEvent = {
  eventIdx: number;
  location?: string;
  date: string;
  rehearsalTime?: string;
  serviceTime?: string;
  status: "Y" | "N" | "M" | "";
};

type Event = {
  eventIdx: number;
  location: string;
  date: string;
  rehearsalTime: string;
  serviceTime: string;
  singerStatuses: Record<string, "Y" | "N" | "M" | "">;
};

const event_cols_start_idx = 3;

export function getEventsForPerson(
  data: string[][],
  person: string
): PersonalEvent[] {
  console.log(data);

  // Find the row index for the given name
  const nameRowIndex = data.findIndex(
    (row) => row[2].toLowerCase() === person.toLowerCase()
  );

  if (nameRowIndex === -1) {
    throw new Error(`Surname not found: ${person}`);
  }

  const dates = data[0];
  const rehearsalTime = data[2];
  const serviceTime = data[3];
  const location = data[4];
  const availability = data[nameRowIndex];
  const result: PersonalEvent[] = [];

  // Start from col idx 3 to skip the first three columns
  for (let i = event_cols_start_idx; i < dates.length; i++) {
    result.push({
      eventIdx: i,
      date: dates[i],
      rehearsalTime: rehearsalTime[i],
      serviceTime: serviceTime[i],
      location: location[i],
      status: availability[i].toUpperCase() as "Y" | "N" | "M" | "",
    });
  }

  return result;
}

export function getEvents(data: string[][]): Event[] {
  // Find the row index for the given name
  const personScheduleMapping = data.map((row, idx) => {
    if (row[2]) {
      // a name is in the 3rd column
      return {
        name: row[2].toLowerCase(),
        rowIdx: idx,
      };
    }
    return null;
  });

  const dates = data[0];
  const rehearsalTime = data[2];
  const serviceTime = data[3];
  const location = data[4];
  const result: Event[] = [];

  // Start from col idx 3 to skip the first three columns
  for (let i = event_cols_start_idx; i < dates.length; i++) {
    result.push({
      eventIdx: i,
      date: dates[i],
      rehearsalTime: rehearsalTime[i],
      serviceTime: serviceTime[i],
      location: location[i],
      singerStatuses: personScheduleMapping.reduce((acc, personSchedule) => {
        if (personSchedule) {
          acc[personSchedule.name] = data[personSchedule.rowIdx][
            i
          ].toUpperCase() as "Y" | "N" | "M" | "";
        }
        return acc;
      }, {} as Record<string, "Y" | "N" | "M" | "">),
    });
  }

  return result;
}