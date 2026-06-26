import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getSalesChart, getCategoryDistribution } from "../../api/dashboard";
import { getTheme } from "../../utils/theme";

const PIE_COLORS = [
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

const tooltipStyle = {
  backgroundColor: "#1e293b",
  border: "none",
  borderRadius: "12px",
  color: "#f1f5f9",
  fontSize: "12px",
};

function ChartSkeleton() {
  return (
    <div className="h-64 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse" />
  );
}

function DashboardCharts({ role }) {
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = getTheme();

  useEffect(() => {
    Promise.all([getSalesChart(), getCategoryDistribution()])
      .then(([salesRes, catRes]) => {
        setChartData(salesRes.data);
        setCategoryData(catRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const fmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Area Chart — Sales / Purchases / Profit */}
      <div
        className={`${theme.card} rounded-2xl p-6 shadow-lg border ${theme.border}`}
      >
        <h3 className={`text-base font-bold mb-5 ${theme.text}`}>
          {role === "customer" ? "Monthly Spending" : "Sales vs Purchases"}
        </h3>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-2">
              show_chart
            </span>
            <p className="text-sm">No data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPurchase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#94a3b8"
                opacity={0.2}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [fmt(v), name]}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              {role !== "customer" && (
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#10b981"
                  fill="url(#gSales)"
                  strokeWidth={2}
                  name="Sales"
                  dot={false}
                />
              )}
              <Area
                type="monotone"
                dataKey="purchases"
                stroke="#f59e0b"
                fill="url(#gPurchase)"
                strokeWidth={2}
                name="Purchases"
                dot={false}
              />
              {role !== "customer" && (
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3b82f6"
                  fill="url(#gProfit)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Profit"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie Chart — Category Distribution */}
      <div
        className={`${theme.card} rounded-2xl p-6 shadow-lg border ${theme.border}`}
      >
        <h3 className={`text-base font-bold mb-5 ${theme.text}`}>
          Category Revenue
        </h3>

        {categoryData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-2">
              donut_large
            </span>
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={35}
                paddingAngle={3}
                label={({ category, percent }) =>
                  `${category} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ strokeWidth: 1 }}
              >
                {categoryData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [fmt(v), "Revenue"]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default DashboardCharts;