"use client";

import Image from "next/image";
import { useState } from "react";

export default function FlagImage({
    src,
    alt,
    sizes = "200px",
    className,
}: {
    src: string;
    alt: string;
    sizes?: string;
    className?: string;
}) {
    const [errored, setErrored] = useState(false);

    if (errored) {
        // simple placeholder if the flag file is missing
        return (
            <div
                className={`h-full w-full bg-stone-300 ${className ?? ""}`}
                aria-label={alt}
                role="img"
            />
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className={className ?? "object-cover"}
            onError={() => setErrored(true)}
            priority={false}
        />
    );
}
