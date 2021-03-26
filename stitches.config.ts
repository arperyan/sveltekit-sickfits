import { createCss } from "@stitches/core";

export const {
    css,
    global: globalCSS,
    keyframes,
    getCssString,
    theme,
} = createCss({
    theme: {
        colors: {
            black: "rgba(19, 19, 21, 1)",
            white: "rgba(255, 255, 255, 1)",
            gray: "rgba(128, 128, 128, 1)",
            blue: "rgba(3, 136, 252, 1)",
            red: "rgba(249, 16, 74, 1)",
            yellow: "rgba(255, 221, 0, 1)",
            pink: "rgba(232, 141, 163, 1)",
            turq: "rgba(0, 245, 196, 1)",
            orange: "rgba(255, 135, 31, 1)",
            lightGray: "#e1e1e1",
            offwhite: "#ededed",
        },
        fontSizes: {
            1: "12px",
            2: "14px",
            3: "16px",
            4: "20px",
            5: "24px",
            6: "32px",
            7: "48px",
            8: "64px",
            9: "72px",
        },
        sizes: {
            maxWidth: "1000px",
        },
        shadows: {
            boxShadow: "0 12px 24px 0 rgba(0,0,0,0.09)",
        },
    },
    media: {
        bp1: "(min-width: 575px)",
        bp2: "(min-width: 750px)",
        bp3: "(min-width: 1000px)",
        bp4: "(min-width: 1200px)",
    },
    utils: {
        p: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            paddingTop: value,
            paddingBottom: value,
            paddingLeft: value,
            paddingRight: value,
        }),
        pt: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            paddingTop: value,
        }),
        pr: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            paddingRight: value,
        }),
        pb: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            paddingBottom: value,
        }),
        pl: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            paddingLeft: value,
        }),
        px: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            paddingLeft: value,
            paddingRight: value,
        }),
        py: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            paddingTop: value,
            paddingBottom: value,
        }),
        m: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            marginTop: value,
            marginBottom: value,
            marginLeft: value,
            marginRight: value,
        }),
        mt: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            marginTop: value,
        }),
        mr: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            marginRight: value,
        }),
        mb: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            marginBottom: value,
        }),
        ml: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            marginLeft: value,
        }),
        mx: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            marginLeft: value,
            marginRight: value,
        }),
        my: (config) => (
            value: keyof typeof config.theme["space"] | number | (string & {})
        ) => ({
            marginTop: value,
            marginBottom: value,
        }),
        bc: (config) => (
            value: keyof typeof config.theme["colors"] | (string & {})
        ) => ({
            backgroundColor: value,
        }),
    },
    prefix: "",
    themeMap: {},
});
