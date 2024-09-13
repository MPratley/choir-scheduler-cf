import ical, { ICalEventData } from "ical-generator";
import { add } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

interface EventData {
  date: string;
  rehearsalTime: string;
  serviceTime: string;
  location: string;
  status: string;
}

function parseTime(timeString: string, zonedDate: string): Date | null {
  if (timeString.toLowerCase().includes("tbc")) return null;

  const match = timeString.match(/(\d{1,2})[:.](\d{2})\s*(pm?)?/i);
  if (!match) return null;

  const [, hours, minutes, period] = match;
  let parsedHours = parseInt(hours);

  console.log({ period, parsedHours });

  if (!(period && period[0].toLowerCase() === "a") || (!period && parsedHours < 9)) {
    parsedHours += 12;
  }

  let result = fromZonedTime(zonedDate, "Europe/London");
  result = add(result, { hours: parsedHours, minutes: parseInt(minutes) });

  return result;
}

export function generateICalFeed(events: EventData[], name: string) {
  const calendar = ical({ name: `Symbel Choir - ${name}` });

  events.forEach((event) => {
    const [startTimeStr, endTimeStr] = event.rehearsalTime.split(/\s*[–-]\s*/);

    const eventDate = event.date; //formatInTimeZone(event.date, "Europe/London", "yyyy-MM-dd");
    const startTime = parseTime(startTimeStr, eventDate) || add(new Date(eventDate), { hours: 12 });

    let endTime: Date | null = null;

    if (event.serviceTime && event.serviceTime !== "-") {
      // Use service time + 1 hour for end time
      const serviceTime = parseTime(event.serviceTime, eventDate);
      if (serviceTime) {
        endTime = add(new Date(serviceTime), { hours: 1 });
      }
    } else if (endTimeStr) {
      // Use end time from rehearsal time string
      endTime = parseTime(endTimeStr, eventDate);
    }

    if (!endTime) {
      // Default to 2 hours after start time
      endTime = new Date(startTime);
      endTime = add(endTime, { hours: 2 });
    }

    const mappedStatus = ((status: string) => {
      if (status === "Y") return "Going";
      if (status === "N") return "Not Going";
      if (status === "M") return "Maybe";
      return undefined;
    })(event.status);

    const summaryString = `Symbel Choir${mappedStatus ? " - " + mappedStatus : ""} - 📍 ${event.location}`;
    const descriptionString = `Rehearsal: ${event.rehearsalTime}\nService: ${event.serviceTime || "N/A"}\nStatus: ${mappedStatus ? mappedStatus : "You've not RSVPed yet"}`;

    const eventData: ICalEventData = {
      timezone: "Europe/London",
      start: startTime,
      end: endTime,
      summary: summaryString,
      location: event.location,
      description: descriptionString,
    };

    calendar.createEvent(eventData);
  });

  return calendar.toString();
}
