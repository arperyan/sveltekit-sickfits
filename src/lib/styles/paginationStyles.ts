import { css } from "../../../stitches.config";

export const paginationStyles = css({
    textAlign: "center",
    display: "inline-grid",
    gridTemplateColumns: "repeat(4, auto)",
    alignItems: "stretch",
    justifyContent: "center",
    alignContent: "center",
    marginBottom: "4rem",
    border: "1px solid $colors$lightGray",
    borderRadius: "10px",
    "&:last-child": {
        marginTop: "4rem",
    },
    "& > *": {
        m: "0",
        px: "30px",

        py: "5px",
        borderRight: "1px solid $colors$lightGray",
        "&:last-child": {
            borderRight: "0",
        },
    },
    "a:hover": {
        textDecoration: "none",
        color: "$colors$red",
    },
    'a[aria-disabled="true"]': {
        color: "$colors$grey",
        pointerEvents: "none",
    },
});
