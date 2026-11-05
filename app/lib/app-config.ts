const rawAppName = "svg-motion";
const rawAppTitle = "SVG MOTION";

const APP_NAME_PLACEHOLDER = "{" + "{APP_NAME}}";
const APP_TITLE_PLACEHOLDER = "{" + "{APP_TITLE}}";

export const APP_NAME =
  rawAppName === APP_NAME_PLACEHOLDER ? "svg-motion" : rawAppName;

export const APP_TITLE =
  rawAppTitle === APP_TITLE_PLACEHOLDER ? "SVG MOTION" : rawAppTitle;

/** Shown in the document head and in metadata for routes without their own. */
export const APP_DESCRIPTION =
  "A professional SVG animation studio. Draw or import vector art, key it with bezier easing, and export optimized SVG, CSS, or JS.";
