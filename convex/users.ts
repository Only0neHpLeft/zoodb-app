import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user profile by user ID
export const getProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Create or update user profile
export const upsertProfile = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"), v.literal("admin"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        fullName: args.fullName ?? existing.fullName,
        role: args.role ?? existing.role,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      email: args.email,
      fullName: args.fullName,
      role: args.role ?? "student",
    });
    return await ctx.db.get(id);
  },
});

// Get user settings
export const getSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return null;

    return {
      language: profile.language ?? "en",
      theme: profile.theme ?? "caffeine",
      darkMode: profile.darkMode ?? false,
      customThemeCss: profile.customThemeCss ?? null,
    };
  },
});

// Update user settings
export const updateSettings = mutation({
  args: {
    userId: v.string(),
    language: v.optional(v.union(v.literal("en"), v.literal("cz"))),
    theme: v.optional(v.string()),
    darkMode: v.optional(v.boolean()),
    customThemeCss: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      // Create profile with settings
      const id = await ctx.db.insert("userProfiles", {
        userId: args.userId,
        email: "", // Will be updated later
        role: "student",
        language: args.language,
        theme: args.theme,
        darkMode: args.darkMode,
        customThemeCss: args.customThemeCss,
      });
      return await ctx.db.get(id);
    }

    const updates: Record<string, unknown> = {};
    if (args.language !== undefined) updates.language = args.language;
    if (args.theme !== undefined) updates.theme = args.theme;
    if (args.darkMode !== undefined) updates.darkMode = args.darkMode;
    if (args.customThemeCss !== undefined) updates.customThemeCss = args.customThemeCss;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(profile._id, updates);
    }

    return await ctx.db.get(profile._id);
  },
});

// Update last seen timestamp
export const updateLastSeen = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { lastSeenAt: Date.now() });
    }
  },
});
