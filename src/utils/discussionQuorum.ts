import { prisma } from "@/prisma";
import { ApiError } from "@/utils/api/guards";
import { loadDiscussionRoomState } from "@/utils/queueChairActions";

const MINIMUM_DEBATE_QUORUM = 3;

export function getDebateQuorumRequired(activeCountryCount: number) {
    return Math.max(MINIMUM_DEBATE_QUORUM, Math.ceil(activeCountryCount * 0.5));
}

export async function getDebateQuorumStatus(threadId: string) {
    const [roomState, activeCountryCount] = await Promise.all([
        loadDiscussionRoomState(threadId),
        prisma.country.count({ where: { isActive: true } }),
    ]);

    const required = getDebateQuorumRequired(activeCountryCount);
    const present = roomState.presentCountries.length;

    return {
        present,
        required,
        met: present >= required,
    };
}

export async function assertDebateQuorumForThread(threadId: string) {
    const status = await getDebateQuorumStatus(threadId);

    if (!status.met) {
        throw new ApiError(409, `Chair actions require debate quorum (${status.present}/${status.required} present)`);
    }

    return status;
}
