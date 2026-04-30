export const formatAssortment = (sizeQuantities: Record<string, number> | any) => {
  if (!sizeQuantities) return "";
  
  // Handle Mongoose Map or plain object
  const data = sizeQuantities instanceof Map ? Object.fromEntries(sizeQuantities) : sizeQuantities;
  
  return Object.entries(data)
    .filter(([_, qty]) => (qty as number) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([size, qty]) => `${size}:${qty}`)
    .join(", ");
};
