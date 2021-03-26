import { css } from "../../../stitches.config";

export const itemStyles = css({
    background: "$colors$white",
    border: "1px solid $colors$offWhite",
    boxShadow: "$shadows$boxShadow",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    img: {
        width: "100%",
        height: "400px",
        objectFit: "cover",
    },
    p: {
        lineHeight: "2",
        fontWeight: "300",
        "flex-grow": "1",
        padding: " 0 3rem",
        fontSize: "$fontSizes$3",
    },
    ".buttonList": {
        display: "grid",
        width: "100%",
        borderTop: "1px solid $colors$lightGray",
        gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
        gridGap: "1px",
        background: "$colors$lightGray",
        "& > *": {
            background: "white",
            border: "0",
            fontSize: "$fontSizes$1",
            padding: "1rem",
        },
    },
});
