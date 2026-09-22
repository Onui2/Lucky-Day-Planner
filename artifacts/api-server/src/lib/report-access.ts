import {
  db,
  ordersTable,
  purchaseEntitlementsTable,
  type PdfReportRow,
} from "@workspace/db";
import { and, eq, gt, isNull, or } from "drizzle-orm";

/** Paid zero-amount grants use the same entitlement checks as purchased reports. */
export async function hasReportAccess(
  userId: string,
  report: Pick<PdfReportRow, "id" | "userId" | "orderId" | "productType">,
): Promise<boolean> {
  if (report.userId !== userId) return false;

  const [entitlement] = await db
    .select({ id: purchaseEntitlementsTable.id })
    .from(purchaseEntitlementsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, purchaseEntitlementsTable.orderId))
    .where(and(
      eq(ordersTable.id, report.orderId),
      eq(ordersTable.userId, userId),
      eq(ordersTable.productType, report.productType),
      eq(ordersTable.status, "paid"),
      eq(purchaseEntitlementsTable.userId, userId),
      eq(purchaseEntitlementsTable.productType, report.productType),
      eq(purchaseEntitlementsTable.resourceType, "pdf_report"),
      eq(purchaseEntitlementsTable.resourceId, report.id),
      eq(purchaseEntitlementsTable.status, "active"),
      or(
        isNull(purchaseEntitlementsTable.expiresAt),
        gt(purchaseEntitlementsTable.expiresAt, new Date()),
      ),
    ))
    .limit(1);

  return Boolean(entitlement);
}
