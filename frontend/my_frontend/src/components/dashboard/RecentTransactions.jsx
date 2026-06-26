import { useNavigate } from "react-router-dom";

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

function RecentTransactions({ data, theme }) {
  const navigate = useNavigate();

  return (
    <div
      className={`${theme.card} rounded-2xl p-6 shadow-lg border ${theme.border}`}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-base font-bold ${theme.text}`}>
          Recent Transactions
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Latest 20
        </span>
      </div>

      {!data || data.length === 0 ? (
        <div className="text-center py-14">
          <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-slate-600 block mb-3">
            receipt_long
          </span>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No transactions yet
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Activity will appear here once orders start coming in
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr
                className={`text-xs text-gray-400 dark:text-gray-500 border-b ${theme.border}`}
              >
                <th className="pb-3 px-2 text-left font-medium">ID</th>
                <th className="pb-3 px-2 text-left font-medium">Date</th>
                <th className="pb-3 px-2 text-left font-medium">Product</th>
                <th className="pb-3 px-2 text-left font-medium">
                  Buyer / Seller
                </th>
                <th className="pb-3 px-2 text-right font-medium">Qty</th>
                <th className="pb-3 px-2 text-right font-medium">Amount</th>
                <th className="pb-3 px-2 text-center font-medium">Type</th>
                <th className="pb-3 px-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((txn, i) => (
                <tr
                  key={i}
                  className={`border-b ${theme.border} hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors`}
                >
                  <td className="py-3 px-2 font-mono text-xs text-gray-400 dark:text-gray-500">
                    {txn.id}
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(txn.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-2 text-sm font-medium text-gray-800 dark:text-white max-w-[130px] truncate">
                    {txn.product}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-500 dark:text-gray-400">
                    {txn.buyer || txn.seller || "—"}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-semibold text-gray-700 dark:text-gray-300">
                    {txn.quantity}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-bold text-green-600">
                    ₹{Number(txn.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        TYPE_BADGE[txn.type] ||
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {txn.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
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

      <div className="mt-6 text-center">
        <button
          onClick={() => navigate("/dashboard/transactions")}
          className={`
            inline-flex items-center gap-2 px-6 py-2.5 rounded-xl
            font-semibold text-sm text-white
            ${theme.primary}
            hover:shadow-lg hover:scale-105
            transition-all duration-200
          `}
        >
          Show More
          <span className="material-symbols-outlined text-base">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

export default RecentTransactions;