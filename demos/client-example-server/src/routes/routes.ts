import type { ProsopoServerConfigOutput } from "@prosopo/types";
import express from "express";
// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { Connection } from "mongoose";
import { isAuth, login, signup } from "../controllers/auth.js";

const router = express.Router();

function getRoutes(
	mongoose: Connection,
	config: ProsopoServerConfigOutput,
	verifyEndpoint: string,
	verifyType: string,
): express.Router {
	router.post(
		"/login",
		login.bind(null, mongoose, config, verifyEndpoint, verifyType),
	);

	router.post(
		"/signup",
		signup.bind(null, mongoose, config, verifyEndpoint, verifyType),
	);

	router.get("/private", isAuth);

	router.get("/public", (req, res) => {
		res.status(200).json({ message: "here is your public resource" });
	});

	// will match any other path
	router.use("/", (req, res) => {
		res.status(404).json({ error: "page not found" });
	});
	return router;
}

export default getRoutes;
