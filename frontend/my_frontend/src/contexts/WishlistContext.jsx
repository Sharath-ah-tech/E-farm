import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../api/axios";

const WishlistContext = createContext({
  wishlistedIds: new Set(),
  wishlistMap:   {},          // productId -> wishlistEntryId (needed for DELETE)
  isWishlisted:  () => false,
  toggleWishlist: async () => {},
  loading: true,
});

export function WishlistProvider({ children }) {
  const [wishlistedIds, setWishlistedIds] = useState(new Set());
  const [wishlistMap,   setWishlistMap]   = useState({});
  const [loading,       setLoading]       = useState(true);

  // ── Hydrate on mount / login ────────────────────────────────────────────────
  const hydrate = useCallback(async () => {
    const token = localStorage.getItem("access");
    if (!token) {
      setWishlistedIds(new Set());
      setWishlistMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Full wishlist entries — needed to know the entry ID for deletion
      const res = await api.get("wishlist/");
      const data = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
      const map  = {};
      const ids  = new Set();
      data.forEach((w) => {
        map[w.product] = w.id;
        ids.add(w.product);
      });
      setWishlistMap(map);
      setWishlistedIds(ids);
    } catch {
      setWishlistedIds(new Set());
      setWishlistMap({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    const onStorage = (e) => { if (e.key === "access") hydrate(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrate]);

  const isWishlisted = useCallback(
    (productId) => wishlistedIds.has(productId),
    [wishlistedIds]
  );

  // ── Optimistic toggle ────────────────────────────────────────────────────────
  const toggleWishlist = useCallback(async (productId) => {
    const currentlyWishlisted = wishlistedIds.has(productId);

    // 1. Optimistic update — instant UI feedback
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      currentlyWishlisted ? next.delete(productId) : next.add(productId);
      return next;
    });

    try {
      if (currentlyWishlisted) {
        const entryId = wishlistMap[productId];
        if (entryId) {
          await api.delete(`wishlist/${entryId}/`);
          setWishlistMap((p) => {
            const next = { ...p };
            delete next[productId];
            return next;
          });
        }
      } else {
        const res = await api.post("wishlist/", { product: productId });
        setWishlistMap((p) => ({ ...p, [productId]: res.data.id }));
      }
      return true;
    } catch (err) {
      // 2. Revert on failure
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        currentlyWishlisted ? next.add(productId) : next.delete(productId);
        return next;
      });
      // Handle "already exists" race condition gracefully
      if (err.response?.status === 400 && !currentlyWishlisted) {
        // Re-sync from server — it's actually already there
        hydrate();
        return true;
      }
      return false;
    }
  }, [wishlistedIds, wishlistMap, hydrate]);

  return (
    <WishlistContext.Provider
      value={{ wishlistedIds, wishlistMap, isWishlisted, toggleWishlist, loading, refresh: hydrate }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);