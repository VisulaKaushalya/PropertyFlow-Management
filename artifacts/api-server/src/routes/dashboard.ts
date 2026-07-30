import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, propertiesTable, roomsTable, tenantsTable, paymentsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetOccupancyBreakdownResponse,
  GetArrearsReportResponse,
  GetRevenueTrendResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /dashboard/summary
router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const properties = await db.select().from(propertiesTable);
  const rooms = await db.select().from(roomsTable);
  const tenants = await db.select().from(tenantsTable).where(eq(tenantsTable.status, "active"));
  const payments = await db.select().from(paymentsTable);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const vacantRooms = totalRooms - occupiedRooms;
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

  const expectedMonthlyRent = rooms
    .filter((r) => r.status === "occupied")
    .reduce((sum, r) => sum + r.monthlyRent, 0);

  // This month's collections
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthPayments = payments.filter((p) => p.month === currentMonth);
  const collectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // Total arrears: sum of (expected - paid) for all active tenants across all months
  let arrearsTotal = 0;
  for (const payment of payments) {
    const diff = payment.expectedAmount - payment.amount;
    if (diff > 0) arrearsTotal += diff;
  }

  const collectionRate = expectedMonthlyRent > 0 ? (collectedThisMonth / expectedMonthlyRent) * 100 : 0;

  res.json(
    GetDashboardSummaryResponse.parse({
      totalProperties: properties.length,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyRate,
      totalTenants: tenants.length,
      expectedMonthlyRent,
      collectedThisMonth,
      arrearsTotal,
      collectionRate,
    })
  );
});

// GET /dashboard/occupancy
router.get("/dashboard/occupancy", async (_req, res): Promise<void> => {
  const properties = await db.select().from(propertiesTable);
  const rooms = await db.select().from(roomsTable);

  const result = properties.map((p) => {
    const propRooms = rooms.filter((r) => r.propertyId === p.id);
    const occupiedRooms = propRooms.filter((r) => r.status === "occupied").length;
    const totalRooms = propRooms.length;
    return {
      propertyId: p.id,
      propertyName: p.name,
      totalRooms,
      occupiedRooms,
      occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
    };
  });

  res.json(GetOccupancyBreakdownResponse.parse(result));
});

// GET /dashboard/arrears
router.get("/dashboard/arrears", async (_req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).where(eq(tenantsTable.status, "active"));
  const rooms = await db.select().from(roomsTable);
  const properties = await db.select().from(propertiesTable);
  const payments = await db.select().from(paymentsTable);

  const result = await Promise.all(
    tenants.map(async (tenant) => {
      const room = rooms.find((r) => r.id === tenant.roomId);
      const property = room ? properties.find((p) => p.id === room.propertyId) : undefined;
      const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
      const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalExpected = tenantPayments.reduce((sum, p) => sum + p.expectedAmount, 0);
      const arrears = Math.max(0, totalExpected - totalPaid);
      const monthsUnpaid = tenantPayments.filter((p) => p.status === "unpaid").length;

      return {
        tenantId: tenant.id,
        tenantName: tenant.fullName,
        roomName: room?.name ?? "N/A",
        propertyName: property?.name ?? "N/A",
        monthlyRent: room?.monthlyRent ?? 0,
        totalPaid,
        arrears,
        monthsUnpaid,
      };
    })
  );

  // Only return tenants with arrears > 0, sorted by arrears desc
  const withArrears = result.filter((r) => r.arrears > 0).sort((a, b) => b.arrears - a.arrears);
  res.json(GetArrearsReportResponse.parse(withArrears));
});

// GET /dashboard/revenue-trend
router.get("/dashboard/revenue-trend", async (_req, res): Promise<void> => {
  const payments = await db.select().from(paymentsTable);
  const rooms = await db.select().from(roomsTable);
  const tenants = await db.select().from(tenantsTable);

  // Build last 6 months
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const result = months.map((month) => {
    const monthPayments = payments.filter((p) => p.month === month);
    const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const expected = monthPayments.reduce((sum, p) => sum + p.expectedAmount, 0);
    return { month, collected, expected };
  });

  res.json(GetRevenueTrendResponse.parse(result));
});

export default router;
