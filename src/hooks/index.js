import { globalStyles } from "../lib/styles/global";

export function getContext({ headers }) {
    console.log(headers);
    return {
        globalStyles,
    };
}
