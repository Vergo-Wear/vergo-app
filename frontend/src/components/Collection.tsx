import ProductCard from "./ProductCard";
import { products } from "@/data/product";

export default function Collection() {
  return (
    <section className="collection">
      <div className="collection-header">
        <div className="collection-title-area">
          <h2>The Collection</h2>
          <p className="section-description">
            Explore our latest limited edition pieces.
          </p>
        </div>
        <div className="inventory-status">
          <span className="status-dot"></span>
          <span>INVENTORY STATUS: LIVE</span>
        </div>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}
