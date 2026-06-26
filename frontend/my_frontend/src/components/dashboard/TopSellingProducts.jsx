function TopSellingProducts({ data, role, theme }) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`${theme.card} rounded-2xl p-10 shadow-lg border ${theme.border} text-center`}
      >
        <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-slate-600 mb-3 block">
          bar_chart
        </span>
        <h3 className="font-semibold text-gray-500 dark:text-gray-400">
          No sales data yet
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Complete orders will appear here
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${theme.card} rounded-2xl p-6 shadow-lg border ${theme.border}`}
    >
      <h3 className={`text-base font-bold mb-5 ${theme.text}`}>
        {role === "customer"
          ? "Most Purchased Products"
          : "Top Selling Products"}
      </h3>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr
              className={`text-xs text-gray-400 dark:text-gray-500 border-b ${theme.border}`}
            >
              <th className="pb-3 px-2 text-left font-medium">#</th>
              <th className="pb-3 px-2 text-left font-medium">Product</th>
              <th className="pb-3 px-2 text-left font-medium">Category</th>
              <th className="pb-3 px-2 text-right font-medium">Qty Sold</th>
              <th className="pb-3 px-2 text-right font-medium">Revenue</th>
              <th className="pb-3 px-2 text-right font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr
                key={i}
                className={`border-b ${theme.border} hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors`}
              >
                <td className="py-3 px-2 text-sm font-bold text-gray-300 dark:text-slate-600 w-8">
                  {i + 1}
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image || "/vite.svg"}
                      alt={item.product_name}
                      className="w-10 h-10 rounded-xl object-cover bg-gray-100 dark:bg-slate-800 flex-shrink-0"
                      onError={(e) => {
                        e.target.src = "/vite.svg";
                      }}
                    />
                    <span className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[140px]">
                      {item.product_name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${theme.secondary} ${theme.text}`}
                  >
                    {item.category}
                  </span>
                </td>
                <td className="py-3 px-2 text-right text-sm font-bold text-gray-700 dark:text-gray-300">
                  {item.total_sold}
                </td>
                <td className="py-3 px-2 text-right text-sm font-bold text-green-600">
                  ₹{Number(item.revenue || 0).toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-2 text-right">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      item.stock === 0
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : item.stock < 10
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {item.stock === 0 ? "Out" : item.stock}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopSellingProducts;