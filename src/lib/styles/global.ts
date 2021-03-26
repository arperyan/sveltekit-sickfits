import { globalCSS } from "../../../stitches.config";

export const globalStyles: any = globalCSS({
    "@font-face": {
        fontFamily: "radnika_next",
        src: "url('/static/radnikanext-medium-webfont.woff2') format('woff2')",
        fontWeight: "normal",
        fontStyle: "normal",
    },
    html: {
        fontFamily: `'radnika_next',--apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
        fontSizes: "$fontSizes$1",
        boxSizing: "border-box",
    },

    "*, *:before, *:after": {
        boxSizing: "inherit",
    },

    body: {
        p: "0",
        m: "0",
        fontSize: "$fontSizes$2",
        lineHeight: "2",
    },

    a: {
        textDecoration: "none",
        color: "$colors$black",
    },

    "a:hover": {
        textDecoration: "underline",
    },

    button: {
        fontFamily: `'radnika_next', --apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
    },
});
