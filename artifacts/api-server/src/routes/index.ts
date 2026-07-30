import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import roomsRouter from "./rooms";
import tenantsRouter from "./tenants";
import paymentsRouter from "./payments";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(propertiesRouter);
router.use(roomsRouter);
router.use(tenantsRouter);
router.use(paymentsRouter);
router.use(documentsRouter);
router.use(dashboardRouter);
router.use(searchRouter);

export default router;
