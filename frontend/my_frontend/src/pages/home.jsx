import { useEffect, useState } from "react";
import { getAllProducts } from "../api/product";
import ProductCard from "../components/productcard";
import { getTheme } from "../utils/theme";

function Home({ searchTerm = "" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = getTheme();

  const categories = [
    "Vegetables",
    "Fruits",
    "Seeds",
    "Tools",
    "Pesticide",
    "Greens",
  ];

  const filteredProducts = products.filter((product) =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    let isMounted = true;

    getAllProducts()
      .then((res) => {
        if (isMounted) {
          setProducts(res.data);
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`${theme.page} min-h-screen p-6`}>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className={`w-12 h-12 border-4 ${theme.default} border-t-transparent rounded-full animate-spin`}></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-slate-600">
            No Products Available
          </h2>
        </div>
      ) : (
        <>
          {categories.map((category) => {
            const categoryProducts = filteredProducts.filter(
              (product) => product.category === category
            );

            return (
              <div key={category} className="mb-10">
                <h2 className={`text-3xl font-bold mb-4 ${theme.text} border-b pb-2 ${theme.border}`}>
                  {category}
                </h2>

                {categoryProducts.length === 0 ? (
                  <div className="bg-gray-100 dark:bg-slate-900 rounded-xl p-4 text-center text-gray-500 dark:text-slate-300">
                    No Products Available
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default Home;
