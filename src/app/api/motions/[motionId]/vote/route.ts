import { NextResponse } from "next/server";
import { requireAuthContext } from "@/utils/api/guards";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ motionId: string }> },
) {
    try {
        await params;
        await requireAuthContext();
        return NextResponse.json({
            error: "Motions in this committee do not use floor voting. They are seconded and then pass unless denied by the chair.",
        }, { status: 409 });
    } catch (error) {
        console.error("Failed to record motion vote", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
