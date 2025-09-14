// app/fonts.ts
import localFont from "next/font/local";

export const epunda = localFont({
    src: [
        { path: "./fonts/epunda/EpundaSansItalic.ttf", weight: "400", style: "italic" },
        { path: "./fonts/epunda/EpundaSansRoman.ttf", weight: "400", style: "normal" }, // optional
    ],
    display: "swap",
    variable: "--font-epunda",
});
