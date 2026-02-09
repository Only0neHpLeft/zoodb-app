import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { tauri } from "@daveyplate/better-auth-tauri/plugin";
import { emailOTP } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: [siteUrl, "https://api.zoodb.app", "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost", "http://localhost:3000", "zoodb://"],
    database: authComponent.adapter(ctx),
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
      tauri({ scheme: "zoodb" }),
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        sendVerificationOnSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          if (type === "email-verification") {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "ZooDB <noreply@zoodb.app>",
                to: [email],
                subject: "ZooDB - Verification Code",
                html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;padding:40px 0">
<tr><td align="center">
<table width="460" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(100,74,64,0.08)">
  <tr><td style="background:linear-gradient(135deg,#644a40,#7d5e52);padding:32px 40px;text-align:center">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px;margin-bottom:12px">
      <img src="https://api.dicebear.com/9.x/shapes/svg?seed=zoodb&backgroundColor=644a40&shape1Color=ffdfb5" alt="" width="28" height="28" style="display:block;border-radius:6px">
    </div>
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">ZooDB</h1>
  </td></tr>
  <tr><td style="padding:36px 40px 12px;text-align:center">
    <p style="margin:0 0 6px;color:#202020;font-size:18px;font-weight:700">Verify your email</p>
    <p style="margin:0;color:#6b6b6b;font-size:14px">Enter this code to complete your registration</p>
  </td></tr>
  <tr><td style="padding:20px 40px;text-align:center">
    <div style="display:inline-block;background:#faf6f3;border:2px solid #e8ddd6;border-radius:12px;padding:16px 32px;letter-spacing:8px;font-size:32px;font-weight:700;color:#644a40;font-family:'SF Mono',Monaco,'Cascadia Code',monospace">${otp}</div>
  </td></tr>
  <tr><td style="padding:8px 40px 36px;text-align:center">
    <p style="margin:0;color:#9a9a9a;font-size:13px">This code expires in <strong style="color:#644a40">5 minutes</strong></p>
  </td></tr>
  <tr><td style="padding:0 40px 32px">
    <div style="border-top:1px solid #eee;padding-top:20px;text-align:center">
      <p style="margin:0;color:#b0b0b0;font-size:12px">If you didn't create a ZooDB account, you can safely ignore this email.</p>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
              }),
            });
            if (!res.ok) {
              const err = await res.text();
              console.error("Resend error:", res.status, err);
            }
          }
        },
      }),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

// Reactive query for AuthBoundary — validates session against Convex DB
export const { getAuthUser } = authComponent.clientApi();
