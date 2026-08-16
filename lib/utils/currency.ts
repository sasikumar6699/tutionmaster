/**
 * Formats a number into Indian Rupee currency string
 * Example: 6750 -> "₹6,750", 125000 -> "₹1,25,000"
 */
export function formatINR(amount: number | null | undefined, includeDecimals = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  const rounded = includeDecimals ? amount.toFixed(2) : Math.round(amount).toString();
  const parts = rounded.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }

  let formatted = '';
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = `${withCommas},${lastThree}`;
  } else {
    formatted = integerPart;
  }

  return `${isNegative ? '-' : ''}₹${formatted}${decimalPart}`;
}

export function parseINR(value: string): number {
  const clean = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
