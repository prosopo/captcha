import { Router } from 'express';
import { Environment } from "@prosopo/provider-core/env";
/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export declare function prosopoMiddleware(env: Environment): Router;
