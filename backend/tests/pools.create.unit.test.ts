import express from "express";
import request from "supertest";
import { prisma } from "../src/db/prisma";
import { errorHandler } from "../src/middleware/errorHandler";
import { clearLimiterCache } from "../src/middleware/rateLimit";
import { createPoolsRouter } from "../src/routes/pools";

const ARENA_ID = `C${"A".repeat(55)}`;
const originalArena = prisma.arena;
const originalPool = prisma.pool;

describe("POST /api/pools (#1224)", () => {
  afterEach(() => {
    (prisma as any).arena = originalArena;
    (prisma as any).pool = originalPool;
    clearLimiterCache();
  });

  it("returns ARENA_NOT_FOUND without attempting an insert", async () => {
    const create = jest.fn();
    (prisma as any).arena = { findUnique: jest.fn(async () => null) };
    (prisma as any).pool = { create };

    const app = express();
    app.use(express.json());
    app.use("/api/pools", createPoolsRouter((_req, _res, next) => next()));
    app.use(errorHandler);

    const response = await request(app)
      .post("/api/pools")
      .send({ arenaId: ARENA_ID, stakeAmount: 25 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "ARENA_NOT_FOUND",
        message: `Arena with ID ${ARENA_ID} not found`,
      },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a pool after confirming the arena exists", async () => {
    const pool = { id: "pool-1", arenaId: ARENA_ID, stakeAmount: 25 };
    (prisma as any).arena = { findUnique: jest.fn(async () => ({ id: ARENA_ID })) };
    (prisma as any).pool = { create: jest.fn(async () => pool) };

    const app = express();
    app.use(express.json());
    app.use("/api/pools", createPoolsRouter((_req, _res, next) => next()));
    app.use(errorHandler);

    const response = await request(app)
      .post("/api/pools")
      .send({ arenaId: ARENA_ID, stakeAmount: 25 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(pool);
    expect(prisma.pool.create).toHaveBeenCalledWith({
      data: { arenaId: ARENA_ID, stakeAmount: 25 },
    });
  });
});
