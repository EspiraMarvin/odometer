// has 2 or 3 digits, and ends with a 0 if 2 digits and 00 if 3 digits
const checkNumberIsCorrect = (number: number) => {
  // Convert the number to a string
  const numStr = number.toString();

  // Check if the number has 2 or 3 digits
  const hasTwoOrThreeDigits = numStr.length === 2 || numStr.length === 3;

  // Check if the last digit is zero
  const endsWithZero = numStr[numStr.length - 1] === "0";

  // Return true if both conditions are met
  return hasTwoOrThreeDigits && endsWithZero;
};

export {
  checkNumberIsCorrect,
};
