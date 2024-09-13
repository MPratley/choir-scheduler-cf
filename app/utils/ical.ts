import ical, { ICalEventData } from "ical-generator";
import { parseISO } from "date-fns/parseISO";

interface EventData {
  date: string;
  rehearsalTime: string;
  serviceTime: string;
  location: string;
  status: string;
}

function parseTime(timeString: string, date: Date): Date | null {
  if (timeString.toLowerCase() === "pm tbc") return null;

  const match = timeString.match(/(\d{1,2})[:.](\d{2})\s*(pm?)?/i);
  if (!match) return null;

  const [, hours, minutes, period] = match;
  let parsedHours = parseInt(hours);

  if (period && period[0].toLowerCase() === "p" && parsedHours !== 12) {
    parsedHours += 12;
  }

  const result = new Date(date);
  result.setHours(parsedHours, parseInt(minutes), 0, 0);

  // if (date.toISOString() === TEMP_TEST_DATE_STR) {
  //   console.dir({ timeString, date, result, parsedHours, hours, minutes, period }, { depth: null });
  // }

  return result;
}

export function generateICalFeed(events: EventData[], name: string) {
  const calendar = ical({ name: `Symbel Choir - ${name}` });

  events.forEach((event) => {
    const [startTimeStr, endTimeStr] = event.rehearsalTime.split(/\s*[–-]\s*/);

    const eventDate = parseISO(event.date);
    const startTime = parseTime(startTimeStr, eventDate);

    if (!startTime) return; // Skip events with unparseable start times

    let endTime: Date | null = null;

    if (event.serviceTime && event.serviceTime !== "-") {
      // Use service time + 1 hour for end time
      const serviceTime = parseTime(event.serviceTime, eventDate);
      if (serviceTime) {
        endTime = new Date(serviceTime);
        endTime.setHours(endTime.getHours() + 1);
      }
    } else if (endTimeStr) {
      // Use end time from rehearsal time string
      endTime = parseTime(endTimeStr, eventDate);
    }

    if (!endTime) {
      // Default to 2 hours after start time
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);
    }

    const statusMap: { [key: string]: string } = {
      Y: "Going",
      N: "Not Going",
      M: "Maybe",
      "": "?",
    };

    const eventData: ICalEventData = {
      timezone: "Europe/London",
      start: startTime,
      end: endTime,
      summary: `Symbel Choir - ${statusMap[event.status]} - 📍 ${event.location}`,
      location: event.location,
      description: `Rehearsal: ${event.rehearsalTime}\nService: ${event.serviceTime || "N/A"}`,
    };

    calendar.createEvent(eventData);
  });

  return calendar.toString();
}
