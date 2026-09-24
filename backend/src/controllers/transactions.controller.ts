import type { NextFunction, Request, Response } from "express";
import type { TransactionRepository } from "../repositories/transactionRepository";
import { apiError } from "../utils/apiError";
import { canAccessTransaction } from "../utils/transactionAccess";

export class TransactionsController {
  constructor(private readonly transactions: TransactionRepository) {}

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startedAt = Date.now();
    const seed = await this.transactions.findById(req.params.id!);
    if (!seed) { next(apiError(404, "TRANSACTION_NOT_FOUND", "Transaction not found")); return; }
    try {
      const records = await this.transactions.listByStatus(["built", "queued", "awaiting_signature", "submitted", "confirmed", "failed", "dead"], 1000);
      const timeline = records.filter((item) => item.payoutId === seed.payoutId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((item, index, items) => ({ ...item, replacesTransactionId: item.replacesTransactionId ?? items[index - 1]?.id ?? null, replacedByTransactionId: item.replacedByTransactionId ?? items[index + 1]?.id ?? null }));
      console.info(JSON.stringify({ event: "payout_timeline_success", payoutId: seed.payoutId, count: timeline.length, latencyMs: Date.now() - startedAt }));
      res.json({ version: 1, payoutId: seed.payoutId, timeline });
    } catch (error) {
      console.error(JSON.stringify({ event: "payout_timeline_failure", transactionId: seed.id, latencyMs: Date.now() - startedAt }));
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tx = await this.transactions.findById(req.params.id!);
    if (!tx || !canAccessTransaction(tx, req)) {
      // Missing and forbidden are indistinguishable so ids cannot be probed.
      next(apiError(404, "TRANSACTION_NOT_FOUND", `Transaction ${req.params.id} not found`));
      return;
    }
    res.json(tx);
  };
}
