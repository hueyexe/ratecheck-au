import { useState, useEffect, useCallback } from "react";
import type { FilterState } from "../types";
import { DEFAULT_FILTERS } from "../types";

function filtersToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.rateType) p.set("type", f.rateType);
  if (f.loanPurpose) p.set("purpose", f.loanPurpose);
  if (f.repaymentType) p.set("repayment", f.repaymentType);
  if (f.maxLvr > 0) p.set("lvr", String(f.maxLvr));
  if (!f.everydayOnly) p.set("scope", "all");
  if (f.search) p.set("q", f.search);
  if (f.sortKey !== "rate") p.set("sort", f.sortKey);
  if (!f.sortAsc) p.set("dir", "desc");
  return p;
}

function paramsToFilters(p: URLSearchParams): FilterState {
  return {
    rateType: p.get("type") || "",
    loanPurpose: p.get("purpose") || "",
    repaymentType: p.get("repayment") || "",
    maxLvr: Number(p.get("lvr")) || 0,
    everydayOnly: p.get("scope") !== "all",
    search: p.get("q") || "",
    sortKey: (p.get("sort") as FilterState["sortKey"]) || "rate",
    sortAsc: p.get("dir") !== "desc",
  };
}

export function useUrlFilters(): [FilterState, (f: FilterState) => void] {
  const [filters, setFiltersState] = useState<FilterState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.toString() ? paramsToFilters(params) : DEFAULT_FILTERS;
  });

  const setFilters = useCallback((f: FilterState) => {
    setFiltersState(f);
    const params = filtersToParams(f);
    const search = params.toString();
    const url = search ? `?${search}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      setFiltersState(params.toString() ? paramsToFilters(params) : DEFAULT_FILTERS);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return [filters, setFilters];
}
