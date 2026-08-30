import type { RequestInit, Response } from "node-fetch";
import type { Router } from "express";

type FetchImplementation = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

type NdviRouterOptions = {
  fetchImpl?: FetchImplementation;
  getToken?: () => Promise<string>;
  statisticsUrl?: string;
  logger?: Pick<Console, "error" | "info">;
};

export declare const createNdviRouter: (
  options?: NdviRouterOptions,
) => Router;

declare const router: Router;
export default router;
