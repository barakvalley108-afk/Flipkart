import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password || password.length < 10) {
  console.error("Usage: npm run password:hash -- \"YourStrongPassword\"");
  console.error("Password must contain at least 10 characters.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
