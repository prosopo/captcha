"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClientBase = void 0;
const tslib_1 = require("tslib");
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
const axios_1 = tslib_1.__importDefault(require("axios"));
class HttpClientBase {
    axios;
    constructor(baseURL, prefix = '') {
        baseURL = baseURL + prefix;
        this.axios = axios_1.default.create({ baseURL });
        this.axios.interceptors.response.use(this.responseHandler, this.errorHandler);
    }
    responseHandler = (response) => {
        console.log('API REQUEST', response.request);
        return response.data;
    };
    errorHandler = (error) => Promise.reject(error.response);
}
exports.HttpClientBase = HttpClientBase;
exports.default = HttpClientBase;
//# sourceMappingURL=HttpClientBase.js.map