// Convert arabic numbers to roman
export function toRoman(num: number): string {
    if (num <= 0 || num >= 4000) {
        throw new Error("Number out of range (must be 1–3999).");
    }

    const map: [number, string][] = [
        [1000, "M"],
        [900, "CM"],
        [500, "D"],
        [400, "CD"],
        [100, "C"],
        [90, "XC"],
        [50, "L"],
        [40, "XL"],
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
    ];

    let result = "";
    for (const [value, symbol] of map) {
        while (num >= value) {
            result += symbol;
            num -= value;
        }
    }
    return result;
}

export function toArabic(roman: string): number {
    const map: [string, number][] = [
        ["M", 1000],
        ["CM", 900],
        ["D", 500],
        ["CD", 400],
        ["C", 100],
        ["XC", 90],
        ["L", 50],
        ["XL", 40],
        ["X", 10],
        ["IX", 9],
        ["V", 5],
        ["IV", 4],
        ["I", 1],
    ];

    let result = 0;
    for (const [symbol, value] of map) {
        while (roman.startsWith(symbol)) {
            result += value;
            roman = roman.slice(symbol.length);
        }
    }
    return result;
}

// Function to get an array of roman numerals from 1 to x
export function getRomanNumerals(n: number): string[] {
    return Array.from({ length: n }, (_, i) => toRoman(i + 1));
}