import React from 'react'

const TimeDisplay = ({ recognitionCountdownLabel, recognitionIsOvertime }: { recognitionCountdownLabel: string; recognitionIsOvertime: boolean }) => {
    const style = recognitionIsOvertime
        ? { animation: "overtimeBlink 1s steps(1, end) infinite" }
        : { opacity: 0 };

    return (


        // <div className={`mt-1 text-2xl font-semibold tabular-nums ${recognitionIsOvertime ? "text-rose-100" : "text-amber-100"}`}>
        //     {recognitionIsOvertime ? (
        //         <>
        //             {recognitionCountdownLabel}
        //             {" "}
        //             <span style={{ animation: "overtimeBlink 1s steps(1, end) infinite" }}>**</span>
        //         </>
        //     ) : recognitionCountdownLabel}
        // </div>

        <div className={`mt-1 text-2xl font-semibold tabular-nums ${recognitionIsOvertime ? "text-rose-100" : "text-amber-100"}`}>

            <>
                {recognitionCountdownLabel}
                {" "}
                <span style={style}>**</span>
            </>
        </div>
    )
}

export default TimeDisplay