import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import citiesRouter from "./cities.js";
import simulationRouter from "./simulation.js";
import weatherRouter from "./weather.js";
import geoAnalysisRouter from "./geoAnalysis.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(citiesRouter);
router.use(simulationRouter);
router.use(weatherRouter);
router.use(geoAnalysisRouter);

export default router;
