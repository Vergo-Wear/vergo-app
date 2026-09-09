"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard/ProductCard";
import { useProductsState } from "@/hooks/useProducts";
import { sortSizes } from "@/lib/products";

function CollectionLoader() {
  return (
    <div className="product-detail-loading" role="status" aria-live="polite">
      <div className="product-loading-mark" aria-hidden="true">
        <span className="product-loading-ring" />
        <span className="product-loading-v">V</span>
      </div>
      <p className="product-loading-title">CURATING THE COLLECTION</p>
      <p className="product-loading-copy">Loading the latest products...</p>
    </div>
  );
}

function CollectionContent() {
  const { products, isLoading } = useProductsState();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get("search") || "";

  // Search local state
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local search input with URL search params changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);

  // Sorting State
  const [sortBy, setSortBy] = useState<string>("name-asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Dropdown Open States
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // References for clicking outside dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle dynamic filter dropdowns
  const toggleDropdown = (dropdownName: string) => {
    setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  // Close dropdowns if clicked outside (checking closest elements to fix sort selection click race condition)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".filter-group-btn") &&
        !target.closest(".filter-dropdown-menu") &&
        !target.closest(".sort-by-btn") &&
        !target.closest(".dropdown-menu-custom")
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle Search Input submit
  const handleLocalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      router.push(`/collection?search=${encodeURIComponent(localSearch.trim())}`);
    } else {
      router.push(`/collection`);
    }
    setCurrentPage(1);
  };

  // Reset all filters (and search query)
  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedPriceRanges([]);
    setSelectedAvailability([]);
    setSortBy("name-asc");
    setLocalSearch("");
    setCurrentPage(1);
    if (searchQuery) {
      router.push("/collection");
    }
  };

  // Compile unique lists from mock data
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    return Array.from(list);
  }, [products]);

  const sizesList = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      p.sizes?.forEach((s) => list.add(s));
    });
    return sortSizes(Array.from(list));
  }, [products]);

  const colorsList = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      p.colors?.forEach((c) => list.add(c));
    });
    return Array.from(list).sort();
  }, [products]);

  // Price range thresholds
  const priceRanges = [
    { label: "Under LKR 5,000", id: "under-5000" },
    { label: "LKR 5,000 - LKR 15,000", id: "5000-15000" },
    { label: "LKR 15,000 & Over", id: "over-15000" },
  ];

  // Helper to extract numeric price value from LKR price string
  const parseLkrPrice = (priceStr: string) => {
    const numbersOnly = priceStr.replace(/[^0-9]/g, "");
    return parseInt(numbersOnly, 10);
  };

  // Check if a product fits within active price filters
  const checkPriceFit = (priceLkr: number, ranges: string[]) => {
    if (ranges.length === 0) return true;
    return ranges.some((range) => {
      if (range === "under-5000") return priceLkr < 5000;
      if (range === "5000-15000") return priceLkr >= 5000 && priceLkr <= 15000;
      if (range === "over-15000") return priceLkr > 15000;
      return false;
    });
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Search Query
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Filter by Categories
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    // Filter by Sizes
    if (selectedSizes.length > 0) {
      result = result.filter((p) => p.sizes?.some((s) => selectedSizes.includes(s)));
    }

    // Filter by Colors
    if (selectedColors.length > 0) {
      result = result.filter((p) => p.colors?.some((c) => selectedColors.includes(c)));
    }

    // Filter by Price Range
    if (selectedPriceRanges.length > 0) {
      result = result.filter((p) => {
        const val = parseLkrPrice(p.lkrPrice);
        return checkPriceFit(val, selectedPriceRanges);
      });
    }

    // Filter by Availability
    if (selectedAvailability.length > 0) {
      result = result.filter((p) => {
        const status = p.isAvailable ? "in-stock" : "out-of-stock";
        return selectedAvailability.includes(status);
      });
    }

    // Sort Logic
    result.sort((a, b) => {
      const priceA = parseLkrPrice(a.lkrPrice);
      const priceB = parseLkrPrice(b.lkrPrice);

      switch (sortBy) {
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "availability":
          return (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
        default:
          return 0;
      }
    });

    return result;
  }, [products, localSearch, selectedCategories, selectedSizes, selectedColors, selectedPriceRanges, selectedAvailability, sortBy]);

  // Adjust pagination when product length changes
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredProducts, totalPages, currentPage]);

  // Get current chunk of products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Filter lists toggles
  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
    setCurrentPage(1);
  };

  const handleToggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
    setCurrentPage(1);
  };

  const handleToggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
    setCurrentPage(1);
  };

  const handleTogglePrice = (rangeId: string) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(rangeId) ? prev.filter((r) => r !== rangeId) : [...prev, rangeId]
    );
    setCurrentPage(1);
  };

  const handleToggleAvailability = (status: string) => {
    setSelectedAvailability((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    selectedPriceRanges.length > 0 ||
    selectedAvailability.length > 0 ||
    !!searchQuery;

  if (isLoading) return <CollectionLoader />;

  return (
    <main className="collection-page-container">
      {/* Breadcrumbs */}
      <nav className="collection-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/" className="collection-breadcrumb-link">HOME</Link>
        <span className="collection-breadcrumb-separator">›</span>
        <span className="collection-breadcrumb-current">COLLECTION</span>
      </nav>

      {/* Collection Heading & Description */}
      <header className="collection-page-header">
        <div className="collection-header-left">
          <h1 className="collection-title-main">
            ESSENTIALS <span className="collection-title-highlight">DROP 01</span>
          </h1>
          {searchQuery ? (
            <p className="collection-subtitle-main" style={{ color: "#00FF9D", fontWeight: 600 }}>
              Search results for: "{searchQuery}"
            </p>
          ) : (
            <p className="collection-subtitle-main">
              A definitive study in form and silhouette. Modern minimalist streetwear engineered for the contemporary landscape.
            </p>
          )}
        </div>

        <div className="collection-header-right">
          {/* Local Search Bar */}
          <form onSubmit={handleLocalSearchSubmit} className="collection-search-form">
            <input
              type="text"
              placeholder="Search items..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="collection-search-input"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="collection-search-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            {localSearch && (
              <button
                type="button"
                className="collection-search-clear"
                onClick={() => {
                  setLocalSearch("");
                  router.push("/collection");
                  setCurrentPage(1);
                }}
              >
                &times;
              </button>
            )}
          </form>

          {/* Sort Control */}
          <div className="sort-by-wrapper" style={{ position: "relative" }}>
            <button
              type="button"
              className="sort-by-btn"
              onClick={() => toggleDropdown("sort")}
            >
              <span>
                SORT BY: {
                  sortBy === "price-asc" ? "PRICE: LOW TO HIGH" :
                  sortBy === "price-desc" ? "PRICE: HIGH TO LOW" :
                  sortBy === "name-desc" ? "NAME: Z - A" :
                  sortBy === "availability" ? "AVAILABILITY" : "NAME: A - Z"
                }
              </span>
              <svg className={`filter-arrow ${openDropdown === "sort" ? "open" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openDropdown === "sort" && (
              <div className="dropdown-menu-custom">
                <button
                  onClick={() => { setSortBy("name-asc"); setOpenDropdown(null); }}
                  className={`dropdown-item-custom ${sortBy === "name-asc" ? "active" : ""}`}
                >
                  NAME: A - Z
                </button>
                <button
                  onClick={() => { setSortBy("name-desc"); setOpenDropdown(null); }}
                  className={`dropdown-item-custom ${sortBy === "name-desc" ? "active" : ""}`}
                >
                  NAME: Z - A
                </button>
                <button
                  onClick={() => { setSortBy("price-asc"); setOpenDropdown(null); }}
                  className={`dropdown-item-custom ${sortBy === "price-asc" ? "active" : ""}`}
                >
                  PRICE: LOW TO HIGH
                </button>
                <button
                  onClick={() => { setSortBy("price-desc"); setOpenDropdown(null); }}
                  className={`dropdown-item-custom ${sortBy === "price-desc" ? "active" : ""}`}
                >
                  PRICE: HIGH TO LOW
                </button>
                <button
                  onClick={() => { setSortBy("availability"); setOpenDropdown(null); }}
                  className={`dropdown-item-custom ${sortBy === "availability" ? "active" : ""}`}
                >
                  AVAILABILITY
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <hr className="collection-separator" />

      {/* Filters Controls Area */}
      <section className="collection-filter-bar" ref={dropdownRef}>
        <div className="filter-section-left">
          <span className="filter-label">FILTERS:</span>

          {/* Category Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`filter-group-btn ${selectedCategories.length > 0 ? "active" : ""}`}
              onClick={() => toggleDropdown("category")}
            >
              <span>CATEGORY</span>
              {selectedCategories.length > 0 && (
                <span className="filter-badge-count">{selectedCategories.length}</span>
              )}
              <svg className={`filter-arrow ${openDropdown === "category" ? "open" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "category" && (
              <div className="filter-dropdown-menu">
                {categoriesList.map((cat) => (
                  <div
                    key={cat}
                    className="filter-option-checkbox-row"
                    onClick={() => handleToggleCategory(cat)}
                  >
                    <div className={`checkbox-custom ${selectedCategories.includes(cat) ? "checked" : ""}`}>
                      {selectedCategories.includes(cat) && (
                        <svg className="checkbox-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="filter-option-label">{cat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Size Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`filter-group-btn ${selectedSizes.length > 0 ? "active" : ""}`}
              onClick={() => toggleDropdown("size")}
            >
              <span>SIZE</span>
              {selectedSizes.length > 0 && (
                <span className="filter-badge-count">{selectedSizes.length}</span>
              )}
              <svg className={`filter-arrow ${openDropdown === "size" ? "open" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "size" && (
              <div className="filter-dropdown-menu" style={{ maxHeight: "250px", overflowY: "auto" }}>
                {sizesList.map((size) => (
                  <div
                    key={size}
                    className="filter-option-checkbox-row"
                    onClick={() => handleToggleSize(size)}
                  >
                    <div className={`checkbox-custom ${selectedSizes.includes(size) ? "checked" : ""}`}>
                      {selectedSizes.includes(size) && (
                        <svg className="checkbox-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="filter-option-label">{size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Color Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`filter-group-btn ${selectedColors.length > 0 ? "active" : ""}`}
              onClick={() => toggleDropdown("color")}
            >
              <span>COLOR</span>
              {selectedColors.length > 0 && (
                <span className="filter-badge-count">{selectedColors.length}</span>
              )}
              <svg className={`filter-arrow ${openDropdown === "color" ? "open" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "color" && (
              <div className="filter-dropdown-menu" style={{ maxHeight: "250px", overflowY: "auto" }}>
                {colorsList.map((color) => (
                  <div
                    key={color}
                    className="filter-option-checkbox-row"
                    onClick={() => handleToggleColor(color)}
                  >
                    <div className={`checkbox-custom ${selectedColors.includes(color) ? "checked" : ""}`}>
                      {selectedColors.includes(color) && (
                        <svg className="checkbox-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="filter-option-label">{color}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Range Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`filter-group-btn ${selectedPriceRanges.length > 0 ? "active" : ""}`}
              onClick={() => toggleDropdown("price")}
            >
              <span>PRICE RANGE</span>
              {selectedPriceRanges.length > 0 && (
                <span className="filter-badge-count">{selectedPriceRanges.length}</span>
              )}
              <svg className={`filter-arrow ${openDropdown === "price" ? "open" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "price" && (
              <div className="filter-dropdown-menu" style={{ minWidth: "220px" }}>
                {priceRanges.map((range) => (
                  <div
                    key={range.id}
                    className="filter-option-checkbox-row"
                    onClick={() => handleTogglePrice(range.id)}
                  >
                    <div className={`checkbox-custom ${selectedPriceRanges.includes(range.id) ? "checked" : ""}`}>
                      {selectedPriceRanges.includes(range.id) && (
                        <svg className="checkbox-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="filter-option-label">{range.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`filter-group-btn ${selectedAvailability.length > 0 ? "active" : ""}`}
              onClick={() => toggleDropdown("availability")}
            >
              <span>AVAILABILITY</span>
              {selectedAvailability.length > 0 && (
                <span className="filter-badge-count">{selectedAvailability.length}</span>
              )}
              <svg className={`filter-arrow ${openDropdown === "availability" ? "open" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "availability" && (
              <div className="filter-dropdown-menu">
                <div
                  className="filter-option-checkbox-row"
                  onClick={() => handleToggleAvailability("in-stock")}
                >
                  <div className={`checkbox-custom ${selectedAvailability.includes("in-stock") ? "checked" : ""}`}>
                    {selectedAvailability.includes("in-stock") && (
                      <svg className="checkbox-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="filter-option-label">In Stock</span>
                </div>

                <div
                  className="filter-option-checkbox-row"
                  onClick={() => handleToggleAvailability("out-of-stock")}
                >
                  <div className={`checkbox-custom ${selectedAvailability.includes("out-of-stock") ? "checked" : ""}`}>
                    {selectedAvailability.includes("out-of-stock") && (
                      <svg className="checkbox-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="filter-option-label">Out of Stock</span>
                </div>
              </div>
            )}
          </div>

          {/* Clear All Link */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="clear-filters-btn"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="filter-section-right">
          <span className="product-count-info">
            SHOWING {filteredProducts.length} PRODUCTS
          </span>
        </div>
      </section>

      {/* Product Grid Area */}
      {filteredProducts.length > 0 ? (
        <section className="collection-products-grid">
          {paginatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <section className="no-results-container">
          <h2 className="no-results-title">No products found</h2>
          <p className="no-results-desc">
            We couldn't find any products matching your current filters. Try relaxing your filters or resetting them below.
          </p>
          <button
            type="button"
            className="reset-filters-btn"
            onClick={resetFilters}
          >
            Reset All Filters
          </button>
        </section>
      )}

      {/* Pagination Section */}
      {totalPages > 1 && (
        <nav className="pagination-controls" aria-label="Pagination">
          <button
            key="prev"
            type="button"
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <svg className="pagination-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
              onClick={() => setCurrentPage(pageNum)}
              aria-label={`Page ${pageNum}`}
            >
              {pageNum}
            </button>
          ))}

          <button
            key="next"
            type="button"
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <svg className="pagination-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}
    </main>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<CollectionLoader />}>
      <CollectionContent />
    </Suspense>
  );
}
