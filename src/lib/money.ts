export function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2
  }).format(paise / 100);
}

export function rupeesToPaise(value: number) {
  return Math.round(value * 100);
}
