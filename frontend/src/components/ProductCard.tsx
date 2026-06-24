import Image from "next/image";

export default function ProductCard({ product }: any) {
  return (
    <div className={`product-card ${!product.isAvailable ? "sold-out" : ""}`}>
      <div className="product-image-wrapper">
        {product.isAvailable && (
          <span className="product-badge">AVAILABLE NOW</span>
        )}
        
        <Image
          src={product.image}
          alt={product.name}
          width={400}
          height={500}
          className="product-image"
        />

        {!product.isAvailable ? (
          <div className="sold-out-overlay">
            <div className="sold-out-box">SOLD OUT</div>
          </div>
        ) : (
          <div className="product-overlay">
            <button className="quick-add-btn">
              <span>Quick Add</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="product-info-container">
        <div className="product-info-row">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-price">{product.price}</p>
        </div>
        <div className="product-subrow">
          <span className="product-lkr-price">{product.lkrPrice}</span>
        </div>
      </div>
    </div>
  );
}