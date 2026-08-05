export const brand = {
  name: "QuickCart",
  logoText: "Q",
  tagline: "Food & Grocery, thoughtfully delivered",
  description: "Fresh groceries and local food from trusted nearby stores.",
  supportEmail: "support@example.com",
  supportPhone: "+91 00000 00000",
  defaultLocation: "Lala Bazar, Assam",
  colors: {
    primary: "#145f52",
    primaryDark: "#0b3d36",
    accent: "#ff8a4c",
    surface: "#fffaf2"
  }
} as const;

export type BrandConfig = typeof brand;
