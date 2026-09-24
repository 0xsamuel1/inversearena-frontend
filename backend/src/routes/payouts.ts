import { Router } from "express";
import type { RequestHandler } from "express";
import { asyncHandler, validateBody, validateParams } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { auditLogMiddleware } from "../middleware/auditLog";
import type { PayoutsController } from "../controllers/payouts.controller";
import type { AuthService } from "../services/authService";
import { SignPayoutBodySchema, TransactionIdParamSchema } from "../validation/requestValidation";

export function createPayoutsRouter(
  controller: PayoutsController,
  authService: AuthService,
  adminAuthMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(auditLogMiddleware());

  router.get("/claim-readiness/:arenaId", requireAuth(authService), asyncHandler(controller.getClaimReadiness));
  // Payout lifecycle is admin-only: creation, signing and submission move funds.
  router.post("/", adminAuthMiddleware, asyncHandler(controller.createPayout));
  router.get("/:id", requireAuth(authService), validateParams(TransactionIdParamSchema), asyncHandler(controller.getPayout));
  // Settlement receipt (#1407): same ownership rule as GET /:id.
  router.get(
    "/:id/receipt",
    requireAuth(authService),
    validateParams(TransactionIdParamSchema),
    asyncHandler(controller.getReceipt)
  );
  router.get(
    "/:id/receipt.csv",
    requireAuth(authService),
    validateParams(TransactionIdParamSchema),
    asyncHandler(controller.getReceiptCsv)
  );
  router.post(
    "/:id/sign",
    adminAuthMiddleware,
    validateParams(TransactionIdParamSchema),
    validateBody(SignPayoutBodySchema),
    asyncHandler(controller.signPayout)
  );
  router.post(
    "/:id/submit",
    adminAuthMiddleware,
    validateParams(TransactionIdParamSchema),
    asyncHandler(controller.submitPayout)
  );

  return router;
}
