import HomePage from "@/components/home/HomePage";
import { APP_TITLE } from "@/lib/app-config";

const SEO_TITLE = `${APP_TITLE} — agent-native SVG motion studio`;
const SEO_DESCRIPTION =
  "Describe an animation and the agent draws the SVG and writes the keyframes. Shape it on the timeline, then export a standalone animated SVG.";

export function meta() {
  return [
    { title: SEO_TITLE },
    {
      name: "description",
      content: SEO_DESCRIPTION,
    },
    { property: "og:title", content: SEO_TITLE },
    { property: "og:description", content: SEO_DESCRIPTION },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: SEO_TITLE },
    { name: "twitter:description", content: SEO_DESCRIPTION },
  ];
}

export default function HomeRoute() {
  return <HomePage />;
}
