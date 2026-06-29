export interface Product {
  id: number;
  name: string;
  price: string;
  lkrPrice: string;
  isAvailable: boolean;
  image: string;
  category: string;
  subTitle?: string;
  badge?: string;
  description?: string;
  features?: string[];
  images?: string[];
  sizes?: string[];
  colors?: string[];
  isAdminSelected?: boolean;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Heavyweight Hoodie v1",
    price: "$120.00",
    lkrPrice: "LKR 36,500.00",
    isAvailable: true,
    image: "/images/hoodie.png",
    category: "Hoodies & Sweatshirts",
    subTitle: "ESSENTIALS V1",
    description: "Engineered for maximum comfort and style, the Heavyweight Hoodie v1 features a heavy loopback cotton construction, double-lined hood, and a signature relaxed streetwear fit.",
    features: ["450GSM loopback cotton", "Double-lined hood with custom drawstrings", "Ribbed side panels for flexibility", "Kangaroo front pocket"],
    images: ["/images/hoodie.png", "/images/sweatshirt.png", "/images/tee.png"],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Heather Grey"],
    isAdminSelected: true
  },
  {
    id: 2,
    name: "De-central Oversized Tee",
    price: "$85.00",
    lkrPrice: "LKR 26,000.00",
    isAvailable: false,
    image: "/images/tee.png",
    category: "T-Shirts",
    subTitle: "ESSENTIALS V1",
    description: "A signature piece representing our decentralized design philosophy. Offers an oversized boxy fit with clean minimal lines and a premium midweight handle.",
    features: ["100% long-staple cotton", "200GSM pre-shrunk fabric", "Screen-printed graphics on back", "Slightly dropped shoulders"],
    images: ["/images/tee.png", "/images/boxy_tee.png", "/images/heavyweight_ls.png"],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Charcoal", "Jet Black"],
    isAdminSelected: true
  },
  {
    id: 3,
    name: "Technical Cargo Pants",
    price: "$180.00",
    lkrPrice: "LKR 55,000.00",
    isAvailable: true,
    image: "/images/pants.png",
    category: "Pants & Denim",
    subTitle: "TECHNICAL APPAREL",
    description: "Built for urban exploration, these Technical Cargo Pants feature dynamic utility pockets, articulated knees for ease of movement, and a water-resistant finish.",
    features: ["Nylon-spandex stretch blend", "Water-repellent DWR coating", "Multi-pocket cargo layout", "Adjustable toggle hem system"],
    images: ["/images/pants.png", "/images/utility_cargo.png", "/images/distressed_denim.png"],
    sizes: ["30", "32", "34", "36"],
    colors: ["Olive", "Slate Grey"],
    isAdminSelected: true
  },
  {
    id: 4,
    name: "Graphic Sweatshirt",
    price: "$95.00",
    lkrPrice: "LKR 30,400.00",
    isAvailable: true,
    image: "/images/sweatshirt.png",
    category: "Hoodies & Sweatshirts",
    subTitle: "ESSENTIALS V1",
    description: "Featuring a custom teal graphic print on the front, this sweatshirt is constructed from soft brushed cotton-fleece and offers a modern classic fit.",
    features: ["380GSM organic cotton fleece", "High-density graphic print on front", "Durable ribbed neck, cuffs, and hem", "Relaxed fit template"],
    images: ["/images/sweatshirt.png", "/images/hoodie.png", "/images/tee.png"],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Teal"],
    isAdminSelected: true
  },
  {
    id: 5,
    name: "Boxy Tee - Jet Black",
    price: "$15.00",
    lkrPrice: "LKR 4,500.00",
    isAvailable: true,
    image: "/images/boxy_tee.png",
    category: "T-Shirts",
    subTitle: "ESSENTIALS V1",
    badge: "NEW",
    description: "Crafted from 240GSM heavy-weight premium cotton, the Vergo Boxy Tee offers a structured, relaxed silhouette with dropped shoulders and a thick ribbed collar. Perfect for everyday minimalist aesthetics.",
    features: ["100% Organic Cotton", "Heavyweight 240GSM fabric", "Pre-shrunk to retain fit", "Thick ribbed collar line"],
    images: ["/images/boxy_tee.png", "/images/tee.png", "/images/heavyweight_ls.png"],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Jet Black", "White"]
  },
  {
    id: 6,
    name: "Oversized Hoodie - Paper White",
    price: "$30.00",
    lkrPrice: "LKR 8,900.00",
    isAvailable: true,
    image: "/images/oversized_hoodie.png",
    category: "Hoodies & Sweatshirts",
    subTitle: "ESSENTIALS V1",
    description: "Our core oversized hoodie, crafted from heavy luxury fleece in a clean paper white finish. Features a hood without drawstrings for a modern, architectural aesthetic.",
    features: ["420GSM luxury French Terry", "Double-lined hood with no drawstrings", "Side-seam pockets", "Oversized ribbed waist band"],
    images: ["/images/oversized_hoodie.png", "/images/hoodie.png", "/images/sweatshirt.png"],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Paper White", "Cream"]
  },
  {
    id: 7,
    name: "Utility Cargo - Slate",
    price: "$42.00",
    lkrPrice: "LKR 12,500.00",
    isAvailable: true,
    image: "/images/utility_cargo.png",
    category: "Pants & Denim",
    subTitle: "TECHNICAL APPAREL",
    description: "Form meets utility. A slate grey cargo pant featuring multiple secure pockets, reinforced knee panels, and a modern straight-leg drape.",
    features: ["Heavy cotton-ripstop fabric", "6-pocket utility configuration", "Reinforced seam stitching", "Ankle drawcord adjustments"],
    images: ["/images/utility_cargo.png", "/images/pants.png", "/images/distressed_denim.png"],
    sizes: ["30", "32", "34", "36"],
    colors: ["Slate", "Olive"]
  },
  {
    id: 8,
    name: "Heavyweight LS - Jet Black",
    price: "$19.00",
    lkrPrice: "LKR 5,800.00",
    isAvailable: false,
    image: "/images/heavyweight_ls.png",
    category: "T-Shirts",
    subTitle: "ESSENTIALS V1",
    badge: "SOLD OUT",
    description: "A premium long-sleeve tee made from heavyweight cotton, featuring a structured neck and custom logo detailing on the sleeve cuff.",
    features: ["260GSM long-staple cotton", "Ribbed crewneck and cuffs", "Vergo embroidery on left cuff", "Double-needle hem construction"],
    images: ["/images/heavyweight_ls.png", "/images/boxy_tee.png", "/images/tee.png"],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Jet Black", "Navy"]
  },
  {
    id: 9,
    name: "Distressed Denim - Raw",
    price: "$50.00",
    lkrPrice: "LKR 15,000.00",
    isAvailable: true,
    image: "/images/distressed_denim.png",
    category: "Pants & Denim",
    subTitle: "ESSENTIALS V1",
    description: "Premium Japanese raw denim with subtle distressed detailing on the knees and cuffs. Designed to break in beautifully and form unique fades over time.",
    features: ["14oz Japanese raw selvage denim", "Button fly closure", "Light distressed detailing", "Slim-straight fitment profile"],
    images: ["/images/distressed_denim.png", "/images/pants.png", "/images/utility_cargo.png"],
    sizes: ["30", "32", "34", "36"],
    colors: ["Raw Indigo", "Light Wash"]
  },
  {
    id: 10,
    name: "Minimalist Beanie - White",
    price: "$8.00",
    lkrPrice: "LKR 2,500.00",
    isAvailable: true,
    image: "/images/minimalist_beanie.png",
    category: "Accessories",
    subTitle: "ESSENTIALS V1",
    description: "A soft, fine-knit beanie featuring a double-layered cuff to keep you warm. Branded with a small tonal Vergo patch on the front cuff.",
    features: ["100% recycled acrylic knit", "Double-layered foldover cuff", "Subtle tonal logo embroidery", "One size fits most stretch-fit"],
    images: ["/images/minimalist_beanie.png", "/images/vergo_tote.png", "/images/canvas_trainer.png"],
    sizes: ["OS"],
    colors: ["Off-White", "Black"]
  },
  {
    id: 11,
    name: "Vergo Tote - Black",
    price: "$11.00",
    lkrPrice: "LKR 3,200.00",
    isAvailable: true,
    image: "/images/vergo_tote.png",
    category: "Accessories",
    subTitle: "ESSENTIALS V1",
    description: "A heavy-duty canvas tote bag designed for everyday carrying. Features reinforced shoulder straps and a spacious main compartment with an interior zip pocket.",
    features: ["16oz heavy organic cotton canvas", "Reinforced box-stitched handles", "Interior zip pocket for valuables", "Contrast Vergo logo print on front"],
    images: ["/images/vergo_tote.png", "/images/minimalist_beanie.png", "/images/canvas_trainer.png"],
    sizes: ["OS"],
    colors: ["Black", "Natural Canvas"]
  },
  {
    id: 12,
    name: "Canvas Trainer - Bone",
    price: "$62.00",
    lkrPrice: "LKR 18,500.00",
    isAvailable: true,
    image: "/images/canvas_trainer.png",
    category: "Accessories",
    subTitle: "ESSENTIALS V1",
    description: "A classic high-top trainer constructed from durable organic cotton canvas. Finished with a vulcanized rubber outsole and a comfortable cushioned footbed.",
    features: ["12oz organic canvas upper", "Vulcanized rubber outsole", "High-comfort cushioned insole", "Contrast metal eyelet laces"],
    images: ["/images/canvas_trainer.png", "/images/minimalist_beanie.png", "/images/vergo_tote.png"],
    sizes: ["8", "9", "10", "11"],
    colors: ["Bone", "Black"]
  }
];