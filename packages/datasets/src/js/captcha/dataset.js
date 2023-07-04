"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addItemHashesAndSolutionHashesToDataset = exports.buildCaptchaTree = exports.buildDataset = void 0;
var merkle_1 = require("./merkle");
var common_1 = require("@prosopo/common");
var captcha_1 = require("./captcha");
function buildDataset(datasetRaw) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var dataset, contentTree, solutionTree;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, addItemHashesAndSolutionHashesToDataset(datasetRaw)];
                case 1:
                    dataset = _c.sent();
                    return [4 /*yield*/, buildCaptchaTree(dataset, false, false, true)];
                case 2:
                    contentTree = _c.sent();
                    return [4 /*yield*/, buildCaptchaTree(dataset, true, true, false)];
                case 3:
                    solutionTree = _c.sent();
                    dataset.captchas = dataset.captchas.map(function (captcha, index) {
                        var _a, _b;
                        return (__assign(__assign({}, captcha), { captchaId: solutionTree.leaves[index].hash, captchaContentId: contentTree.leaves[index].hash, datasetId: (_a = solutionTree.root) === null || _a === void 0 ? void 0 : _a.hash, datasetContentId: (_b = contentTree.root) === null || _b === void 0 ? void 0 : _b.hash }));
                    });
                    dataset.solutionTree = solutionTree.layers;
                    dataset.contentTree = contentTree.layers;
                    dataset.datasetId = (_a = solutionTree.root) === null || _a === void 0 ? void 0 : _a.hash;
                    dataset.datasetContentId = (_b = contentTree.root) === null || _b === void 0 ? void 0 : _b.hash;
                    return [2 /*return*/, dataset];
            }
        });
    });
}
exports.buildDataset = buildDataset;
function buildCaptchaTree(dataset, includeSolution, includeSalt, sortItemHashes) {
    return __awaiter(this, void 0, void 0, function () {
        var tree, datasetWithItemHashes, captchaHashes;
        return __generator(this, function (_a) {
            try {
                tree = new merkle_1.CaptchaMerkleTree();
                datasetWithItemHashes = __assign({}, dataset);
                captchaHashes = datasetWithItemHashes.captchas.map(function (captcha) {
                    return (0, captcha_1.computeCaptchaHash)(captcha, includeSolution, includeSalt, sortItemHashes);
                });
                tree.build(captchaHashes);
                return [2 /*return*/, tree];
            }
            catch (err) {
                throw new common_1.ProsopoEnvError('DATASET.HASH_ERROR');
            }
            return [2 /*return*/];
        });
    });
}
exports.buildCaptchaTree = buildCaptchaTree;
function addItemHashesAndSolutionHashesToDataset(datasetRaw) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        var _b;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = [__assign({}, datasetRaw)];
                    _b = {};
                    return [4 /*yield*/, Promise.all(datasetRaw.captchas.map(function (captcha) { return __awaiter(_this, void 0, void 0, function () {
                            var items;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, Promise.all(captcha.items.map(function (item) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, (0, captcha_1.computeItemHash)(item)];
                                                case 1: return [2 /*return*/, _a.sent()];
                                            }
                                        }); }); }))];
                                    case 1:
                                        items = _a.sent();
                                        return [2 /*return*/, __assign(__assign(__assign({}, captcha), { items: items }), (captcha.solution !== undefined && { solution: (0, captcha_1.matchItemsToSolutions)(captcha.solution, items) }))];
                                }
                            });
                        }); }))];
                case 1: return [2 /*return*/, __assign.apply(void 0, _a.concat([(_b.captchas = _c.sent(), _b)]))];
            }
        });
    });
}
exports.addItemHashesAndSolutionHashesToDataset = addItemHashesAndSolutionHashesToDataset;
