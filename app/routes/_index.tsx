import {
  useSearchParams,
  useLoaderData,
  Await,
  useNavigation,
  Form,
} from "@remix-run/react";
import { json, LoaderFunctionArgs, defer } from "@remix-run/cloudflare";
import { fetchGoogleApiData } from "../utils/googleApi.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
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

interface DateResponse {
  date: string;
  rehearsalTime: string;
  serviceTime: string;
  location: string;
  status: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  console.log("searching name: ", name);

  let icalFeedUrl = null;
  if (name) {
    const baseUrl = `webcal://${url.host}`;
    icalFeedUrl = `${baseUrl}/icalfeed/${encodeURIComponent(name)}`;
  }

  if (!name) {
    return json({ dates: null, name: null, icalFeedUrl });
  }

  const datesPromise = fetchGoogleApiData(context, name);

  return defer({ dates: datesPromise, name, icalFeedUrl });
}

export default function Index() {
  const { dates, icalFeedUrl } = useLoaderData<typeof loader>();
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
          errorElement={<p>Error loading calendar events. Please try again.</p>}
        >
          {(resolvedDates) => (
            <CalendarEvents
              resolvedDates={resolvedDates}
              icalFeedUrl={icalFeedUrl}
            />
          )}
        </Await>
      )}
    </div>
  );
}

function CalendarEvents({
  resolvedDates,
  icalFeedUrl,
}: {
  resolvedDates: DateResponse[] | null;
  icalFeedUrl: string | null;
}) {
  const futureDates =
    resolvedDates?.filter((item) => new Date(item.date) > new Date()) || [];

  if (resolvedDates && futureDates.length === 0) {
    return <p className="mt-4">No data available for this surname.</p>;
  }

  return (
    <>
      {futureDates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Availability:</h2>
          {icalFeedUrl && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="mb-4">Add to your calendar app 📆</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Add to your calendar app 📆
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will add your choir sign-ups to the calendar app on
                    your phone or laptop. <br /><br /> It&apos;ll update itself each time
                    changes are made by you or Anthony on the google sheet, so
                    you only need to do this once!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    Ah, I&apos;ve already done this
                  </AlertDialogCancel>
                  <AlertDialogAction>
                    <a href={icalFeedUrl}>Sounds good! 📆</a>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
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
  const formattedDate = format(date, "EEEE, do MMM");
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
                : "Unsure"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
