import { useEffect, useRef, Suspense } from "react";
import {
  useSearchParams,
  useLoaderData,
  Await,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import { json, LoaderFunctionArgs, defer } from "@remix-run/cloudflare";
import { fetchGoogleApiData } from "../utils/googleApi";

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
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");

  const searching =
    navigation.location &&
    new URLSearchParams(navigation.location.search).has("name");

  useEffect(() => {
    const input = document.getElementById("nameInput") as HTMLInputElement;
    if (input) {
      input.value = name || "";
    }
  }, [name]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = formData.get("name") as string;
    navigate(`?name=${newName}`, { replace: true });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Check Availability</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          id="nameInput"
          type="text"
          name="name"
          placeholder="Enter surname"
          className="border p-2 mr-2"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded mr-2"
        >
          Search
        </button>
        {icalFeedUrl && (
          <a
            href={icalFeedUrl}
            className="bg-green-500 text-white p-2 rounded inline-block"
          >
            Subscribe to this calendar
          </a>
        )}
      </form>

      {searching ? (
        <p>Loading calendar events...</p>
      ) : (
        <Suspense fallback={<p>Loading calendar events...</p>}>
          <Await
            resolve={dates}
            errorElement={
              <p>Error loading calendar events. Please try again.</p>
            }
          >
            {(resolvedDates) => (
              <CalendarEvents resolvedDates={resolvedDates} />
            )}
          </Await>
        </Suspense>
      )}
    </div>
  );
}

function CalendarEvents({
  resolvedDates,
}: {
  resolvedDates: DateResponse[] | null;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const futureDates =
    resolvedDates?.filter((item) => new Date(item.date) > new Date()) || [];

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (resolvedDates && futureDates.length === 0) {
    return <p className="mt-4">No data available for this surname.</p>;
  }

  return (
    <>
      {futureDates.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Availability:
          </h2>
          <div
            ref={carouselRef}
            className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {futureDates.map((item) => (
              <div
                key={item.date}
                className="flex-shrink-0 w-64 bg-white rounded-lg shadow-md p-4"
                style={{ scrollSnapAlign: "start" }}
              >
                <p className="font-semibold text-lg mb-2">
                  {new Date(item.date).toLocaleDateString()}
                </p>
                <p className="text-sm mb-1">Rehearsal: {item.rehearsalTime}</p>
                {item.serviceTime && (
                  <p className="text-sm mb-1">Service: {item.serviceTime}</p>
                )}
                {item.location && (
                  <p className="text-sm mb-1">Location: {item.location}</p>
                )}
                <p className="text-sm font-medium mt-2">
                  Status:{" "}
                  <span
                    className={`${
                      item.status === "Y"
                        ? "text-green-500"
                        : item.status === "N"
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                  >
                    {item.status === "Y"
                      ? "Going"
                      : item.status === "N"
                      ? "Not Going"
                      : "Unsure"}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => scrollCarousel("right")}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md z-10"
          >
            &#8594;
          </button>
        </div>
      ) : null}
    </>
  );
}
