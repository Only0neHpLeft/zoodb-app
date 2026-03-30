import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { checkRateLimit } from './rateLimiter'

// Get membership for a user
export const getMembership = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }

    return await ctx.db
      .query('userMemberships')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first()
  },
})

// Get or create membership (ensures user has at least free tier)
export const getOrCreateMembership = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }
    await checkRateLimit(ctx, identity.subject, 'mutation', 500)

    const existing = await ctx.db
      .query('userMemberships')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) return existing

    // Create free membership
    const id = await ctx.db.insert('userMemberships', {
      userId: args.userId,
      planType: 'free',
    })
    return await ctx.db.get(id)
  },
})

// Update membership
export const updateMembership = mutation({
  args: {
    userId: v.string(),
    planType: v.string(),
    licenseKey: v.optional(v.string()),
    licenseStatus: v.optional(v.string()),
    licenseExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }
    await checkRateLimit(ctx, identity.subject, 'mutation', 500)

    const existing = await ctx.db
      .query('userMemberships')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        planType: args.planType,
        licenseKey: args.licenseKey,
        licenseStatus: args.licenseStatus,
        licenseExpiresAt: args.licenseExpiresAt,
      })
      return await ctx.db.get(existing._id)
    }

    // Create new membership
    const id = await ctx.db.insert('userMemberships', {
      userId: args.userId,
      planType: args.planType,
      licenseKey: args.licenseKey,
      licenseStatus: args.licenseStatus,
      licenseExpiresAt: args.licenseExpiresAt,
    })
    return await ctx.db.get(id)
  },
})

// Check if user has premium access
export const hasPremiumAccess = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== args.userId) {
      throw new Error('Unauthorized')
    }

    const membership = await ctx.db
      .query('userMemberships')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first()

    if (!membership) return false

    // Check if plan is premium
    const premiumPlans = ['pro', 'premium', 'enterprise']
    if (!premiumPlans.includes(membership.planType)) return false

    // Check if license is valid and not expired
    if (
      membership.licenseExpiresAt &&
      membership.licenseExpiresAt < Date.now()
    ) {
      return false
    }

    return (
      membership.licenseStatus !== 'revoked' &&
      membership.licenseStatus !== 'expired'
    )
  },
})
