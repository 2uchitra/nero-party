import type { Server, Socket } from "socket.io";
import { prisma } from "../db.js";

export function registerSocketHandlers(io: Server, socket: Socket) {
  socket.on("join-party", async ({ partyCode }: { partyCode: string }) => {
    const code = partyCode.toUpperCase();
    socket.join(code);

    const party = await prisma.party.findUnique({
      where: { code },
      include: {
        participants: { orderBy: { joinedAt: "asc" } },
        songs: {
          include: { addedBy: true, ratings: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (party) {
      socket.emit("party:state", party);
    }
  });

  socket.on("leave-party", ({ partyCode }: { partyCode: string }) => {
    socket.leave(partyCode.toUpperCase());
  });
}
