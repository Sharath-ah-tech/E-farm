import { useEffect, useState, useCallback } from "react";
import { getAllTransactions } from "../api/dashboard";
import { getTheme } from "../utils/theme";

const STATUS_BADGE = {
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  out_for_delivery:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  delivered:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TYPE_BADGE = {
  sale: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  purchase:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function PageBtn({ active, disabled, onClick, children, theme }) {
  const base = "min-w-[36px] h-9 px-2 rounded-xl text-sm font-medium transition-all";
  if (disabled)
    return (
      <button disabled className={`${base} text-gray-300 dark:text-gray-600 cursor-not-allowed`}>
        {children}
      </button>
    );
  if (active)
    return (
      <button className={`${base} ${theme.primary} text-white shadow`}>
        {children}
      </button>
    );
  return (
    <button
      onClick={onClick}
      className={`${base} ${theme.secondary} ${theme.text} hover:opacity-80`}
    >
      {children}
    </button>
  );
}

function Transactions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const theme = getTheme();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, dateFrom, dateTo]);

  const fetchData = useCallback(() => {
    setLoading(true);
    getAllTransactions({
      page,
      search: debouncedSearch,
      status: statusFilter,
      type: typeFilter,
      dateFrom,
      dateTo,
    })
      .then((res) => {
        setRows(res.data.results || []);
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.count || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, statusFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters =
    search || statusFilter || typeFilter || dateFrom || dateTo;

  const exportCSV = () => {
    const header =
      "Transaction ID,Date,Product,Buyer/Seller,Quantity,Amount,Type,Status\n";
    const body = rows
      .map(
        (t) =>
          `"${t.id}","${new Date(t.date).toLocaleDateString("en-IN")}","${
            t.product
          }","${t.buyer || t.seller || ""}",${t.quantity},${t.amount},"${
            t.type
          }","${t.status}"`
      )
      .join("\n");
    const blob = new Blob([header + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Page numbers to display
  const pageNums = (() => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  })();

  const selectCls = `rounded-xl px-3 py-2.5 text-sm border ${theme.border} ${theme.card} focus:outline-none focus:ring-2 ${theme.ring} text-gray-700 dark:text-gray-200 bg-transparent`;

  return (
    <div className={`${theme.page} min-h-screen p-4 md:p-6`}>
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${theme.text}`}>
            All Transactions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {totalCount} record{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className={`
            inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
            ${theme.primary} text-white font-semibold text-sm
            hover:shadow-lg hover:scale-105 transition-all duration-200
          `}
        >
          <span className="material-symbols-outlined text-base">
            download
          </span>
          Export CSV
        </button>
      </div>

      {/* ─── Filters ─── */}
      <div
        className={`${theme.card} rounded-2xl p-4 shadow border ${theme.border} mb-6`}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative col-span-2 md:col-span-1 lg:col-span-2">
            <input
              type="text"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 pl-10 text-sm border ${theme.border} bg-transparent focus:outline-none focus:ring-2 ${theme.ring} text-gray-700 dark:text-gray-200`}
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-lg">
              search
            </span>
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All Types</option>
            <option value="sale">Sale</option>
            <option value="purchase">Purchase</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={selectCls}
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={selectCls}
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear filters
          </button>
        )}
      </div>

      {/* ─── Table ─── */}
      <div
        className={`${theme.card} rounded-2xl shadow-lg border ${theme.border} overflow-hidden`}
      >
        {loading ? (
          <div className="flex justify-center py-20">
            <div
              className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${theme.default}`}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-slate-600 block mb-3">
              receipt_long
            </span>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No transactions found
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {hasFilters
                ? "Try adjusting your filters"
                : "Your transaction history will appear here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead
                className={`text-xs text-gray-400 dark:text-gray-500 border-b ${theme.border} ${theme.secondary}`}
              >
                <tr>
                  {[
                    "Transaction ID",
                    "Date",
                    "Product",
                    "Buyer / Seller",
                    "Qty",
                    "Amount",
                    "Type",
                    "Status",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-4 font-semibold ${
                        i >= 4 ? "text-right" : "text-left"
                      } ${i === 6 || i === 7 ? "text-center" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((txn, i) => (
                  <tr
                    key={i}
                    className={`border-b ${theme.border} hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {txn.id}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white max-w-[150px] truncate">
                      {txn.product}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {txn.buyer || txn.seller || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700 dark:text-gray-300">
                      {txn.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                      ₹{Number(txn.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          TYPE_BADGE[txn.type] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          STATUS_BADGE[txn.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {txn.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination ─── */}
        {!loading && totalPages > 1 && (
          <div
            className={`flex items-center justify-between px-4 py-4 border-t ${theme.border}`}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <PageBtn
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                theme={theme}
              >
                ←
              </PageBtn>
              {page > 3 && (
                <>
                  <PageBtn onClick={() => setPage(1)} theme={theme}>
                    1
                  </PageBtn>
                  {page > 4 && (
                    <span className="text-gray-400 px-1 text-sm">…</span>
                  )}
                </>
              )}
              {pageNums.map((n) => (
                <PageBtn
                  key={n}
                  active={n === page}
                  onClick={() => setPage(n)}
                  theme={theme}
                >
                  {n}
                </PageBtn>
              ))}
              {page < totalPages - 2 && (
                <>
                  {page < totalPages - 3 && (
                    <span className="text-gray-400 px-1 text-sm">…</span>
                  )}
                  <PageBtn
                    onClick={() => setPage(totalPages)}
                    theme={theme}
                  >
                    {totalPages}
                  </PageBtn>
                </>
              )}
              <PageBtn
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                theme={theme}
              >
                →
              </PageBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;