import { css } from "../../../stitches.config";

const PaginationStyles = css({
    textAlign: "center",
    display: "inline-grid",
    gridTemplateColumns: "repeat(4, auto)",
    alignItems: "stretch",
    justifyContent: "center",
    alignContent: "center",
    m: "2rem",
    border: "1px solid $lightGray",
    borderRadius: "10px",
    "& > *": {
        m: "0",
        px: "30px",
        py: "5px",
        borderRight: "1px solid $lightGray",
        "&:last-child": {
            borderRight: "0",
        },
    },
    'a[aria-disabled="true"]': {
        color: "$grey",
        pointerEvents: "none",
    },
});

export default PaginationStyles;
