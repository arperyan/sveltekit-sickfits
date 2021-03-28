import { css } from "../../../stitches.config";

export const navStyles = css({
    margin: "0",
    padding: "0",
    display: "flex",
    justifySelf: "end",

    "a, button": {
        padding: "1rem 3rem",
        display: "flex",
        alignItems: "center",
        position: "relative",
        textTransform: "uppercase",
        fontWeight: "900",
        fontSize: "$fontSizes$4",
        background: "none",
        border: "0",
        cursor: "pointer",
        "@b2": {
            fontSize: "10px",
            padding: "0 10px",
        },
        "&:before": {
            content: "",
            width: "2px",
            background: "$colors$lightGray",
            height: "100%",
            left: "0",
            position: "absolute",
            transform: "skew(-20deg)",
            top: " 0",
            bottom: "0",
        },
        "&:after": {
            height: "2px",
            background: "red",
            content: "",
            width: "0",
            position: "absolute",
            transform: "translateX(-50%)",
            transition: "width 0.4s",
            transitionTimingFunction: "cubic-bezier(1, -0.65, 0, 2.31)",
            left: "50%",
            marginTop: "2rem",
        },
        "&:hover, &:focus": {
            outline: "none",
            textDecoration: "none",
            "&:after": {
                width: "calc(100% - 60px)",
            },
            "@b2": {
                width: "calc(100% - 10px)",
            },
        },
        "&.active:after": {
            width: "calc(100% - 60px)",
        },
    },
    "@b3": {
        borderTop: "1px solid $colors$lightGray",
        width: "100%",
        justifyContent: "center",
        fontSize: "$fontSizes$2",
    },
});
