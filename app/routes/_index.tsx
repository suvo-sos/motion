import { appPath } from "@agent-native/core/client/api-path";
import { redirect } from "react-router";

/** The app opens straight into the project launcher; there is no login wall. */
export function loader() {
  return redirect(appPath("/home"));
}

export default function Index() {
  return null;
}
