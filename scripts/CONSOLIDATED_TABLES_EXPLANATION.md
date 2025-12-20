# Consolidated Tables: Options Explained

## Your Question: Refresh Functions vs Realtime Tables

### What are Refresh Functions?
**Refresh functions** are stored procedures that manually rebuild your consolidated table by:
1. Truncating (clearing) the consolidated table
2. Re-querying all 13 source tables
3. Re-inserting all data

**Pros:**
- Simple to understand
- Full control over when updates happen
- Works with any database

**Cons:**
- ❌ **Not automatic** - must be called manually or scheduled
- ❌ Can be slow with large datasets (re-queries everything)
- ❌ Data can be stale between refreshes

### What is Realtime (Supabase)?
**Realtime** is Supabase's feature for pushing database changes to connected clients via WebSockets. It:
- Notifies clients when data changes
- Works great for live dashboards and chat apps
- **Does NOT keep tables in sync automatically**

**Why you can't just "enable realtime" on consolidated tables:**
- Realtime only pushes notifications to clients
- It doesn't automatically update one table when another changes
- It's for client-side subscriptions, not server-side data synchronization

---

## Best Options for Your Use Case

### Option 1: **Views (What You Already Have)** ⭐ RECOMMENDED
**Status:** You already have these! (`current_planned_outages`, `future_planned_outages`, `unplanned_outages`)

**How it works:**
- Views are virtual tables that query source tables in real-time
- Always up-to-date automatically
- No maintenance needed

**Pros:**
- ✅ **Always live** - queries source tables directly
- ✅ Zero maintenance
- ✅ No storage overhead
- ✅ Already working in your codebase

**Cons:**
- ⚠️ Can be slower on complex queries (but usually fine)
- ⚠️ Can't add indexes directly (but can on underlying tables)

**Verdict:** If your views are performing well, **keep using them!** They're the simplest and most reliable solution.

---

### Option 2: **Tables with Triggers** (Fully Automatic)
**How it works:**
- Create actual tables (not views)
- Database triggers automatically update consolidated table when source tables change
- Updates happen instantly when data changes

**Pros:**
- ✅ Fully automatic - no manual refresh needed
- ✅ Fast queries (real tables with indexes)
- ✅ Always up-to-date

**Cons:**
- ⚠️ Complex setup (13 providers × 3 table types = 39 triggers)
- ⚠️ More database overhead (triggers fire on every change)
- ⚠️ Can slow down writes to source tables

**When to use:** If views are too slow AND you need guaranteed real-time updates

---

### Option 3: **Materialized Views** (Fast but Manual Refresh)
**How it works:**
- Like views, but data is stored (materialized)
- Must be manually refreshed: `REFRESH MATERIALIZED VIEW ...`
- Can be scheduled with pg_cron

**Pros:**
- ✅ Fast queries (pre-computed data)
- ✅ Can add indexes

**Cons:**
- ❌ Not automatically updated
- ❌ Must schedule refreshes (pg_cron or application-level)
- ❌ Data can be stale

**When to use:** If views are slow AND you're okay with periodic refreshes

---

### Option 4: **Tables with Scheduled Refresh** (Simple but Not Real-time)
**How it works:**
- Create actual tables
- Use refresh functions on a schedule (every 5 minutes, etc.)
- Can use pg_cron, Supabase Edge Functions, or your Node.js scripts

**Pros:**
- ✅ Simple to understand
- ✅ Fast queries
- ✅ Full control over refresh timing

**Cons:**
- ❌ Not real-time (updates every X minutes)
- ❌ Must set up scheduling

**When to use:** If you need fast queries but can accept slight delays

---

## My Recommendation

### **Use Views (Option 1)** - You Already Have This! ✅

Your existing views (`current_planned_outages`, `future_planned_outages`, `unplanned_outages`) are:
- ✅ Always up-to-date
- ✅ Zero maintenance
- ✅ Already working

**Only switch to tables if:**
1. Views are too slow for your queries
2. You need to add specific indexes that views don't support
3. You're doing complex aggregations that benefit from pre-computed data

### If You Need Tables, Use Option 4 (Scheduled Refresh)

If views aren't fast enough, create tables with refresh functions and schedule them:
- Refresh every 5-10 minutes (matches your data update frequency)
- Simple to set up and maintain
- Good balance of performance and simplicity

---

## Quick Comparison Table

| Option | Auto-Update | Speed | Complexity | Maintenance |
|--------|------------|-------|------------|-------------|
| **Views** ✅ | ✅ Always | Good | Low | None |
| **Tables + Triggers** | ✅ Instant | Fast | High | Medium |
| **Materialized Views** | ❌ Manual | Fast | Medium | Schedule refresh |
| **Tables + Refresh** | ❌ Scheduled | Fast | Low | Schedule refresh |

---

## Next Steps

1. **Test your current views** - Are they fast enough?
2. **If yes:** Keep using views! No changes needed.
3. **If no:** Consider tables with scheduled refresh (Option 4)

Would you like me to:
- A) Keep the refresh function approach (Option 4)
- B) Create trigger-based tables (Option 2) - more complex but fully automatic
- C) Help optimize your existing views instead?

