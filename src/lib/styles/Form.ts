import { css, keyframes } from "../../../stitches.config";

const loading = keyframes({
    from: {
        backgroundPosition: "0 0",
        /* rotate: 0, */
    },

    to: {
        backgroundPosition: "100% 100%",
        /* rotate: 360deg, */
    },
});

export const forms = css({
    boxShadow: "0 0 5px 3px rgba(0, 0, 0, 0.05)",
    background: "rgba(0, 0, 0, 0.02)",
    border: "5px solid $color$white",
    padding: "20px",
    fontSize: "$fontSizes$2",
    lineHeight: 1.5,
    fontWeight: 600,
    label: {
        display: "block",
        mb: "$fontSizes$1",
    },
    "input, textarea, select": {
        width: "100%",
        padding: "0.5rem",
        fontSize: "$fontSizes$1",
        border: "1px solid $colors$black",
        "&:focus": {
            outline: 0,
            borderColor: "$color$red",
        },
    },
    "button, input[type='submit']": {
        width: "auto",
        background: "red",
        color: "white",
        border: 0,
        fontSize: "$fontSizes$4",
        fontWeight: "600",
        padding: "0.5rem 1.2rem",
    },
    fieldset: {
        border: 0,
        padding: 0,

        "&[disabled]": {
            opacity: 0.5,
        },
        "&::before": {
            height: "10px",
            content: "",
            display: "block",
            backgroundImage: `linear-gradient(
                to right,
                #ff3019 0%,
                #e2b04a 50%,
                #ff3019 100%
                )`,
        },
        "&[aria-busy='true']::before": {
            backgroundSize: "50% auto",
            animation: `${loading} 0.5s linear infinite`,
        },
    },
});
