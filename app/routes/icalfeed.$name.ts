import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { generateICalFeed } from "~/utils/ical";
import { fetchGoogleApiData } from "~/utils/googleApi.server";

// this is a route that returns an ical feed that users can subscribe to
export async function loader({ params, context }: LoaderFunctionArgs) {
  const name = params.name;

  if (!name) {
    throw new Response("Name is required", { status: 400 });
  }

  const data = await fetchGoogleApiData(context, name);

  const icalContent = generateICalFeed(data, name);

  // Set cache control headers
  const headers = new Headers({
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, max-age=1800", // 30 minutes
  });

  // Add Last-Modified header if available
  if (data.lastModified) {
    headers.set("Last-Modified", new Date(data.lastModified).toUTCString());
  }

  return new Response(icalContent, { headers });
}
