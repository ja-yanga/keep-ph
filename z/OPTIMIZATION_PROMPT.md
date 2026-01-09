# Optimization Prompt Template

Copy and paste this prompt when you need to optimize another page with large datasets:

---

**Task: Optimize [Page Name] for High Performance (50k+ Records)**

**Context:**
The [Table Name] table has over 50,000 records. Currently, the page is slow because it fetches all data and handles pagination/filtering on the client side.

**Objectives:**

1. **DB Layer**: Identify and fix any Sequential Scans (Seq Scan). Ensure the primary lookup and search columns are indexed. Use `EXPLAIN ANALYZE` to verify.
2. **API Layer**: Update the GET route to support server-side pagination (`page`, `pageSize`), search, and filtering. Ensure the count is returned.
3. **Frontend Layer**:
   - Implement debounced search (500ms) to avoid request spam.
   - Update the [Table Component] to use server-side pagination.
   - Remove any client-side `.filter()` or `.slice()` logic.
   - Embed related entities (joins) in the single API call to avoid N+1 issues.

**Acceptance Criteria:**

- `EXPLAIN ANALYZE` confirms `Index Scan` for all common queries.
- Lighthouse Performance score >= 95.
- API response time < 200ms.
- Smooth UX with no UI freezing during searches.

---

# Technical Workflow Reference

### 1. Database Indexing

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_your_table_column_trgm ON public.your_table USING gin (your_column gin_trgm_ops);
CREATE INDEX idx_your_table_created_at ON public.your_table (created_at DESC);
```

### 2. API Implementation (Next.js)

```typescript
const page = Number(searchParams.get("page") ?? 1);
const pageSize = 10;
const { data, count } = await supabase
  .from("table")
  .select("*, join_table(*)", { count: "exact" })
  .ilike("column", `%${search}%`)
  .range((page - 1) * pageSize, page * pageSize - 1);
```

### 3. Frontend Implementation (React/SWR)

```typescript
const [debouncedSearch] = useDebouncedValue(search, 500);
const { data } = useSWR(`/api/route?page=${page}&search=${debouncedSearch}`);
// Pass results directly to DataTable
```
