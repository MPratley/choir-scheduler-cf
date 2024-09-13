import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { generateICalFeed } from "~/utils/ical";
import { fetchGoogleApiData } from "~/utils/googleApi";

// this is a route that dumps an ical feed as text for debugging
export async function loader({
  params,
  context,
}: LoaderFunctionArgs) {
  const name = params.name;

  if (!name) {
    throw new Response("Name is required", { status: 400 });
  }

  const data = await fetchGoogleApiData(context, name);

  const icalContent = generateICalFeed(data, name);

  // Set cache control headers
  const headers = new Headers({
    "Content-Type": "text/text; charset=utf-8",
  });


  return new Response(icalContent, { headers });
}