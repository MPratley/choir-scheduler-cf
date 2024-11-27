import {
  useSearchParams,
  useLoaderData,
  Await,
  useNavigation,
  Form,
  useAsyncError,
} from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { fetchData, getEventsForPerson } from "../utils/googleApi.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";

interface DateResponse {
  date: string;
  rehearsalTime: string;
  serviceTime: string;
  location: string;
  status: string;
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  console.log("searching name: ", name);

  let icalFeedUrl = null;
  let googleCalendarUrl = null;
  if (name) {
    icalFeedUrl = `webcal://${url.host}/icalfeed/${encodeURIComponent(name)}`;
    googleCalendarUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(
      `http://${url.host}/icalfeed/${encodeURIComponent(name)}`
    )}`;
  }

  if (!name) {
    return { dates: null, name: null, icalFeedUrl, googleCalendarUrl };
  }

  const dates = fetchData(context).then((data) =>
    getEventsForPerson(data, name)
  );

  return {
    dates,
    name,
    icalFeedUrl,
    googleCalendarUrl,
  };
}

export default function Index() {
  const { dates, icalFeedUrl, googleCalendarUrl } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");

  const searching =
    navigation.location &&
    new URLSearchParams(navigation.location.search).has("name");

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Check Availability</h1>
      <Form role="search" className="mb-4 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] flex gap-2">
          <Input
            className="max-w-xs"
            id="nameInput"
            type="text"
            name="name"
            placeholder="Enter surname"
            defaultValue={name || ""}
          />
          <Button type="submit">Search</Button>
        </div>
      </Form>

      {searching ? (
        <p>Loading calendar events...</p>
      ) : (
        <Await
          resolve={dates}
          errorElement={<ErrorMessage />}
        >
          {(resolvedDates) => (
            <CalendarEvents
              resolvedDates={resolvedDates}
              icalFeedUrl={icalFeedUrl}
              googleCalendarUrl={googleCalendarUrl}
            />
          )}
        </Await>
      )}
    </div>
  );
}

function ErrorMessage() {
  const error = useAsyncError() as Error;
  return <p>{error.message}</p>;
}

function CalendarEvents({
  resolvedDates,
  icalFeedUrl,
  googleCalendarUrl,
}: {
  resolvedDates: DateResponse[] | null;
  icalFeedUrl: string | null;
  googleCalendarUrl: string | null;
}) {
  const futureDates =
    resolvedDates?.filter((item) => new Date(item.date) >= subDays(new Date(), 1)) || [];

  if (resolvedDates && futureDates.length === 0) {
    return <p className="mt-4">No data available for this surname.</p>;
  }

  return (
    <>
      {futureDates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Availability:</h2>
          {icalFeedUrl && googleCalendarUrl ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="mb-4">
                  Add to your calendar app 📆
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Add to your calendar app 📆
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will add your choir sign-ups to the calendar app on
                    your phone or laptop. <br />
                    <br /> It&apos;ll update itself each time changes are made
                    by you or Anthony on the google sheet, so you only need to
                    do this once!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <div className="flex flex-col flex-grow space-y-4 mt-4">
                  <AlertDialogCancel>
                    Ah, I&apos;ve already done this
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <a href={icalFeedUrl} target="_blank" rel="noreferrer">Add to Apple Calendar 📆</a>
                  </AlertDialogAction>
                  <AlertDialogAction asChild>
                    <a href={googleCalendarUrl} target="_blank" rel="noreferrer">Add to Google Calendar 📆</a>
                  </AlertDialogAction>
                  </div>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          <div className="flex flex-col items-center space-y-4 mt-4">
            {futureDates.map((item) => (
              <div key={item.date} className="w-full max-w-md">
                <EventCard item={item} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function EventCard({ item }: { item: DateResponse }) {
  const date = new Date(item.date);
  const formattedDate = formatInTimeZone(date, "Europe/London", "EEEE, do MMM");
  const status = item.status.toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formattedDate}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {item.location && <p className="text-sm">📍 {item.location}</p>}
          <p className="text-sm">🎵 Rehearsal: {item.rehearsalTime}</p>
          <p className="text-sm">
            🔔{" "}
            {item.serviceTime ? `Service: ${item.serviceTime}` : "No Service"}
          </p>
          <div className="pt-2">
            <Badge
              variant={
                status === "Y"
                  ? "success"
                  : status === "N"
                  ? "danger"
                  : "warning"
              }
            >
              {status === "Y"
                ? "Going"
                : status === "N"
                ? "Not Going"
                : status === "M"
                ? "Maybe"
                : "RSVP"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
