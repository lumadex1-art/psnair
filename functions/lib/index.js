"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetPendingPayments = exports.adminApprovePayment = exports.claim = exports.solanaConfirm = exports.solanaCreateIntent = exports.solanaConfirmCors = exports.solanaCreateIntentCors = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin. It will automatically use the service account credentials
// provided by the Firebase environment.
admin.initializeApp();
console.log('✅ Firebase Admin initialized.');
// Import function modules - MINIMAL UNTUK CORS + ADMIN + CLAIM
const cors_solana_1 = require("./cors-solana");
const admin_1 = require("./admin");
const claim_1 = require("./claim");
const https_2 = require("firebase-functions/v2/https");
// EXPORT FUNGSI CORS YANG DIBUTUHKAN
exports.solanaCreateIntentCors = (0, https_1.onRequest)(cors_solana_1.corsCreateSolanaIntent);
exports.solanaConfirmCors = (0, https_1.onRequest)(cors_solana_1.corsConfirmSolanaPayment);
// EXPORT FUNGSI DENGAN NAMA YANG DIHARAPKAN FRONTEND
exports.solanaCreateIntent = (0, https_1.onRequest)(cors_solana_1.corsCreateSolanaIntent);
exports.solanaConfirm = (0, https_1.onRequest)(cors_solana_1.corsConfirmSolanaPayment);
// EXPORT FUNGSI CLAIM YANG SUDAH DIPERBAIKI
exports.claim = (0, https_2.onCall)(claim_1.claimReward);
// EXPORT FUNGSI ADMIN UNTUK APPROVE MANUAL
exports.adminApprovePayment = (0, https_2.onCall)(admin_1.adminApprovePayment);
exports.adminGetPendingPayments = (0, https_2.onCall)(admin_1.adminGetPendingPayments);
//# sourceMappingURL=index.js.map