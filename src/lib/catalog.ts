export type StoreMode = "food" | "grocery";

export type CatalogProduct = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp?: number;
  mode: StoreMode;
  image: string;
  badge?: string;
  store: string;
  rating: number;
  eta: string;
};

export const categories = {
  food: [
    { name: "Biryani", image: "/categories/biryani.svg" },
    { name: "Momos", image: "/categories/momos.svg" },
    { name: "Pizza", image: "/categories/pizza.svg" },
    { name: "Meals", image: "/categories/meals.svg" },
    { name: "Drinks", image: "/categories/drinks.svg" },
    { name: "Desserts", image: "/categories/dessert.svg" }
  ],
  grocery: [
    { name: "Vegetables", image: "/categories/vegetables.svg" },
    { name: "Fruits", image: "/categories/fruits.svg" },
    { name: "Dairy", image: "/categories/dairy.svg" },
    { name: "Snacks", image: "/categories/snacks.svg" },
    { name: "Beverages", image: "/categories/beverages.svg" },
    { name: "Household", image: "/categories/household.svg" }
  ]
};

export const products: CatalogProduct[] = [
  {
    id: "food-1",
    name: "Chicken Biryani",
    unit: "Full plate",
    price: 169,
    mrp: 199,
    mode: "food",
    image: "/products/chicken-biryani.svg",
    badge: "20% OFF",
    store: "Royal Kitchen",
    rating: 4.5,
    eta: "25–35 min"
  },
  {
    id: "food-2",
    name: "Chicken Fried Rice",
    unit: "Full plate",
    price: 129,
    mrp: 149,
    mode: "food",
    image: "/products/fried-rice.svg",
    badge: "Bestseller",
    store: "Street Food Special",
    rating: 4.4,
    eta: "20–30 min"
  },
  {
    id: "food-3",
    name: "Veg Momos",
    unit: "8 pieces",
    price: 79,
    mode: "food",
    image: "/products/momos.svg",
    store: "Home City Momos",
    rating: 4.6,
    eta: "20–25 min"
  },
  {
    id: "food-4",
    name: "Margherita Pizza",
    unit: "Regular",
    price: 159,
    mrp: 189,
    mode: "food",
    image: "/products/pizza.svg",
    badge: "Save ₹30",
    store: "Pizza Point",
    rating: 4.3,
    eta: "30–40 min"
  },
  {
    id: "grocery-1",
    name: "Fresh Tomatoes",
    unit: "500 g",
    price: 34,
    mrp: 42,
    mode: "grocery",
    image: "/products/tomatoes.svg",
    badge: "Fresh",
    store: "Quick Fresh",
    rating: 4.7,
    eta: "12 min"
  },
  {
    id: "grocery-2",
    name: "Farm Milk",
    unit: "1 litre",
    price: 64,
    mode: "grocery",
    image: "/products/milk.svg",
    store: "Daily Needs",
    rating: 4.8,
    eta: "12 min"
  },
  {
    id: "grocery-3",
    name: "Potato Chips",
    unit: "90 g",
    price: 40,
    mode: "grocery",
    image: "/products/chips.svg",
    badge: "Popular",
    store: "Quick Mart",
    rating: 4.5,
    eta: "12 min"
  },
  {
    id: "grocery-4",
    name: "Red Apples",
    unit: "4 pieces",
    price: 129,
    mrp: 149,
    mode: "grocery",
    image: "/products/apples.svg",
    badge: "13% OFF",
    store: "Quick Fresh",
    rating: 4.6,
    eta: "12 min"
  }
];
