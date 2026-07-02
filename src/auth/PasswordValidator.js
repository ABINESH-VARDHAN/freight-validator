const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/~`]/;

export function validatePassword(password) {
  const pw = password || "";

  const checks = [
    { key: "length",  label: "Minimum 6 characters",                 passed: pw.length >= 6 },
    { key: "number",  label: "Contains at least one number",         passed: /\d/.test(pw) },
    { key: "special", label: "Contains at least one special character", passed: SPECIAL_CHAR_REGEX.test(pw) },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const valid = passedCount === checks.length;

  let strength = "empty";
  if (pw.length > 0) {
    if (passedCount <= 1) strength = "weak";
    else if (passedCount === 2) strength = "medium";
    else strength = "strong";
  }

  return { checks, valid, passedCount, strength };
}